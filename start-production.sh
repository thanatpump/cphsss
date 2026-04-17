#!/bin/bash

# Script สำหรับรันระบบ Production
# ใช้งาน: ./start-production.sh

echo "========================================"
echo "🚀 Starting SSO Production System"
echo "========================================"
echo ""

# ตรวจสอบว่ามี Node.js หรือไม่
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js ไม่ได้ติดตั้ง"
    echo "💡 ติดตั้ง Node.js จาก https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# ตรวจสอบว่ามี .env.local หรือไม่
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: ไม่พบไฟล์ .env.local"
    echo "💡 กำลังสร้างไฟล์ .env.local..."
    echo ""
    cat > .env.local << EOF
# NHSO API Configuration
NHSO_TOKEN=0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1

# Card Reader Service
CARD_READER_URL=http://localhost:8080

# Environment
NODE_ENV=production
EOF
    echo "✅ สร้างไฟล์ .env.local เรียบร้อย"
    echo ""
fi

# ตรวจสอบว่ามี node_modules หรือไม่
if [ ! -d node_modules ]; then
    echo "📦 กำลังติดตั้ง dependencies..."
    npm install
    echo ""
fi

# ตรวจสอบว่ามี .next หรือไม่ (ถ้าไม่มี ต้อง build)
if [ ! -d .next ]; then
    echo "🔨 กำลัง build โปรเจค..."
    npm run build
    echo ""
fi

# สร้าง log directory
mkdir -p logs

echo "========================================"
echo "🎴 Starting Card Reader Service..."
echo "========================================"
echo ""

# รัน Card Reader Service ใน background
node card-reader-service.js > logs/card-reader.log 2>&1 &
CARD_READER_PID=$!
echo "✅ Card Reader Service PID: $CARD_READER_PID"
echo "📝 Log: logs/card-reader.log"
echo ""

# รอ Card Reader Service พร้อม
sleep 3

echo "========================================"
echo "🌐 Starting SSO Main Service..."
echo "========================================"
echo ""

# รัน Main Service
npm start > logs/main.log 2>&1 &
MAIN_PID=$!
echo "✅ Main Service PID: $MAIN_PID"
echo "📝 Log: logs/main.log"
echo ""

# บันทึก PIDs
echo $CARD_READER_PID > .card-reader.pid
echo $MAIN_PID > .main.pid

sleep 3

echo "========================================"
echo "✅ System Started Successfully!"
echo "========================================"
echo ""
echo "🌐 Main Service:         http://localhost:3000"
echo "🎴 Card Reader Service:  http://localhost:8080"
echo ""
echo "📊 ตรวจสอบสถานะ:"
echo "   Main Service:         curl http://localhost:3000/api/db-info"
echo "   Card Reader Service:  curl http://localhost:8080/status"
echo ""
echo "📝 ดู Logs:"
echo "   Main:                 tail -f logs/main.log"
echo "   Card Reader:          tail -f logs/card-reader.log"
echo ""
echo "🛑 หยุดระบบ:"
echo "   ./stop-production.sh"
echo ""
echo "========================================"
echo ""
echo "💡 Tips:"
echo "   - เสียบเครื่องอ่านบัตรเข้า USB port"
echo "   - เปิด browser ไปที่ http://localhost:3000"
echo "   - เลือกเมนู 'ตรวจสอบข้อมูลการจัดสรรเงิน'"
echo "   - Login และทดสอบอ่านบัตร"
echo ""
echo "🎉 พร้อมใช้งาน!"
echo ""





