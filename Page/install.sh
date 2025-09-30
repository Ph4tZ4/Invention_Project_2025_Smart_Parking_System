#!/bin/bash

# Smart Parking System Installation Script
echo "🚗 กำลังติดตั้งระบบจองที่จอดรถอัจฉริยะ..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js ไม่ได้ติดตั้ง กรุณาติดตั้ง Node.js ก่อน"
    echo "ดาวน์โหลดได้ที่: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm ไม่ได้ติดตั้ง กรุณาติดตั้ง npm ก่อน"
    exit 1
fi

echo "✅ Node.js และ npm พร้อมใช้งาน"

# Install dependencies
echo "📦 กำลังติดตั้ง dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ ติดตั้ง dependencies สำเร็จ"
else
    echo "❌ การติดตั้ง dependencies ล้มเหลว"
    exit 1
fi

# Create startup script
echo "📝 กำลังสร้างไฟล์เริ่มต้น..."
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚗 กำลังเริ่มระบบจองที่จอดรถอัจฉริยะ..."
echo "🌐 เปิดเบราว์เซอร์ไปที่: http://localhost:3000"
echo "📱 สำหรับมือถือ: http://[IP_ADDRESS]:3000"
echo "⏹️  กด Ctrl+C เพื่อหยุดการทำงาน"
echo ""
npm start
EOF

chmod +x start.sh

# Create Windows batch file
cat > start.bat << 'EOF'
@echo off
echo 🚗 กำลังเริ่มระบบจองที่จอดรถอัจฉริยะ...
echo 🌐 เปิดเบราว์เซอร์ไปที่: http://localhost:3000
echo 📱 สำหรับมือถือ: http://[IP_ADDRESS]:3000
echo ⏹️  กด Ctrl+C เพื่อหยุดการทำงาน
echo.
npm start
EOF

echo "✅ สร้างไฟล์เริ่มต้นสำเร็จ"

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "🎉 การติดตั้งเสร็จสิ้น!"
echo ""
echo "📋 ข้อมูลสำคัญ:"
echo "   • เว็บไซต์: http://localhost:3000"
echo "   • IP Address: http://$LOCAL_IP:3000"
echo "   • ไฟล์เริ่มต้น: ./start.sh (Linux/Mac) หรือ start.bat (Windows)"
echo ""
echo "🔧 การตั้งค่า Arduino:"
echo "   • เปลี่ยน IP address ในโค้ด Arduino เป็น: $LOCAL_IP"
echo "   • ตั้งค่า WiFi SSID และ Password"
echo ""
echo "🚀 เริ่มใช้งาน:"
echo "   ./start.sh"
echo ""
echo "📚 ดูเอกสารเพิ่มเติมที่: README.md"


