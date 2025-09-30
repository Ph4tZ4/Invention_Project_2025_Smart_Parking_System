// Analytics system
let charts = {};
let currentTimeRange = 'today';

// Initialize analytics page
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadAnalyticsData();
    initializeCharts();
    updateMetrics();
});

// Setup event listeners
function setupEventListeners() {
    // Time range selector
    document.getElementById('timeRange').addEventListener('change', function() {
        currentTimeRange = this.value;
        updateAnalyticsData();
    });
    
    // Refresh button
    document.getElementById('refreshData').addEventListener('click', function() {
        updateAnalyticsData();
    });
}

// Load analytics data
function loadAnalyticsData() {
    // In a real application, this would fetch data from a database
    // For now, we'll use sample data
    updateAnalyticsData();
}

// Update analytics data based on time range
function updateAnalyticsData() {
    const data = generateSampleData(currentTimeRange);
    updateMetrics(data);
    updateCharts(data);
}

// Generate sample data based on time range
function generateSampleData(timeRange) {
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
            data = generateTodayData();
            break;
        case 'week':
            data = generateWeekData();
            break;
        case 'month':
            data = generateMonthData();
            break;
        case 'year':
            data = generateYearData();
            break;
    }
    
    return data;
}

// Generate today's data
function generateTodayData() {
    const hours = [];
    const utilization = [];
    const bookings = [];
    
    for (let i = 0; i < 24; i++) {
        hours.push(i + ':00');
        // Simulate utilization pattern (higher during business hours)
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

// Generate week's data
function generateWeekData() {
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

// Generate month's data
function generateMonthData() {
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

// Generate year's data
function generateYearData() {
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

// Update metrics display
function updateMetrics(data = null) {
    if (!data) {
        data = generateSampleData(currentTimeRange);
    }
    
    document.getElementById('avgUtilization').textContent = data.metrics.avgUtilization + '%';
    document.getElementById('totalBookings').textContent = data.metrics.totalBookings;
    document.getElementById('avgDuration').textContent = data.metrics.avgDuration + ' ชม.';
    document.getElementById('satisfaction').textContent = data.metrics.satisfaction + '%';
}

// Initialize all charts
function initializeCharts() {
    initializeUtilizationChart();
    initializePopularSlotsChart();
    initializeDailyBookingsChart();
    initializePeakHoursChart();
}

// Initialize utilization chart
function initializeUtilizationChart() {
    const ctx = document.getElementById('utilizationChart').getContext('2d');
    charts.utilization = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'อัตราการใช้งาน (%)',
                data: [],
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Initialize popular slots chart
function initializePopularSlotsChart() {
    const ctx = document.getElementById('popularSlotsChart').getContext('2d');
    charts.popularSlots = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'จำนวนการจอง',
                data: [],
                backgroundColor: [
                    '#3B82F6', '#1E40AF', '#10B981', '#F59E0B',
                    '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Initialize daily bookings chart
function initializeDailyBookingsChart() {
    const ctx = document.getElementById('dailyBookingsChart').getContext('2d');
    charts.dailyBookings = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'การจอง',
                data: [],
                backgroundColor: '#10B981',
                borderColor: '#059669',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Initialize peak hours chart
function initializePeakHoursChart() {
    const ctx = document.getElementById('peakHoursChart').getContext('2d');
    charts.peakHours = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'อัตราการใช้งาน (%)',
                data: [],
                backgroundColor: '#F59E0B',
                borderColor: '#D97706',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Update all charts with new data
function updateCharts(data) {
    // Update utilization chart
    charts.utilization.data.labels = data.utilization.hours;
    charts.utilization.data.datasets[0].data = data.utilization.values;
    charts.utilization.update();
    
    // Update popular slots chart
    const slots = Object.keys(data.popularSlots);
    const slotValues = Object.values(data.popularSlots);
    charts.popularSlots.data.labels = slots;
    charts.popularSlots.data.datasets[0].data = slotValues;
    charts.popularSlots.update();
    
    // Update daily bookings chart
    charts.dailyBookings.data.labels = data.dailyBookings.hours;
    charts.dailyBookings.data.datasets[0].data = data.dailyBookings.values;
    charts.dailyBookings.update();
    
    // Update peak hours chart
    charts.peakHours.data.labels = data.peakHours.hours;
    charts.peakHours.data.datasets[0].data = data.peakHours.values;
    charts.peakHours.update();
}


