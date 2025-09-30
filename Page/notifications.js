// Notifications system
let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
let currentFilter = 'all';

// Initialize notifications page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadNotifications();
    updateNotificationCounts();
    renderNotifications();
});

// Setup event listeners
function setupEventListeners() {
    // Filter tabs
    document.querySelectorAll('.notification-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.notification-tab').forEach(t => {
                t.classList.remove('active', 'border-primary', 'text-primary');
                t.classList.add('border-transparent', 'text-gray-500');
            });
            
            // Add active class to clicked tab
            this.classList.add('active', 'border-primary', 'text-primary');
            this.classList.remove('border-transparent', 'text-gray-500');
            
            // Update filter
            currentFilter = this.dataset.filter;
            renderNotifications();
        });
    });
    
    // Mark all as read
    document.getElementById('markAllReadBtn').addEventListener('click', markAllAsRead);
    
    // Clear all notifications
    document.getElementById('clearAllBtn').addEventListener('click', clearAllNotifications);
}

// Load notifications from localStorage (no mock/sample injection)
function loadNotifications() {
    notifications = JSON.parse(localStorage.getItem('notifications')) || [];
}

// Removed sample notifications code to keep only real data

// Update notification counts
function updateNotificationCounts() {
    const counts = {
        all: notifications.length,
        booking: notifications.filter(n => n.type === 'booking').length,
        system: notifications.filter(n => n.type === 'system').length,
        alert: notifications.filter(n => n.type === 'alert').length
    };
    
    document.getElementById('allCount').textContent = counts.all;
    document.getElementById('bookingCount').textContent = counts.booking;
    document.getElementById('systemCount').textContent = counts.system;
    document.getElementById('alertCount').textContent = counts.alert;
}

// Render notifications based on current filter
function renderNotifications() {
    const container = document.getElementById('notificationsList');
    const emptyState = document.getElementById('emptyState');
    
    let filteredNotifications = notifications;
    
    if (currentFilter !== 'all') {
        filteredNotifications = notifications.filter(n => n.type === currentFilter);
    }
    
    // Sort by timestamp (newest first)
    filteredNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (filteredNotifications.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    container.innerHTML = '';
    
    filteredNotifications.forEach(notification => {
        const notificationElement = createNotificationElement(notification);
        container.appendChild(notificationElement);
    });
}

// Create notification element
function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `bg-white rounded-lg shadow-md p-4 border-l-4 ${
        notification.read ? 'border-gray-300' : 'border-primary'
    } ${notification.read ? 'opacity-75' : ''}`;
    
    const timeAgo = getTimeAgo(notification.timestamp);
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-100',
        yellow: 'text-yellow-600 bg-yellow-100',
        red: 'text-red-600 bg-red-100',
        orange: 'text-orange-600 bg-orange-100'
    };
    
    div.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <div class="w-10 h-10 rounded-full ${colorClasses[notification.color]} flex items-center justify-center">
                    <i class="${notification.icon}"></i>
                </div>
            </div>
            <div class="ml-4 flex-1">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-900 ${notification.read ? '' : 'font-bold'}">
                        ${notification.title}
                    </h3>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs text-gray-500">${timeAgo}</span>
                        ${!notification.read ? '<div class="w-2 h-2 bg-primary rounded-full"></div>' : ''}
                    </div>
                </div>
                <p class="mt-1 text-sm text-gray-600">${notification.message}</p>
                <div class="mt-2 flex space-x-2">
                    ${!notification.read ? 
                        `<button onclick="markAsRead(${notification.id})" class="text-xs text-primary hover:text-secondary">
                            <i class="fas fa-check mr-1"></i>ทำเครื่องหมายว่าอ่านแล้ว
                        </button>` : ''
                    }
                    <button onclick="deleteNotification(${notification.id})" class="text-xs text-gray-500 hover:text-red-600">
                        <i class="fas fa-trash mr-1"></i>ลบ
                    </button>
                </div>
            </div>
        </div>
    `;
    
    return div;
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) {
        return 'เมื่อสักครู่';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} นาทีที่แล้ว`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ชั่วโมงที่แล้ว`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} วันที่แล้ว`;
    }
}

// Mark notification as read
function markAsRead(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        localStorage.setItem('notifications', JSON.stringify(notifications));
        updateNotificationCounts();
        renderNotifications();
    }
}

// Delete notification
function deleteNotification(notificationId) {
    if (confirm('คุณต้องการลบการแจ้งเตือนนี้หรือไม่?')) {
        notifications = notifications.filter(n => n.id !== notificationId);
        localStorage.setItem('notifications', JSON.stringify(notifications));
        updateNotificationCounts();
        renderNotifications();
    }
}

// Mark all notifications as read
function markAllAsRead() {
    notifications.forEach(notification => {
        notification.read = true;
    });
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotificationCounts();
    renderNotifications();
}

// Clear all notifications
function clearAllNotifications() {
    if (confirm('คุณต้องการลบการแจ้งเตือนทั้งหมดหรือไม่?')) {
        notifications = [];
        localStorage.setItem('notifications', JSON.stringify(notifications));
        updateNotificationCounts();
        renderNotifications();
    }
}

// Add new notification (called from other pages)
function addNotification(type, title, message, icon = 'fas fa-bell', color = 'blue') {
    const notification = {
        id: Date.now(),
        type: type,
        title: title,
        message: message,
        timestamp: new Date().toISOString(),
        read: false,
        icon: icon,
        color: color
    };
    
    notifications.unshift(notification);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/favicon.ico'
        });
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Initialize notification permission
requestNotificationPermission();

