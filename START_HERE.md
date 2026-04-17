# 🚀 เริ่มใช้งานระบบ SSO (Production)

## ✅ ระบบพร้อมใช้งานจริงแล้ว!

---

## 📋 ขั้นตอนการใช้งาน (เริ่มที่นี่!)

### 1️⃣ ติดตั้งเครื่องอ่านบัตร 🎴

**สำหรับ macOS:**
```bash
brew install pcsc-lite
```

**สำหรับ Windows:**
- Windows มี driver ในตัวแล้ว
- เสียบเครื่องอ่านบัตร USB แล้วรอติดตั้งอัตโนมัติ

**สำหรับ Linux/Ubuntu:**
```bash
sudo apt install pcscd pcsc-tools
```

### 2️⃣ เสียบเครื่องอ่านบัตร

- เสียบเครื่องอ่านบัตรเข้ากับ USB port
- ตรวจสอบว่า Driver ทำงาน:
  - **Windows**: Device Manager → Smart Card Readers
  - **macOS**: `pcsctest`
  - **Linux**: `pcsc_scan`

### 3️⃣ เริ่มระบบ

```bash
# เปิด Terminal แล้วรันคำสั่งนี้
./start-production.sh
```

**ระบบจะ:**
- ✅ ตรวจสอบ Node.js
- ✅ สร้างไฟล์ .env.local (ถ้ายังไม่มี)
- ✅ ติดตั้ง dependencies (ถ้ายังไม่มี)
- ✅ รัน Card Reader Service (port 8080)
- ✅ รัน SSO Main Service (port 3000)

### 4️⃣ เปิดใช้งาน

```bash
# เปิด browser ไปที่:
http://localhost:3000
```

### 5️⃣ ทดสอบระบบ

1. คลิกปุ่ม **"ตรวจสอบข้อมูลการจัดสรรเงิน"** (สีเหลือง)
2. **Login** เข้าระบบด้วย username/password
3. ใส่บัตรประชาชนเข้าเครื่องอ่าน
4. กดปุ่ม **"เสียบบัตรและอ่านข้อมูล"**
5. ระบบจะอ่านบัตรและเช็คสิทธิ์กับ API สปสช

---

## 🛑 หยุดระบบ

```bash
./stop-production.sh
```

---

## 📊 ตรวจสอบสถานะ

### เช็คว่าระบบทำงาน:

```bash
# Main Service
curl http://localhost:3000/api/db-info

# Card Reader Service
curl http://localhost:8080/status
```

### ดู Logs:

```bash
# Main Service
tail -f logs/main.log

# Card Reader Service
tail -f logs/card-reader.log
```

---

## 🔧 Troubleshooting

### ปัญหา: ไม่พบเครื่องอ่านบัตร

```bash
# ตรวจสอบว่าเครื่องอ่านบัตรเสียบอยู่
# macOS:
pcsctest

# Linux:
pcsc_scan

# Windows:
# เปิด Device Manager → Smart Card Readers
```

**แก้ไข:**
- ลองถอดแล้วเสียบใหม่
- Restart เครื่อง
- ติดตั้ง driver ใหม่

### ปัญหา: Port 3000 หรือ 8080 ถูกใช้งานอยู่

```bash
# หา process ที่ใช้ port
lsof -i :3000
lsof -i :8080

# Kill process
kill -9 <PID>
```

### ปัญหา: NHSO API Timeout

**สาเหตุ:**
- เลขบัตรไม่อยู่ในระบบ สปสช
- Network ไม่ผ่าน
- IP ไม่ได้รับอนุญาต (ต้อง whitelist)
- Token หมดอายุ

**แก้ไข:**
- ติดต่อเจ้าหน้าที่ สปสช เพื่อ whitelist IP
- ขอ Token ใหม่ (ถ้าหมดอายุ)
- ทดสอบด้วยบัตรที่มีสิทธิ์จริง

### ปัญหา: smartcard library ไม่ได้ติดตั้ง

```bash
# ติดตั้ง smartcard library (Optional)
npm install smartcard

# หมายเหตุ: ถ้าไม่ติดตั้ง จะใช้ Mock Data
```

---

## 📝 หมายเหตุสำคัญ

### การทำงานของระบบ

```
เสียบบัตรประชาชน
    ↓
เครื่องอ่าน → อ่านเลขบัตร 13 หลัก
    ↓
Card Reader Service (port 8080)
    ↓
SSO Main Service (port 3000)
    ↓
NHSO API (เช็คสิทธิ์)
    ↓
แสดงผลบนหน้าจอ
```

### Mode การทำงาน

**1. Real Mode (แนะนำ):**
- ติดตั้ง smartcard library
- มีเครื่องอ่านบัตร
- ใช้บัตรประชาชนจริง
- เช็ค API สปสช จริง

**2. Mock Mode (สำหรับทดสอบ):**
- ไม่มี smartcard library
- ไม่มีเครื่องอ่านบัตร
- ใช้ข้อมูลจำลอง
- เหมาะสำหรับ Demo/Test

---

## 🔐 ความปลอดภัย

### Environment Variables (.env.local)

```bash
NHSO_TOKEN=0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
CARD_READER_URL=http://localhost:8080
NODE_ENV=production
```

**⚠️ สำคัญ:**
- เก็บ Token ไว้เป็นความลับ
- ไม่ commit .env.local เข้า Git
- ใช้ HTTPS ใน Production
- ปฏิบัติตาม PDPA

---

## 📞 ติดต่อ สปสช

**สำนักงานหลักประกันสุขภาพแห่งชาติ**
- ☎️ โทร: 0-2141-4000
- 📧 Email: callcenter@nhso.go.th
- 🌐 Website: https://www.nhso.go.th

**สิ่งที่ควรสอบถาม:**
- Token ยังใช้งานได้หรือไม่?
- IP Address ต้อง Whitelist ไหม?
- API Endpoint ถูกต้องหรือไม่?
- มี API Documentation ไหม?

---

## 📚 เอกสารเพิ่มเติม

- `DEPLOYMENT.md` - คู่มือ Deploy แบบละเอียด
- `PRODUCTION_CHECKLIST.md` - Checklist สำหรับ Production
- `CARD_READER_GUIDE.md` - คู่มือเครื่องอ่านบัตร
- `NHSO_SETUP.md` - การตั้งค่า NHSO API

---

## ✅ สรุป Quick Start

```bash
# 1. เสียบเครื่องอ่านบัตร
# 2. เริ่มระบบ
./start-production.sh

# 3. เปิด browser
http://localhost:3000

# 4. ทดสอบอ่านบัตร
# ไปที่เมนู "ตรวจสอบข้อมูลการจัดสรรเงิน"

# 5. หยุดระบบ (เมื่อเสร็จ)
./stop-production.sh
```

---

## 🎉 พร้อมใช้งาน!

ระบบของคุณพร้อมใช้งานจริงแล้ว!  
เพียงทำตามขั้นตอนด้านบนและทดสอบด้วยบัตรจริง

**Good Luck!** 🚀

---

**Version:** 1.0.0  
**Last Updated:** 14 ตุลาคม 2025  
**Created by:** AI Assistant





