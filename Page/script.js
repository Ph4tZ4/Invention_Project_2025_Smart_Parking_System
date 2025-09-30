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
    setupDateTimePicker();
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
    const dtEl = document.getElementById('bookingDateTime');
    const dateValid = dtEl ? validateBookingDateTime() : true;
    bookBtn.disabled = !(building && slot && name && phone && dateValid);
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('buildingSelect').addEventListener('change', updateSlotOptions);
    ['customerName', 'customerPhone'].forEach(id => document.getElementById(id).addEventListener('input', updateBookButton));
    const dtEl = document.getElementById('bookingDateTime');
    if (dtEl) dtEl.addEventListener('input', () => { validateBookingDateTime(); updateBookButton(); });
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
    const dtEl = document.getElementById('bookingDateTime');
    if (!building || !slot || !name || !phone || (dtEl && !validateBookingDateTime())) { alert('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
    const bookBtn = document.getElementById('bookBtn');
    bookBtn.disabled = true;
    const payload = { building, slot, customerName: name, customerPhone: phone };
    if (dtEl && dtEl.value) {
        const selectedLocal = new Date(dtEl.value);
        payload.bookingTime = selectedLocal.toISOString();
    }
    fetch(`${API_BASE}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then(result => {
            if (!result.success) { alert(result.message || 'ไม่สามารถจองได้'); return; }
            const booking = result.data;
            // Prevent duplicate insert (in case WS echoes the same booking)
            if (!bookings.find(b => b.id === booking.id)) {
                bookings.unshift(booking);
            }
            localStorage.setItem('bookings', JSON.stringify(bookings));
            // Don't reserve slot until payment is confirmed - just redirect to payment
            updateDashboard();
            updateBookingsTable();
            renderMobileBookings();
            // Redirect to payment page
            const due = encodeURIComponent(booking.paymentDueAt || '');
            window.location.href = `payment.html?id=${booking.id}&due=${due}`;
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
    // Only show active/paid bookings in the table
    const activeBookings = bookings.filter(b => b.status === 'active');
    activeBookings.slice(0, 10).forEach(booking => {
        const bookingTime = new Date(booking.bookingTime);
        const timeString = bookingTime.toLocaleString('th-TH');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${booking.slot}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${booking.customerName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${booking.customerPhone}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${timeString}</td>
            <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">ใช้งาน</span></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium"><button onclick="cancelBooking(${booking.id})" class="text-red-600 hover:text-red-900">ยกเลิก</button></td>`;
        tbody.appendChild(row);
    });
    renderMobileBookings();
}

// Recompute parking occupancy from saved bookings (only active/paid bookings)
function recomputeParkingFromBookings() {
    reservedData.boardA = [false, false, false, false];
    reservedData.boardB = [false, false, false, false];
    try {
        const savedBookings = JSON.parse(localStorage.getItem('bookings')) || [];
        savedBookings.forEach(b => {
            if (b && b.status === 'active' && b.paid && typeof b.slot === 'string' && b.slot.length >= 2) {
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
    // Use same deduped list, only show active bookings
    const seen = new Set();
    const unique = [];
    for (const b of bookings) { if (!seen.has(b.id)) { seen.add(b.id); unique.push(b); } }
    const activeBookings = unique.filter(b => b.status === 'active');
    activeBookings.slice(0, 10).forEach(booking => {
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
                <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">ใช้งาน</span>
                <div class="mt-2"><button class="text-red-600 text-sm" onclick="cancelBooking(${booking.id})">ยกเลิก</button></div>
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
            // Only unreserve if it was actually reserved (status was 'active')
            if (booking.status === 'active') {
                const slotIndex = parseInt(booking.slot.substring(1)) - 1;
                if (booking.building === 'A') reservedData.boardA[slotIndex] = false; else reservedData.boardB[slotIndex] = false;
            }
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

// Date-time picker helpers
function setupDateTimePicker() {
    const dt = document.getElementById('bookingDateTime');
    if (!dt) return;
    const now = new Date();
    now.setSeconds(0, 0);
    // Set min to current local time
    const localMin = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,16);
    dt.min = localMin;
    // Default value: clamp to business window (09:00-21:00)
    const defaultDate = clampToBusinessWindow(now);
    const defaultLocal = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000).toISOString().slice(0,16);
    if (!dt.value) dt.value = defaultLocal;
    validateBookingDateTime();
}

function validateBookingDateTime() {
    const dt = document.getElementById('bookingDateTime');
    const hint = document.getElementById('bookingDateTimeHint');
    if (!dt) return true;
    let valid = true;
    if (!dt.value) {
        valid = false;
    } else {
        const selected = new Date(dt.value);
        const now = new Date();
        if (isNaN(selected.getTime()) || selected.getTime() < now.getTime() - 1000 || !isWithinBusinessHours(selected)) {
            valid = false;
        }
    }
    if (hint) {
        hint.className = `mt-1 text-xs ${valid ? 'text-gray-500' : 'text-red-600'}`;
        hint.textContent = valid
            ? 'ห้ามเลือกเวลาย้อนหลัง และต้องอยู่ระหว่าง 09:00–21:00'
            : 'เวลาไม่ถูกต้อง: เลือกเวลาที่ไม่น้อยกว่าปัจจุบัน และอยู่ระหว่าง 09:00–21:00';
    }
    return valid;
}

function isWithinBusinessHours(dateObj) {
    const hour = dateObj.getHours();
    const minute = dateObj.getMinutes();
    // Allow 09:00 up to before 21:00, and exactly 21:00
    return (hour > 9 && hour < 21) || (hour === 9) || (hour === 21 && minute === 0);
}

function clampToBusinessWindow(dateObj) {
    const d = new Date(dateObj);
    const hour = d.getHours();
    const minute = d.getMinutes();
    if (hour < 9) {
        d.setHours(9, 0, 0, 0);
        return d;
    }
    if (hour > 21 || (hour === 21 && minute > 0)) {
        // move to next day 09:00
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
    }
    return d;
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
                    // Don't reserve slot for pending_payment bookings
                    updateBookingsTable();
                    updateParkingSlots();
                    updateDashboard();
                } else if (msg.type === 'booking_cancelled' && msg.data) {
                    const b = msg.data;
                    const local = bookings.find(x => x.id === b.id);
                    if (local) local.status = 'cancelled';
                    localStorage.setItem('bookings', JSON.stringify(bookings));
                    // Don't change slot reservation for cancelled bookings (they were never reserved)
                    updateBookingsTable();
                    updateParkingSlots();
                    updateDashboard();
                } else if (msg.type === 'booking_paid' && msg.data) {
                    const b = msg.data;
                    const local = bookings.find(x => x.id === b.id);
                    if (local) { local.status = 'active'; local.paid = true; }
                    localStorage.setItem('bookings', JSON.stringify(bookings));
                    // Now reserve the slot after payment confirmation
                    const slotIndex = parseInt(b.slot.substring(1)) - 1;
                    if (b.building === 'A') reservedData.boardA[slotIndex] = true; else reservedData.boardB[slotIndex] = true;
                    recomputeParkingFromBookings();
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

