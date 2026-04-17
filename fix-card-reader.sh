#!/bin/bash

# Script แก้ปัญหาเครื่องอ่านบัตร
# สำหรับ Ubuntu/Debian

echo "========================================"
echo "🔧 Card Reader Troubleshooting"
echo "========================================"
echo ""

# ตรวจสอบ OS
echo "1️⃣ ตรวจสอบ OS..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "   OS: $NAME $VERSION"
else
    echo "   OS: $(uname -s)"
fi
echo ""

# ตรวจสอบ USB devices
echo "2️⃣ ตรวจสอบ USB devices..."
if command -v lsusb &> /dev/null; then
    echo "   USB Devices:"
    lsusb | grep -i "smart\|card\|reader\|acr" || echo "   ⚠️  ไม่พบเครื่องอ่านบัตร"
else
    echo "   ⚠️  lsusb command not found"
fi
echo ""

# ตรวจสอบ pcscd
echo "3️⃣ ตรวจสอบ PCSC Service..."
if command -v pcscd &> /dev/null; then
    echo "   ✅ pcscd ติดตั้งแล้ว"
    
    # ตรวจสอบสถานะ
    if systemctl is-active --quiet pcscd; then
        echo "   ✅ pcscd กำลังทำงาน"
    else
        echo "   ⚠️  pcscd ไม่ทำงาน - กำลัง start..."
        sudo systemctl start pcscd
        sudo systemctl enable pcscd
        echo "   ✅ pcscd started"
    fi
else
    echo "   ❌ pcscd ยังไม่ได้ติดตั้ง"
    echo ""
    echo "   กำลังติดตั้ง pcscd..."
    
    # ติดตั้งตาม OS
    if [ -f /etc/debian_version ]; then
        sudo apt update
        sudo apt install -y pcscd pcsc-tools
    elif [ -f /etc/redhat-release ]; then
        sudo yum install -y pcsc-lite pcsc-tools
    else
        echo "   ⚠️  ไม่รู้จัก OS - กรุณาติดตั้ง pcscd เองด้วย:"
        echo "      Ubuntu/Debian: sudo apt install pcscd pcsc-tools"
        echo "      CentOS/RHEL:   sudo yum install pcsc-lite pcsc-tools"
        exit 1
    fi
    
    # Start service
    sudo systemctl start pcscd
    sudo systemctl enable pcscd
    echo "   ✅ pcscd ติดตั้งและเริ่มต้นแล้ว"
fi
echo ""

# ทดสอบด้วย pcsc_scan
echo "4️⃣ ทดสอบการอ่านบัตร..."
if command -v pcsc_scan &> /dev/null; then
    echo "   กำลังสแกน... (รอ 3 วินาที)"
    timeout 3 pcsc_scan 2>/dev/null || true
else
    echo "   ⚠️  pcsc_scan not found"
fi
echo ""

# ตรวจสอบ Node.js
echo "5️⃣ ตรวจสอบ Node.js..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js: $(node --version)"
else
    echo "   ❌ Node.js ยังไม่ได้ติดตั้ง"
    exit 1
fi
echo ""

# ตรวจสอบว่ามี card-reader-service.js
echo "6️⃣ ตรวจสอบ Card Reader Service..."
if [ -f card-reader-service.js ]; then
    echo "   ✅ พบไฟล์ card-reader-service.js"
    
    # ตรวจสอบว่ากำลังรันอยู่ไหม
    if pgrep -f "card-reader-service.js" > /dev/null; then
        echo "   ✅ Card Reader Service กำลังทำงาน"
        PID=$(pgrep -f "card-reader-service.js")
        echo "   PID: $PID"
    else
        echo "   ⚠️  Card Reader Service ไม่ได้รัน"
        echo ""
        echo "   กำลังเริ่ม Card Reader Service..."
        
        # รันใน background
        nohup node card-reader-service.js > logs/card-reader.log 2>&1 &
        sleep 2
        
        if pgrep -f "card-reader-service.js" > /dev/null; then
            echo "   ✅ Card Reader Service เริ่มต้นแล้ว"
            PID=$(pgrep -f "card-reader-service.js")
            echo "   PID: $PID"
        else
            echo "   ❌ ไม่สามารถเริ่ม Card Reader Service ได้"
            echo "   ดู log: tail -f logs/card-reader.log"
        fi
    fi
else
    echo "   ❌ ไม่พบไฟล์ card-reader-service.js"
    exit 1
fi
echo ""

# ทดสอบ Card Reader Service
echo "7️⃣ ทดสอบ Card Reader Service..."
sleep 2
if curl -s http://localhost:8080/status > /dev/null 2>&1; then
    echo "   ✅ Card Reader Service ตอบกลับ"
    echo ""
    curl -s http://localhost:8080/status | python3 -m json.tool 2>/dev/null || curl -s http://localhost:8080/status
else
    echo "   ❌ Card Reader Service ไม่ตอบกลับ"
    echo "   ตรวจสอบ log: tail -f logs/card-reader.log"
fi
echo ""

echo "========================================"
echo "✅ เสร็จสิ้น!"
echo "========================================"
echo ""
echo "📝 สรุป:"
echo "   1. ตรวจสอบว่าเครื่องอ่านบัตรเสียบอยู่"
echo "   2. PCSC Service ต้องทำงาน"
echo "   3. Card Reader Service ต้องรันที่ port 8080"
echo "   4. เปิด browser: http://localhost:3000"
echo ""
echo "🔍 ตรวจสอบเพิ่มเติม:"
echo "   Status:    curl http://localhost:8080/status"
echo "   Logs:      tail -f logs/card-reader.log"
echo "   Processes: ps aux | grep card-reader"
echo ""




