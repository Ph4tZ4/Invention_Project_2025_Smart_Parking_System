// Global variables
// Legacy placeholder (no longer used for logic)
let parkingData = { boardA: [false, false, false, false], boardB: [false, false, false, false] };
// Reserved (booked) status per slot
let reservedData = { boardA: [false, false, false, false], boardB: [false, false, false, false] };
// Physically occupied (sensor) status per slot
let occupiedData = { boardA: [false, false, false, false], boardB: [false, false, false, false] };

let bookings = JSON.parse(localStorage.getItem('bookings')) || [];
let wsRef = null; // ensure single websocket connection
let currentTime = new Date();
const API_BASE = window.location.origin;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Ensure parking occupancy reflects saved bookings on initial load
    recomputeParkingFromBookings();
    initializeParkingSlots();
    updateTime();
    setInterval(updateTime, 1000);
    setInterval(updateParkingData, 2000); // Update every 2 seconds
    setupEventListeners();
    updateDashboard();
    updateBookingsTable();
    updateNotificationBadge();
    renderMobileBookings();
    // Load latest state from server for multi-device sync
    loadInitialState();
});

// Initialize parking slot display
function initializeParkingSlots() {
    const boardA = document.getElementById('boardA');
    const boardB = document.getElementById('boardB');
    for (let i = 0; i < 4; i++) boardA.appendChild(createParkingSlot('A', i + 1, false));
    for (let i = 0; i < 4; i++) boardB.appendChild(createParkingSlot('B', i + 1, false));
}

// Create parking slot element
function createParkingSlot(building, slotNumber, _ignored) {
    const idx = slotNumber - 1;
    const isPhysicallyOccupied = building === 'A' ? occupiedData.boardA[idx] : occupiedData.boardB[idx];
    const isReserved = building === 'A' ? reservedData.boardA[idx] : reservedData.boardB[idx];
    const isAvailable = !isPhysicallyOccupied && !isReserved;
    const slot = document.createElement('div');
    slot.className = `p-4 rounded-lg border-2 transition-all duration-200 ${
        isPhysicallyOccupied ? 'bg-red-50 border-red-300' : isReserved ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300 hover:shadow-md cursor-pointer'
    }`;
    slot.innerHTML = `
        <div class="text-center">
            <div class="text-2xl mb-2">${isPhysicallyOccupied ? '🚗' : isReserved ? '📘' : '🅿️'}</div>
            <div class="font-bold text-lg">${building}${slotNumber}</div>
            <div class="text-sm ${isPhysicallyOccupied ? 'text-red-600' : isReserved ? 'text-blue-600' : 'text-green-600'}">${isPhysicallyOccupied ? 'มีรถ' : isReserved ? 'ถูกจอง' : 'ว่าง'}</div>
            ${isAvailable ? '<div class="text-xs text-gray-500 mt-1">คลิกเพื่อจอง</div>' : ''}
        </div>`;
    if (isAvailable) slot.addEventListener('click', () => selectSlot(building, slotNumber));
    return slot;
}

// Select parking slot for booking
function selectSlot(building, slotNumber) {
    document.getElementById('buildingSelect').value = building;
    updateSlotOptions();
    setTimeout(() => {
        document.getElementById('slotSelect').value = `${building}${slotNumber}`;
        updateBookButton();
        document.getElementById('customerName').focus();
        scrollToBooking();
    }, 10);
}

// Update slot options based on building selection
function updateSlotOptions() {
    const buildingSelect = document.getElementById('buildingSelect');
    const slotSelect = document.getElementById('slotSelect');
    slotSelect.innerHTML = '<option value="">เลือกช่องจอด</option>';
    if (buildingSelect.value) {
        const building = buildingSelect.value;
        const rsv = building === 'A' ? reservedData.boardA : reservedData.boardB;
        const occ = building === 'A' ? occupiedData.boardA : occupiedData.boardB;
        for (let i = 0; i < 4; i++) {
            if (!rsv[i] && !occ[i]) {
                const option = document.createElement('option');
                option.value = `${building}${i + 1}`;
                option.textContent = `${building}${i + 1}`;
                slotSelect.appendChild(option);
            }
        }
        slotSelect.disabled = false;
    } else {
        slotSelect.disabled = true;
    }
    updateBookButton();
}

// Update book button state
function updateBookButton() {
    const bookBtn = document.getElementById('bookBtn');
    const building = document.getElementById('buildingSelect').value;
    const slot = document.getElementById('slotSelect').value;
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    bookBtn.disabled = !(building && slot && name && phone);
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('buildingSelect').addEventListener('change', updateSlotOptions);
    ['customerName', 'customerPhone'].forEach(id => document.getElementById(id).addEventListener('input', updateBookButton));
    document.getElementById('bookBtn').addEventListener('click', handleBooking);
    document.getElementById('refreshBtn').addEventListener('click', () => { updateParkingData(); updateDashboard(); updateBookingsTable(); });
    document.getElementById('closeSuccessModal').addEventListener('click', () => { document.getElementById('successModal').classList.add('hidden'); });
    const fab = document.getElementById('fabBookNow');
    if (fab) fab.addEventListener('click', () => scrollToBooking());
}

// Handle booking
function handleBooking() {
    const building = document.getElementById('buildingSelect').value;
    const slot = document.getElementById('slotSelect').value;
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    if (!building || !slot || !name || !phone) { alert('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    const bookBtn = document.getElementById('bookBtn');
    bookBtn.disabled = true;
    fetch(`${API_BASE}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ building, slot, customerName: name, customerPhone: phone }) })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(result => {
            if (!result.success) { alert(result.message || 'ไม่สามารถจองได้'); return; }
            const booking = result.data;
            // Prevent duplicate insert (in case WS echoes the same booking)
            if (!bookings.find(b => b.id === booking.id)) {
                bookings.unshift(booking);
            }
            localStorage.setItem('bookings', JSON.stringify(bookings));
            const slotIndex = parseInt(slot.substring(1)) - 1;
            if (building === 'A') reservedData.boardA[slotIndex] = true; else reservedData.boardB[slotIndex] = true;
            recomputeParkingFromBookings();
            updateParkingSlots();
            updateDashboard();
            updateBookingsTable();
            renderMobileBookings();
            document.getElementById('buildingSelect').value = '';
            document.getElementById('slotSelect').value = '';
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            updateSlotOptions();
            addNotification('booking', 'การจองสำเร็จ', `คุณได้จองที่จอดรถ ${slot} เรียบร้อยแล้ว`, 'fas fa-calendar-check', 'blue');
            document.getElementById('successModal').classList.remove('hidden');
        })
        .catch((e) => {
            console.error('Booking request failed', e);
            addNotification('system', 'การเชื่อมต่อช้า', 'เครือข่ายช้าหรือขาดช่วง เราจะซิงค์อัตโนมัติ', 'fas fa-wifi', 'yellow');
        })
        .finally(() => { bookBtn.disabled = false; });
}

// Update parking slots display
function updateParkingSlots() {
    const boardA = document.getElementById('boardA');
    const boardB = document.getElementById('boardB');
    boardA.innerHTML = '';
    boardB.innerHTML = '';
    for (let i = 0; i < 4; i++) boardA.appendChild(createParkingSlot('A', i + 1, false));
    for (let i = 0; i < 4; i++) boardB.appendChild(createParkingSlot('B', i + 1, false));
}

// Update dashboard statistics
function updateDashboard() {
    const reservedCount = reservedData.boardA.filter(v => v).length + reservedData.boardB.filter(v => v).length;
    const occupiedCount = occupiedData.boardA.filter(v => v).length + occupiedData.boardB.filter(v => v).length;
    const totalUnavailable = reservedCount + occupiedCount;
    const totalAvailable = 8 - totalUnavailable;
    const utilizationRate = Math.round((totalUnavailable / 8) * 100);
    const today = new Date().toDateString();
    const todayBookings = bookings.filter(booking => new Date(booking.bookingTime).toDateString() === today).length;
    document.getElementById('totalAvailable').textContent = totalAvailable;
    document.getElementById('totalOccupied').textContent = reservedCount;
    document.getElementById('todayBookings').textContent = todayBookings;
    document.getElementById('utilizationRate').textContent = utilizationRate + '%';
}

// Update bookings table
function updateBookingsTable() {
    const tbody = document.getElementById('bookingsTable');
    if (!tbody) return;
    // Deduplicate by id (keep latest first occurrence)
    const seen = new Set();
    const unique = [];
    for (const b of bookings) {
        if (!seen.has(b.id)) { seen.add(b.id); unique.push(b); }
    }
    bookings = unique;
    localStorage.setItem('bookings', JSON.stringify(bookings));
    tbody.innerHTML = '';
    bookings.slice(0, 10).forEach(booking => {
        const bookingTime = new Date(booking.bookingTime);
        const timeString = bookingTime.toLocaleString('th-TH');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${booking.slot}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${booking.customerName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${booking.customerPhone}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${timeString}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${booking.status === 'active' ? 'ใช้งาน' : 'สิ้นสุด'}</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${booking.status === 'active' ? `<button onclick="cancelBooking(${booking.id})" class="text-red-600 hover:text-red-900">ยกเลิก</button>` : `<button onclick="deleteBooking(${booking.id})" class="text-gray-600 hover:text-gray-900">ลบ</button>`}</td>`;
        tbody.appendChild(row);
    });
    renderMobileBookings();
}

// Recompute parking occupancy from saved bookings
function recomputeParkingFromBookings() {
    reservedData.boardA = [false, false, false, false];
    reservedData.boardB = [false, false, false, false];
    try {
        const savedBookings = JSON.parse(localStorage.getItem('bookings')) || [];
        savedBookings.forEach(b => {
            if (b && b.status === 'active' && typeof b.slot === 'string' && b.slot.length >= 2) {
                const building = b.slot[0];
                const slotIndex = parseInt(b.slot.substring(1)) - 1;
                if (slotIndex >= 0 && slotIndex < 4) {
                    if (building === 'A') reservedData.boardA[slotIndex] = true; else if (building === 'B') reservedData.boardB[slotIndex] = true;
                }
            }
        });
    } catch {}
}

// Render bookings as mobile cards
function renderMobileBookings() {
    const cardsContainer = document.getElementById('bookingsCards');
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';
    // Use same deduped list
    const seen = new Set();
    const unique = [];
    for (const b of bookings) { if (!seen.has(b.id)) { seen.add(b.id); unique.push(b); } }
    unique.slice(0, 10).forEach(booking => {
        const timeString = new Date(booking.bookingTime).toLocaleString('th-TH');
        const card = document.createElement('div');
        card.className = 'border rounded-lg p-4 bg-white flex justify-between items-start';
        card.innerHTML = `
            <div>
                <div class="text-sm text-gray-500">ที่จอด</div>
                <div class="font-bold text-gray-900">${booking.slot}</div>
                <div class="mt-1 text-sm text-gray-700">${booking.customerName} • ${booking.customerPhone}</div>
                <div class="mt-1 text-xs text-gray-500">${timeString}</div>
            </div>
            <div class="text-right">
                <span class="px-2 py-1 text-xs rounded-full ${booking.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">${booking.status === 'active' ? 'ใช้งาน' : 'สิ้นสุด'}</span>
                <div class="mt-2">${booking.status === 'active' ? `<button class="text-red-600 text-sm" onclick="cancelBooking(${booking.id})">ยกเลิก</button>` : `<button class="text-gray-600 text-sm" onclick="deleteBooking(${booking.id})">ลบ</button>`}</div>
            </div>`;
        cardsContainer.appendChild(card);
    });
}

// Smooth scroll to booking section
function scrollToBooking() {
    const section = document.getElementById('bookingSection');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Cancel booking (server sync)
function cancelBooking(bookingId) {
    if (!confirm('คุณต้องการยกเลิกการจองนี้หรือไม่?')) return;
    fetch(`${API_BASE}/api/bookings/${bookingId}`, { method: 'DELETE' })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(result => {
            if (!result.success) { alert(result.message || 'ไม่สามารถยกเลิกได้'); return; }
            const booking = result.data;
            const local = bookings.find(b => b.id === bookingId);
            if (local) local.status = 'cancelled';
            localStorage.setItem('bookings', JSON.stringify(bookings));
            const slotIndex = parseInt(booking.slot.substring(1)) - 1;
            if (booking.building === 'A') reservedData.boardA[slotIndex] = false; else reservedData.boardB[slotIndex] = false;
            updateParkingSlots();
            updateDashboard();
            updateBookingsTable();
            addNotification('booking', 'ยกเลิกการจอง', `การจองที่จอดรถ ${booking.slot} ถูกยกเลิกแล้ว`, 'fas fa-calendar-times', 'orange');
        })
        .catch((e) => {
            console.error('Cancel request failed', e);
            addNotification('system', 'การเชื่อมต่อช้า', 'ไม่สามารถยกเลิกได้ชั่วคราว จะลองใหม่ภายหลัง', 'fas fa-wifi', 'yellow');
        });
}

// Delete booking
function deleteBooking(bookingId) {
    if (confirm('คุณต้องการลบการจองนี้หรือไม่?')) {
        bookings = bookings.filter(b => b.id !== bookingId);
        localStorage.setItem('bookings', JSON.stringify(bookings));
        updateBookingsTable();
    }
}

// Update time display
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('currentTime').textContent = timeString;
}

// Real-time parking data refresh (pull latest server state)
function updateParkingData() {
    fetch(`${API_BASE}/api/parking`).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))).then(result => {
        if (result && result.success && result.data) {
            const p = result.data;
            occupiedData.boardA = Array.isArray(p.boardA) ? p.boardA.slice(0,4).map(Boolean) : [false,false,false,false];
            occupiedData.boardB = Array.isArray(p.boardB) ? p.boardB.slice(0,4).map(Boolean) : [false,false,false,false];
        }
    }).finally(() => { updateParkingSlots(); updateDashboard(); });
}

// WebSocket connection for real-time updates
function connectWebSocket() {
    try {
        if (wsRef && (wsRef.readyState === WebSocket.OPEN || wsRef.readyState === WebSocket.CONNECTING)) {
            return; // already connected/connecting
        }
        const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${wsProtocol}://${location.host}`);
        wsRef = ws;
        ws.onmessage = (evt) => {
            try {
                const msg = JSON.parse(evt.data);
                if (msg.type === 'parking_update' && msg.data) {
                    occupiedData.boardA = Array.isArray(msg.data.boardA) ? msg.data.boardA.slice(0,4).map(Boolean) : occupiedData.boardA;
                    occupiedData.boardB = Array.isArray(msg.data.boardB) ? msg.data.boardB.slice(0,4).map(Boolean) : occupiedData.boardB;
                    updateParkingSlots();
                    updateDashboard();
                } else if (msg.type === 'booking_created' && msg.data) {
                    const b = msg.data;
                    if (!bookings.find(x => x.id === b.id)) { bookings.unshift(b); }
                    localStorage.setItem('bookings', JSON.stringify(bookings));
                    const slotIndex = parseInt(b.slot.substring(1)) - 1;
                    if (b.building === 'A') reservedData.boardA[slotIndex] = true; else reservedData.boardB[slotIndex] = true;
                    updateBookingsTable();
                    updateParkingSlots();
                    updateDashboard();
                } else if (msg.type === 'booking_cancelled' && msg.data) {
                    const b = msg.data;
                    const local = bookings.find(x => x.id === b.id);
                    if (local) local.status = 'cancelled';
                    localStorage.setItem('bookings', JSON.stringify(bookings));
                    const slotIndex = parseInt(b.slot.substring(1)) - 1;
                    if (b.building === 'A') reservedData.boardA[slotIndex] = false; else reservedData.boardB[slotIndex] = false;
                    updateBookingsTable();
                    updateParkingSlots();
                    updateDashboard();
                }
            } catch {}
        };
        ws.onclose = () => { wsRef = null; };
    } catch {}
}

// Load initial state
function loadInitialState() {
    Promise.all([
        fetch('/api/bookings').then(r => r.json()).catch(() => null),
        fetch('/api/parking').then(r => r.json()).catch(() => null)
    ]).then(([bRes, pRes]) => {
        if (bRes && bRes.success && Array.isArray(bRes.data)) {
            bookings = bRes.data;
            localStorage.setItem('bookings', JSON.stringify(bookings));
            recomputeParkingFromBookings();
            updateBookingsTable();
        }
        if (pRes && pRes.success && pRes.data) {
            occupiedData.boardA = Array.isArray(pRes.data.boardA) ? pRes.data.boardA.slice(0,4).map(Boolean) : occupiedData.boardA;
            occupiedData.boardB = Array.isArray(pRes.data.boardB) ? pRes.data.boardB.slice(0,4).map(Boolean) : occupiedData.boardB;
        }
        updateParkingSlots();
        updateDashboard();
    });
    connectWebSocket();
}

// Update notification badge
function updateNotificationBadge() {
    const notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// Add new notification
function addNotification(type, title, message, icon = 'fas fa-bell', color = 'blue') {
    const notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    const notification = { id: Date.now(), type, title, message, timestamp: new Date().toISOString(), read: false, icon, color };
    notifications.unshift(notification);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotificationBadge();
    if (Notification.permission === 'granted') new Notification(title, { body: message, icon: '/favicon.ico' });
}

