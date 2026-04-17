# 🖥️ คู่มือติดตั้งสำหรับเครื่อง Client

## สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────┐
│  Cloud Server                        │
│  - SSO Main Service (port 3000)     │
│  - NHSO API Integration             │
│  IP: your-server-ip                 │
└─────────────────────────────────────┘
              ↕ Internet
┌─────────────────────────────────────┐
│  เครื่อง Client (เครื่องผู้ใช้งาน)  │
│  1. เปิด Browser                    │
│     → http://server-ip:3000         │
│  2. Card Reader Service             │
│     → localhost:8080                │
│  3. เสียบเครื่องอ่านบัตร 🎴        │
└─────────────────────────────────────┘
```

---

## 📋 สิ่งที่ต้องทำบนเครื่อง Client แต่ละเครื่อง

### ความต้องการ:
- ✅ Windows 10/11 หรือ macOS หรือ Linux
- ✅ Node.js 18+ ติดตั้งแล้ว
- ✅ เครื่องอ่านบัตรประชาชน (Smart Card Reader)
- ✅ Internet connection

---

## 🚀 ขั้นตอนติดตั้ง

### ขั้นตอนที่ 1: ติดตั้ง Node.js (ถ้ายังไม่มี)

**Windows:**
1. ดาวน์โหลดจาก https://nodejs.org/
2. เลือก LTS version
3. ติดตั้งตามปกติ

**macOS:**
```bash
brew install node
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

ตรวจสอบ:
```bash
node --version
# ควรได้ v18.x หรือสูงกว่า
```

---

### ขั้นตอนที่ 2: ติดตั้ง Smart Card Driver

**Windows:**
- เสียบเครื่องอ่านบัตร USB
- Windows จะติดตั้ง driver อัตโนมัติ
- ตรวจสอบใน Device Manager → Smart Card Readers

**macOS:**
```bash
brew install pcsc-lite
```

**Linux:**
```bash
sudo apt install pcscd pcsc-tools
sudo systemctl start pcscd
sudo systemctl enable pcscd
```

---

### ขั้นตอนที่ 3: ดาวน์โหลดไฟล์ Card Reader Service

สร้างไฟล์ `card-reader-service.js` (copy จาก server หรือสร้างใหม่):

```javascript
// เนื้อหาไฟล์เหมือนกับที่มีใน server
// หรือดาวน์โหลดจาก http://server-ip:3000/card-reader-service.js
```

**หรือดาวน์โหลดแบบง่าย:**
```bash
# สร้าง folder
mkdir card-reader
cd card-reader

# ดาวน์โหลดไฟล์ (ถ้า server เปิดให้)
# curl http://server-ip:3000/card-reader-service.js > card-reader-service.js

# หรือ copy จาก USB/Email
```

---

### ขั้นตอนที่ 4: ติดตั้ง Dependencies

```bash
cd card-reader

# ติดตั้ง express และ cors
npm init -y
npm install express cors

# (Optional) ติดตั้ง smartcard library สำหรับอ่านบัตรจริง
# npm install smartcard
```

---

### ขั้นตอนที่ 5: รัน Card Reader Service

```bash
# รันแบบปกติ
node card-reader-service.js

# หรือรันแบบ background (Windows)
start /B node card-reader-service.js

# หรือรันแบบ background (macOS/Linux)
nohup node card-reader-service.js > card-reader.log 2>&1 &
```

คุณควรเห็น:
```
============================================================
🎴 Card Reader Service
============================================================
✅ Server running on http://localhost:8080
🔍 Status: http://localhost:8080/status
💚 Health: http://localhost:8080/health
============================================================

🔍 กำลังรอเครื่องอ่านบัตร...
📌 เสียบเครื่องอ่านบัตรเข้า USB port
```

---

### ขั้นตอนที่ 6: ทดสอบ Card Reader Service

เปิด browser อีก tab:
```
http://localhost:8080/status
```

ควรเห็น:
```json
{
  "success": true,
  "status": "connected",
  "message": "เครื่องอ่านบัตรพร้อมใช้งาน"
}
```

---

### ขั้นตอนที่ 7: เปิดระบบหลัก

เปิด browser:
```
http://your-server-ip:3000
```

1. คลิก "ตรวจสอบข้อมูลการจัดสรรเงิน"
2. Login เข้าระบบ
3. ใส่บัตรประชาชนเข้าเครื่องอ่าน
4. กดปุ่ม "เสียบบัตรและอ่านข้อมูล"

**ระบบจะทำงาน:**
```
Client (เครื่องคุณ)
  ↓ อ่านบัตรจาก localhost:8080
  ↓ ได้เลขบัตร 13 หลัก
  ↓ ส่งไปยัง Server
Server (Cloud)
  ↓ เรียก NHSO API
  ↓ ได้ข้อมูลสิทธิ์
  ↓ ส่งกลับมา Client
Client
  ↓ แสดงผลบนหน้าจอ ✅
```

---

## 🔧 Troubleshooting

### ปัญหา: "ไม่สามารถเชื่อมต่อ Card Reader Service"

**แก้ไข:**
```bash
# 1. ตรวจสอบว่า Card Reader Service รันอยู่
# Windows: Task Manager → node.exe
# macOS/Linux: ps aux | grep card-reader

# 2. ถ้าไม่รัน ให้รันใหม่
node card-reader-service.js

# 3. ทดสอบ
curl http://localhost:8080/status
```

### ปัญหา: "ไม่พบเครื่องอ่านบัตร"

**แก้ไข:**
1. ตรวจสอบว่าเสียบ USB แล้ว
2. ตรวจสอบ Device Manager (Windows)
3. Restart Card Reader Service
4. ลองถอดแล้วเสียบใหม่

### ปัญหา: "หมดเวลารอบัตร"

**แก้ไข:**
1. ตรวจสอบว่าใส่บัตรแล้ว
2. ตรวจสอบว่าใส่บัตรถูกทิศทาง
3. ทำความสะอาดบัตร
4. ทดสอบกดอ่านบัตรใหม่

---

## 📝 สคริปต์เริ่มอัตโนมัติ

### สำหรับ Windows (start-card-reader.bat)

```batch
@echo off
echo Starting Card Reader Service...
cd /d "%~dp0"
start /B node card-reader-service.js
echo Card Reader Service started!
echo Open http://localhost:8080/status to check
pause
```

### สำหรับ macOS/Linux (start-card-reader.sh)

```bash
#!/bin/bash
echo "Starting Card Reader Service..."
cd "$(dirname "$0")"
nohup node card-reader-service.js > card-reader.log 2>&1 &
echo "Card Reader Service started!"
echo "PID: $!"
echo "Open http://localhost:8080/status to check"
```

---

## 🎯 สรุป Quick Start

```bash
# 1. ติดตั้ง Node.js
# 2. เสียบเครื่องอ่านบัตร
# 3. รัน Card Reader Service
node card-reader-service.js

# 4. เปิด browser
http://your-server-ip:3000

# 5. ทดสอบอ่านบัตร
```

---

## 📞 ติดต่อสอบถาม

หากมีปัญหา:
1. เช็ค http://localhost:8080/status
2. ดู log ของ Card Reader Service
3. ติดต่อผู้ดูแลระบบ

---

**หมายเหตุ:** ทุกเครื่องที่ต้องการใช้งานระบบ ต้องติดตั้ง Card Reader Service และเสียบเครื่องอ่านบัตร




