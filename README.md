# ระบบจองที่จอดรถอัจฉริยะ (Smart Parking System)

ระบบจองที่จอดรถอัจฉริยะที่สามารถรับข้อมูลจากเซ็นเซอร์ Arduino แบบเรียลไทม์ และให้ผู้ใช้สามารถจองที่จอดรถได้ผ่านเว็บไซต์

## ฟีเจอร์หลัก

### 🚗 ระบบจองที่จอดรถ
- แสดงสถานะที่จอดรถแบบเรียลไทม์
- ระบบจองที่จอดรถออนไลน์
- การจัดการการจอง (จอง, ยกเลิก, ดูประวัติ)

### 📊 การวิเคราะห์ข้อมูล
- แผนภูมิแสดงอัตราการใช้งาน
- สถิติการจองรายวัน/สัปดาห์/เดือน
- ช่องจอดที่ได้รับความนิยม
- ชั่วโมงเร่งด่วน

### 🔔 ระบบแจ้งเตือน
- แจ้งเตือนการจองสำเร็จ
- แจ้งเตือนระบบ
- แจ้งเตือนความผิดปกติ

### 🎨 UI/UX ที่สวยงาม
- ใช้ Tailwind CSS สำหรับการออกแบบ
- Responsive Design รองรับทุกขนาดหน้าจอ
- แอนิเมชันและเอฟเฟกต์ที่ลื่นไหล

## โครงสร้างโปรเจค

```
Website/
├── index.html          # หน้าหลัก
├── notifications.html  # หน้าการแจ้งเตือน
├── analytics.html      # หน้าการวิเคราะห์ข้อมูล
├── script.js          # JavaScript หลัก
├── notifications.js   # JavaScript สำหรับการแจ้งเตือน
├── analytics.js       # JavaScript สำหรับการวิเคราะห์
├── server.js          # Express.js Server
├── package.json       # Dependencies
└── README.md          # เอกสารนี้
```

## การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. เริ่มต้น Server
```bash
npm start
```

หรือสำหรับการพัฒนา:
```bash
npm run dev
```

### 3. เปิดเว็บไซต์
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

## API Endpoints

### Parking Data
- `GET /api/parking` - ดูข้อมูลสถานะที่จอดรถ
- `POST /api/parking` - อัปเดตข้อมูลจาก Arduino

### Bookings
- `GET /api/bookings` - ดูรายการการจอง
- `POST /api/bookings` - สร้างการจองใหม่
- `DELETE /api/bookings/:id` - ยกเลิกการจอง

### Analytics
- `GET /api/analytics?range=today` - ดูข้อมูลการวิเคราะห์

### Notifications
- `GET /api/notifications` - ดูการแจ้งเตือน

## การเชื่อมต่อกับ Arduino

### ข้อมูลที่ Arduino ส่งมา
```json
{
  "boardA": [false, false, true, false],
  "boardB": [true, false, false, true]
}
```

### ตัวอย่างการส่งข้อมูลจาก Arduino
```javascript
// ใช้ HTTP POST request
fetch('http://localhost:3000/api/parking', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    boardA: [false, false, true, false],
    boardB: [true, false, false, true]
  })
});
```

## WebSocket Connection

ระบบใช้ WebSocket สำหรับการอัปเดตแบบเรียลไทม์:

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'parking_update') {
    // อัปเดตสถานะที่จอดรถ
    updateParkingDisplay(data.data);
  }
};
```

## ฟีเจอร์เพิ่มเติมที่แนะนำ

### 🔐 ระบบความปลอดภัย
- การล็อกอิน/สมัครสมาชิก
- การยืนยันตัวตนด้วย OTP
- การเข้ารหัสข้อมูล

### 💳 ระบบชำระเงิน
- การชำระเงินออนไลน์
- ระบบสมาชิก
- การคิดค่าบริการตามเวลา

### 📱 Mobile App
- แอปพลิเคชันมือถือ
- Push Notifications
- GPS Navigation

### 🤖 AI Features
- การทำนายความต้องการที่จอดรถ
- การแนะนำช่องจอดที่เหมาะสม
- การวิเคราะห์พฤติกรรมผู้ใช้

### 🌐 Multi-language Support
- รองรับหลายภาษา
- การตั้งค่าภาษา

### 📈 Advanced Analytics
- Machine Learning
- Predictive Analytics
- Custom Reports

## การพัฒนาต่อ

1. **Database Integration**: เชื่อมต่อกับฐานข้อมูลจริง
2. **Authentication**: ระบบยืนยันตัวตน
3. **Payment Gateway**: ระบบชำระเงิน
4. **Mobile App**: แอปพลิเคชันมือถือ
5. **IoT Integration**: เชื่อมต่อกับอุปกรณ์ IoT อื่นๆ

## License

MIT License - ดูรายละเอียดในไฟล์ LICENSE

## Support

หากมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมพัฒนา


