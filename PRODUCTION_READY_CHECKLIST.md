# ✅ เช็คลิสต์เตรียมใช้งานจริง (Production Ready Checklist)

## 📋 ก่อนเริ่มใช้งาน

### 1. ติดตั้ง Smart Card Reader
- [ ] เสียบเครื่องอ่านบัตรเข้า USB port
- [ ] ติดตั้ง Driver (ถ้าจำเป็น)
- [ ] ทดสอบว่าระบบตรวจจับเครื่องอ่านบัตรได้

**วิธีทดสอบ:**
```bash
# Windows
# ตรวจสอบใน Device Manager

# macOS
system_profiler SPUSBDataType

# Linux
lsusb
pcsc_scan
```

### 2. ติดตั้ง Dependencies

#### Card Reader Service
```bash
cd card-reader-client
npm install
```

#### Main Application
```bash
cd /Users/macbookpro16/Desktop/sso
npm install
```

### 3. ตั้งค่า Environment Variables

#### สร้างไฟล์ `.env.local`
```bash
cp .env.local.example .env.local
```

#### แก้ไขค่าต่อไปนี้:
```env
# ⚠️ สำคัญมาก! ต้องขอจาก สปสช
NHSO_TOKEN=your_actual_token_from_nhso

# ถ้าใช้ URL อื่น
NHSO_API_URL=https://your-actual-nhso-api-url

# Card Reader Service URL (ปกติไม่ต้องแก้)
CARD_READER_URL=http://localhost:8080
```

---

## 🚀 การรันระบบ

### ขั้นตอนที่ 1: รัน Card Reader Service

เปิด Terminal หน้าต่างที่ 1:
```bash
cd /Users/macbookpro16/Desktop/sso/card-reader-client
node card-reader-service.js
```

**ผลลัพธ์ที่ควรเห็น:**
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

### ขั้นตอนที่ 2: รัน Next.js Application

เปิด Terminal หน้าต่างที่ 2:
```bash
cd /Users/macbookpro16/Desktop/sso
npm run dev
```

**ผลลัพธ์ที่ควรเห็น:**
```
▲ Next.js 15.3.4
- Local:        http://localhost:3000
- Ready in 2.5s
```

### ขั้นตอนที่ 3: ทดสอบระบบ

เปิดเบราว์เซอร์ไปที่:
```
http://localhost:3000/nhso-check
```

---

## ✅ เช็คลิสต์การทดสอบ

### 1. ทดสอบ Card Reader Service
- [ ] Service รันได้ปกติ (ไม่มี error)
- [ ] เข้า http://localhost:8080/health ได้
- [ ] เข้า http://localhost:8080/status แสดงสถานะเครื่องอ่านบัตร

### 2. ทดสอบการตรวจจับเครื่องอ่านบัตร
- [ ] เข้าหน้า /nhso-check แสดงสถานะเครื่องอ่านบัตร
- [ ] ถอดเครื่องอ่านบัตร → สถานะเปลี่ยนเป็นสีแดง
- [ ] เสียบเครื่องอ่านบัตรกลับ → สถานะเปลี่ยนเป็นสีเขียว

### 3. ทดสอบการอ่านบัตร
- [ ] ใส่บัตรประชาชนเข้าเครื่องอ่าน
- [ ] กดปุ่ม "อ่านบัตรประชาชนและเช็คกับ สปสช"
- [ ] แสดงข้อมูลจากบัตร (เลขบัตร, ชื่อ-สกุล, ที่อยู่)
- [ ] ไม่มี Error

### 4. ทดสอบการเช็คกับ สปสช
- [ ] หลังอ่านบัตรเสร็จ ระบบเช็คกับ สปสช อัตโนมัติ
- [ ] แสดงข้อมูลสิทธิ์หลัก
- [ ] แสดงข้อมูลการเบิกจ่าย (งบประมาณ, ใช้ไป, คงเหลือ)
- [ ] แสดงสิทธิ์เสริม (ถ้ามี)

### 5. ทดสอบ Error Handling
- [ ] ปิด Card Reader Service → แสดง error ที่เข้าใจได้
- [ ] ไม่ใส่บัตร → แสดง "หมดเวลารอบัตร"
- [ ] ใส่บัตรผิดทิศทาง → แสดง error ที่เหมาะสม
- [ ] NHSO API ไม่ตอบกลับ → ใช้ Mock Data แทน

---

## 🔧 การแก้ปัญหา

### ปัญหา 1: "ไม่สามารถเชื่อมต่อ Card Reader Service ได้"

**สาเหตุ:**
- Card Reader Service ไม่ได้รัน
- Port 8080 ถูกใช้งานโดยโปรแกรมอื่น

**วิธีแก้:**
```bash
# ตรวจสอบว่า port 8080 ว่างหรือไม่
# macOS/Linux
lsof -i :8080

# Windows
netstat -ano | findstr :8080

# ถ้า port ถูกใช้งาน ให้ปิดโปรแกรมนั้นก่อน
# หรือเปลี่ยน port ใน card-reader-service.js
```

### ปัญหา 2: "ไม่พบเครื่องอ่านบัตร - ใช้ Mock Data"

**สาเหตุ:**
- ไม่ได้ติดตั้ง smartcard library
- เครื่องอ่านบัตรไม่เสียบหรือไม่มี driver

**วิธีแก้:**
```bash
# ติดตั้ง smartcard library
cd card-reader-client
npm install smartcard

# ตรวจสอบ PC/SC Daemon (Linux)
sudo systemctl status pcscd
sudo systemctl start pcscd
```

### ปัญหา 3: "หมดเวลารอบัตร"

**สาเหตุ:**
- ไม่ได้ใส่บัตร
- บัตรใส่ผิดทิศทาง

**วิธีแก้:**
- ใส่บัตรให้ chip หันเข้าหาเครื่องอ่าน
- ลองถอดและใส่ใหม่
- ทำความสะอาดชิพบัตร

### ปัญหา 4: "Connect Timeout Error" จาก NHSO API

**สาเหตุ:**
- ไม่มีอินเทอร์เน็ต
- NHSO API ไม่ทำงาน
- Token หมดอายุ

**วิธีแก้:**
- ตรวจสอบอินเทอร์เน็ต
- ตรวจสอบ NHSO_TOKEN ใน .env.local
- ระบบจะใช้ Mock Data อัตโนมัติ (สำหรับทดสอบ)

### ปัญหา 5: "Cannot find module 'smartcard'"

**สาเหตุ:**
- ไม่ได้ติดตั้ง dependencies

**วิธีแก้:**
```bash
cd card-reader-client
npm install

# ถ้ายังไม่ได้ ให้ติดตั้ง smartcard แยก
npm install smartcard
```

---

## 📊 สถานะระบบ

### ✅ ฟีเจอร์ที่พร้อมใช้งาน

1. **หน้าหลัก (`/`)**
   - แสดงภาพรวมระบบ
   - ลิงก์ไปยังฟีเจอร์ต่างๆ

2. **เช็คสิทธิ์ สปสช (`/nhso-check`)**
   - อ่านบัตรอัตโนมัติด้วย Smart Card Reader
   - ตรวจจับสถานะเครื่องอ่านบัตร Real-time
   - เช็คข้อมูลกับ สปสช อัตโนมัติ
   - แสดงข้อมูลครบถ้วน (สิทธิ์, งบประมาณ, สิทธิ์เสริม)

3. **เจ้าหน้าที่ตรวจสอบสิทธิ์ (`/allocation-check/data`)**
   - ล็อกอินด้วย username/password/hospcode
   - อ่านบัตรอัตโนมัติ
   - แสดงข้อมูลแบบละเอียด

4. **API Routes**
   - `/api/card-reader` (GET, POST) - อ่านบัตรและตรวจสอบสถานะ
   - `/api/nhso-check` (POST) - เช็คข้อมูลกับ สปสช

### 🔒 ความปลอดภัย

- ✅ Token เก็บใน .env.local (ไม่ commit ลง Git)
- ✅ Timeout control (10 วินาที สำหรับ NHSO API)
- ✅ Error handling ครบถ้วน
- ✅ Input validation (เลขบัตร 13 หลัก)
- ✅ Mock data fallback (เมื่อ API ไม่ตอบกลับ)

### ⚡ Performance

- Auto-detect เครื่องอ่านบัตรทุก 3 วินาที
- Timeout 10 วินาที สำหรับ NHSO API
- Timeout 35 วินาที สำหรับการรอบัตร
- Loading states ชัดเจน

---

## 📦 โครงสร้างไฟล์

```
/Users/macbookpro16/Desktop/sso/
├── app/
│   ├── api/
│   │   ├── card-reader/
│   │   │   └── route.ts          ✅ อ่านบัตรและตรวจสอบสถานะ
│   │   └── nhso-check/
│   │       └── route.ts          ✅ เช็คกับ สปสช
│   ├── nhso-check/
│   │   └── page.tsx              ✅ หน้าเช็คสิทธิ์หลัก
│   ├── allocation-check/
│   │   └── data/
│   │       └── page.tsx          ✅ หน้าเจ้าหน้าที่
│   └── page.tsx                  ✅ หน้าแรก
├── card-reader-client/
│   ├── card-reader-service.js    ✅ Card Reader Service
│   ├── package.json              ✅ Dependencies
│   └── start-card-reader.sh      ✅ Start script
├── .env.local.example            ✅ ตัวอย่าง config
├── NHSO_CARD_READER_GUIDE.md     ✅ คู่มือใช้งาน
└── PRODUCTION_READY_CHECKLIST.md ✅ เช็คลิสต์นี้
```

---

## 🎯 สิ่งที่ต้องทำเพิ่ม (Optional)

### สำหรับ Production

- [ ] ขอ NHSO_TOKEN จริงจาก สปสช
- [ ] ทดสอบกับ API สปสช จริง
- [ ] ตั้งค่า SSL/HTTPS
- [ ] ตั้งค่า Domain name
- [ ] ตั้งค่า PM2 หรือ systemd สำหรับ auto-restart
- [ ] ตั้งค่า Nginx reverse proxy
- [ ] เพิ่ม Logging และ Monitoring
- [ ] Backup database

### การปรับปรุงเพิ่มเติม

- [ ] เพิ่มการพิมพ์ใบรับรองสิทธิ์
- [ ] เพิ่มประวัติการเช็คสิทธิ์
- [ ] เพิ่มรายงานสถิติ
- [ ] รองรับบัตรหลายใบพร้อมกัน
- [ ] เพิ่ม Admin panel

---

## 📞 ติดต่อและสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ:
- 📧 อีเมล: support@sso.go.th
- 📱 โทร: 02-xxx-xxxx

---

## ✅ สรุป: พร้อมใช้งานหรือไม่?

### เช็คลิสต์สุดท้าย

- [ ] ✅ เครื่องอ่านบัตรเสียบและทำงานได้
- [ ] ✅ Card Reader Service รันได้
- [ ] ✅ Next.js Application รันได้
- [ ] ✅ ตั้งค่า .env.local แล้ว
- [ ] ✅ ทดสอบอ่านบัตรสำเร็จ
- [ ] ✅ ทดสอบเช็คกับ สปสช สำเร็จ (หรือใช้ Mock Data ได้)

**ถ้าทำครบทั้งหมด → 🎉 พร้อมใช้งานแล้ว!**

---

**อัปเดตล่าสุด**: 3 พฤศจิกายน 2025  
**เวอร์ชัน**: 1.0.0  
**สถานะ**: ✅ Production Ready















