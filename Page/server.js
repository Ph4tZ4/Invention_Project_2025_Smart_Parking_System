const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const fs = require('fs');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Store parking data
let parkingData = {
    boardA: [false, false, false, false],
    boardB: [false, false, false, false],
    lastUpdated: new Date().toISOString()
};

// Store bookings (persisted)
let bookings = [];
const DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

function ensureDataDir() {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
}

function loadBookings() {
    try {
        ensureDataDir();
        if (fs.existsSync(BOOKINGS_FILE)) {
            const raw = fs.readFileSync(BOOKINGS_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) bookings = parsed;
        }
    } catch (e) {
        console.error('Failed to load bookings.json', e);
    }
}

function saveBookings() {
    try {
        ensureDataDir();
        fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to save bookings.json', e);
    }
}
// Payment timeout references
const paymentTimers = new Map();
// Payment window: default to 30s for testing; set env PAYMENT_WINDOW_MS=300000 for 5 minutes
const PAYMENT_WINDOW_MS = parseInt(process.env.PAYMENT_WINDOW_MS || '30000', 10);

// WebSocket connections
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    clients.add(ws);
    
    // Send current parking data to new client
    ws.send(JSON.stringify({
        type: 'parking_data',
        data: parkingData
    }));
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
        clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Broadcast data to all connected clients
function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// API Routes

// Get parking data
app.get('/api/parking', (req, res) => {
    res.json({
        success: true,
        data: parkingData
    });
});

// Update parking data (from Arduino)
app.post('/api/parking', (req, res) => {
    try {
        const { boardA, boardB } = req.body;
        
        console.log('Received parking data:', { boardA, boardB });
        console.log('Request from IP:', req.ip || req.connection.remoteAddress);
        
        if (boardA && Array.isArray(boardA) && boardA.length === 4) {
            parkingData.boardA = boardA;
            console.log('Updated BoardA:', boardA);
        }
        
        if (boardB && Array.isArray(boardB) && boardB.length === 4) {
            parkingData.boardB = boardB;
            console.log('Updated BoardB:', boardB);
        }
        
        parkingData.lastUpdated = new Date().toISOString();
        
        // Broadcast update to all connected clients
        broadcast({
            type: 'parking_update',
            data: parkingData
        });
        
        res.json({
            success: true,
            message: 'Parking data updated successfully',
            data: parkingData
        });
    } catch (error) {
        console.error('Error updating parking data:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating parking data'
        });
    }
});

// Get bookings
app.get('/api/bookings', (req, res) => {
    res.json({
        success: true,
        data: bookings
    });
});

// Create booking
app.post('/api/bookings', (req, res) => {
    try {
        const { building, slot, customerName, customerPhone, bookingTime } = req.body;
        
        if (!building || !slot || !customerName || !customerPhone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        // Check if slot is available
        const slotIndex = parseInt(slot.substring(1)) - 1;
        const isOccupied = building === 'A' ? parkingData.boardA[slotIndex] : parkingData.boardB[slotIndex];
        
        if (isOccupied) {
            return res.status(400).json({
                success: false,
                message: 'Parking slot is already occupied'
            });
        }
        
        // Validate booking time: must be now or future and within 09:00-21:00
        let chosenTime = new Date();
        if (bookingTime) {
            const parsed = new Date(bookingTime);
            if (isNaN(parsed.getTime())) {
                return res.status(400).json({ success: false, message: 'Invalid booking time' });
            }
            const now = new Date();
            if (parsed.getTime() < now.getTime() - 1000) {
                return res.status(400).json({ success: false, message: 'Booking time cannot be in the past' });
            }
            const hour = parsed.getHours();
            const minute = parsed.getMinutes();
            const within = (hour > 9 && hour < 21) || (hour === 9) || (hour === 21 && minute === 0);
            if (!within) {
                return res.status(400).json({ success: false, message: 'Booking time must be between 09:00 and 21:00' });
            }
            chosenTime = parsed;
        }

        // Create booking
        const booking = {
            id: Date.now(),
            building,
            slot,
            customerName,
            customerPhone,
            bookingTime: chosenTime.toISOString(),
            status: 'pending_payment',
            paid: false,
            paymentDueAt: new Date(Date.now() + PAYMENT_WINDOW_MS).toISOString()
        };
        
        bookings.unshift(booking);
        saveBookings();
        // Schedule auto-cancel if unpaid (only cancel, don't change slot reservation)
        const timer = setTimeout(() => {
            try {
                const b = bookings.find(x => x.id === booking.id);
                if (b && b.status === 'pending_payment' && !b.paid) {
                    b.status = 'cancelled';
                    broadcast({ type: 'booking_cancelled', data: b });
                }
            } finally {
                paymentTimers.delete(booking.id);
            }
        }, PAYMENT_WINDOW_MS);
        paymentTimers.set(booking.id, timer);
        
        // Broadcast updates (booking only; do not change sensor occupancy here)
        broadcast({
            type: 'booking_created',
            data: booking
        });
        
        saveBookings();
        res.json({
            success: true,
            message: 'Booking created successfully',
            data: booking
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating booking'
        });
    }
});

// Confirm payment
app.post('/api/bookings/:id/pay', (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.status !== 'pending_payment') {
            return res.status(400).json({ success: false, message: 'Booking is not active' });
        }
        booking.paid = true;
        booking.status = 'active';
        // Clear auto-cancel timer
        const t = paymentTimers.get(booking.id);
        if (t) { clearTimeout(t); paymentTimers.delete(booking.id); }
        broadcast({ type: 'booking_paid', data: booking });
        saveBookings();
        res.json({ success: true, message: 'Payment confirmed', data: booking });
    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ success: false, message: 'Error confirming payment' });
    }
});

// Initialize persisted data
loadBookings();

// Cancel booking
app.delete('/api/bookings/:id', (req, res) => {
    try {
        const bookingId = parseInt(req.params.id);
        const booking = bookings.find(b => b.id === bookingId);
        
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }
        
        // Update booking status
        booking.status = 'cancelled';
        
        // Broadcast updates (booking only; do not change sensor occupancy here)
        broadcast({
            type: 'booking_cancelled',
            data: booking
        });
        
        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            data: booking
        });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling booking'
        });
    }
});

// Get notifications
app.get('/api/notifications', (req, res) => {
    // In a real application, this would fetch from a database
    const notifications = [
        {
            id: 1,
            type: 'system',
            title: 'ระบบออนไลน์',
            message: 'ระบบจองที่จอดรถพร้อมใช้งาน',
            timestamp: new Date().toISOString(),
            read: false
        }
    ];
    
    res.json({
        success: true,
        data: notifications
    });
});

// Get analytics data
app.get('/api/analytics', (req, res) => {
    const timeRange = req.query.range || 'today';
    
    // Generate sample analytics data based on time range
    const analyticsData = generateAnalyticsData(timeRange);
    
    res.json({
        success: true,
        data: analyticsData
    });
});

// Generate analytics data
function generateAnalyticsData(timeRange) {
    const now = new Date();
    let data = {
        utilization: [],
        popularSlots: {},
        dailyBookings: [],
        peakHours: [],
        metrics: {}
    };
    
    switch (timeRange) {
        case 'today':
            data = generateTodayAnalytics();
            break;
        case 'week':
            data = generateWeekAnalytics();
            break;
        case 'month':
            data = generateMonthAnalytics();
            break;
        case 'year':
            data = generateYearAnalytics();
            break;
    }
    
    return data;
}

function generateTodayAnalytics() {
    const hours = [];
    const utilization = [];
    const bookings = [];
    
    for (let i = 0; i < 24; i++) {
        hours.push(i + ':00');
        const baseUtilization = i >= 8 && i <= 18 ? 60 + Math.random() * 30 : 20 + Math.random() * 20;
        utilization.push(Math.round(baseUtilization));
        bookings.push(Math.round(Math.random() * 5));
    }
    
    return {
        utilization: { hours, values: utilization },
        popularSlots: {
            'A1': 15, 'A2': 12, 'A3': 18, 'A4': 10,
            'B1': 14, 'B2': 16, 'B3': 11, 'B4': 13
        },
        dailyBookings: { hours, values: bookings },
        peakHours: { hours, values: utilization },
        metrics: {
            avgUtilization: Math.round(utilization.reduce((a, b) => a + b, 0) / utilization.length),
            totalBookings: bookings.reduce((a, b) => a + b, 0),
            avgDuration: 2.5,
            satisfaction: 87
        }
    };
}

function generateWeekAnalytics() {
    const days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    const utilization = [65, 70, 75, 80, 85, 60, 45];
    const bookings = [12, 15, 18, 20, 22, 8, 5];
    
    return {
        utilization: { hours: days, values: utilization },
        popularSlots: {
            'A1': 85, 'A2': 72, 'A3': 95, 'A4': 68,
            'B1': 78, 'B2': 88, 'B3': 65, 'B4': 82
        },
        dailyBookings: { hours: days, values: bookings },
        peakHours: { hours: days, values: utilization },
        metrics: {
            avgUtilization: Math.round(utilization.reduce((a, b) => a + b, 0) / utilization.length),
            totalBookings: bookings.reduce((a, b) => a + b, 0),
            avgDuration: 2.8,
            satisfaction: 89
        }
    };
}

function generateMonthAnalytics() {
    const weeks = ['สัปดาห์ 1', 'สัปดาห์ 2', 'สัปดาห์ 3', 'สัปดาห์ 4'];
    const utilization = [68, 72, 75, 78];
    const bookings = [45, 52, 58, 62];
    
    return {
        utilization: { hours: weeks, values: utilization },
        popularSlots: {
            'A1': 320, 'A2': 285, 'A3': 350, 'A4': 275,
            'B1': 295, 'B2': 315, 'B3': 280, 'B4': 305
        },
        dailyBookings: { hours: weeks, values: bookings },
        peakHours: { hours: weeks, values: utilization },
        metrics: {
            avgUtilization: Math.round(utilization.reduce((a, b) => a + b, 0) / utilization.length),
            totalBookings: bookings.reduce((a, b) => a + b, 0),
            avgDuration: 3.2,
            satisfaction: 91
        }
    };
}

function generateYearAnalytics() {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const utilization = [65, 68, 72, 75, 78, 80, 82, 85, 88, 90, 87, 83];
    const bookings = [180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 300, 285];
    
    return {
        utilization: { hours: months, values: utilization },
        popularSlots: {
            'A1': 1200, 'A2': 1100, 'A3': 1350, 'A4': 1050,
            'B1': 1150, 'B2': 1250, 'B3': 1080, 'B4': 1180
        },
        dailyBookings: { hours: months, values: bookings },
        peakHours: { hours: months, values: utilization },
        metrics: {
            avgUtilization: Math.round(utilization.reduce((a, b) => a + b, 0) / utilization.length),
            totalBookings: bookings.reduce((a, b) => a + b, 0),
            avgDuration: 3.5,
            satisfaction: 93
        }
    };
}

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const os = require('os');
function getLanIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    const ip = getLanIp();
    console.log(`Server running on:`);
    console.log(` - Local:   http://localhost:${PORT}`);
    console.log(` - Network: http://${ip}:${PORT}`);
    console.log(`WebSocket server running on ws://${ip}:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

