// Settings management
let settings = JSON.parse(localStorage.getItem('settings')) || {
    serverUrl: 'http://localhost:3000',
    updateInterval: 2,
    soundNotifications: 'enabled',
    theme: 'light',
    arduinoA_ip: '',
    arduinoA_port: 80,
    arduinoB_ip: '',
    arduinoB_port: 80,
    bookingNotifications: true,
    systemNotifications: true,
    alertNotifications: true
};

let startTime = Date.now();

// Initialize settings page
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
    updateSystemInfo();
    setInterval(updateSystemInfo, 1000);
});

// Load settings from localStorage
function loadSettings() {
    // Server settings
    document.getElementById('serverUrl').value = settings.serverUrl;
    document.getElementById('updateInterval').value = settings.updateInterval;
    document.getElementById('soundNotifications').value = settings.soundNotifications;
    document.getElementById('theme').value = settings.theme;
    
    // Arduino settings
    document.getElementById('arduinoA_ip').value = settings.arduinoA_ip;
    document.getElementById('arduinoA_port').value = settings.arduinoA_port;
    document.getElementById('arduinoB_ip').value = settings.arduinoB_ip;
    document.getElementById('arduinoB_port').value = settings.arduinoB_port;
    
    // Notification settings
    document.getElementById('bookingNotifications').checked = settings.bookingNotifications;
    document.getElementById('systemNotifications').checked = settings.systemNotifications;
    document.getElementById('alertNotifications').checked = settings.alertNotifications;
}

// Setup event listeners
function setupEventListeners() {
    // Save settings
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    
    // Reset settings
    document.getElementById('resetSettings').addEventListener('click', resetSettings);
    
    // Export data
    document.getElementById('exportData').addEventListener('click', exportData);
    
    // Import data
    document.getElementById('importData').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    
    document.getElementById('importFile').addEventListener('change', importData);
    
    // Theme change
    document.getElementById('theme').addEventListener('change', function() {
        applyTheme(this.value);
    });
}

// Save settings
function saveSettings() {
    // Get form values
    settings.serverUrl = document.getElementById('serverUrl').value;
    settings.updateInterval = parseInt(document.getElementById('updateInterval').value);
    settings.soundNotifications = document.getElementById('soundNotifications').value;
    settings.theme = document.getElementById('theme').value;
    settings.arduinoA_ip = document.getElementById('arduinoA_ip').value;
    settings.arduinoA_port = parseInt(document.getElementById('arduinoA_port').value);
    settings.arduinoB_ip = document.getElementById('arduinoB_ip').value;
    settings.arduinoB_port = parseInt(document.getElementById('arduinoB_port').value);
    settings.bookingNotifications = document.getElementById('bookingNotifications').checked;
    settings.systemNotifications = document.getElementById('systemNotifications').checked;
    settings.alertNotifications = document.getElementById('alertNotifications').checked;
    
    // Save to localStorage
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Apply theme
    applyTheme(settings.theme);
    
    // Show success message
    showNotification('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'success');
}

// Reset settings
function resetSettings() {
    if (confirm('คุณต้องการรีเซ็ตการตั้งค่าทั้งหมดหรือไม่?')) {
        settings = {
            serverUrl: 'http://localhost:3000',
            updateInterval: 2,
            soundNotifications: 'enabled',
            theme: 'light',
            arduinoA_ip: '',
            arduinoA_port: 80,
            arduinoB_ip: '',
            arduinoB_port: 80,
            bookingNotifications: true,
            systemNotifications: true,
            alertNotifications: true
        };
        
        localStorage.setItem('settings', JSON.stringify(settings));
        loadSettings();
        applyTheme('light');
        showNotification('รีเซ็ตการตั้งค่าเรียบร้อยแล้ว', 'success');
    }
}

// Apply theme
function applyTheme(theme) {
    const body = document.body;
    
    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');
    
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        // Add dark theme styles
        const style = document.createElement('style');
        style.textContent = `
            .dark-theme {
                background-color: #1f2937 !important;
                color: #f9fafb !important;
            }
            .dark-theme .bg-white {
                background-color: #374151 !important;
                color: #f9fafb !important;
            }
            .dark-theme .text-gray-900 {
                color: #f9fafb !important;
            }
            .dark-theme .text-gray-700 {
                color: #d1d5db !important;
            }
            .dark-theme .text-gray-500 {
                color: #9ca3af !important;
            }
            .dark-theme .border-gray-300 {
                border-color: #4b5563 !important;
            }
        `;
        document.head.appendChild(style);
    } else {
        body.classList.add('light-theme');
    }
}

// Export data
function exportData() {
    const data = {
        settings: settings,
        bookings: JSON.parse(localStorage.getItem('bookings')) || [],
        notifications: JSON.parse(localStorage.getItem('notifications')) || [],
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `parking-system-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('ดาวน์โหลดข้อมูลสำเร็จ', 'success');
}

// Import data
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.settings) {
                settings = data.settings;
                localStorage.setItem('settings', JSON.stringify(settings));
            }
            
            if (data.bookings) {
                localStorage.setItem('bookings', JSON.stringify(data.bookings));
            }
            
            if (data.notifications) {
                localStorage.setItem('notifications', JSON.stringify(data.notifications));
            }
            
            loadSettings();
            applyTheme(settings.theme);
            showNotification('นำเข้าข้อมูลสำเร็จ', 'success');
        } catch (error) {
            showNotification('ไฟล์ไม่ถูกต้อง', 'error');
        }
    };
    
    reader.readAsText(file);
}

// Update system information
function updateSystemInfo() {
    // Update uptime
    const uptime = Date.now() - startTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    
    document.getElementById('uptime').textContent = `${days} วัน ${hours} ชั่วโมง ${minutes} นาที`;
    
    // Check Arduino connections (simulated)
    checkArduinoConnection('A');
    checkArduinoConnection('B');
    
    // Check server connection
    checkServerConnection();
}

// Check Arduino connection (simulated)
function checkArduinoConnection(board) {
    const statusElement = document.getElementById(`arduino${board}_status`);
    // In a real application, this would ping the Arduino
    const isConnected = Math.random() > 0.3; // Simulate connection status
    
    if (isConnected) {
        statusElement.textContent = 'เชื่อมต่อแล้ว';
        statusElement.className = 'text-green-600';
    } else {
        statusElement.textContent = 'ไม่เชื่อมต่อ';
        statusElement.className = 'text-red-600';
    }
}

// Check server connection
function checkServerConnection() {
    const statusElement = document.getElementById('server_status');
    
    fetch(settings.serverUrl + '/api/parking')
        .then(response => {
            if (response.ok) {
                statusElement.textContent = 'เชื่อมต่อแล้ว';
                statusElement.className = 'text-green-600';
            } else {
                statusElement.textContent = 'ไม่เชื่อมต่อ';
                statusElement.className = 'text-red-600';
            }
        })
        .catch(error => {
            statusElement.textContent = 'ไม่เชื่อมต่อ';
            statusElement.className = 'text-red-600';
        });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${
                type === 'success' ? 'fa-check-circle' :
                type === 'error' ? 'fa-exclamation-circle' :
                'fa-info-circle'
            } mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}


