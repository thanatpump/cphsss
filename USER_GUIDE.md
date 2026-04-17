# คู่มือการใช้งานระบบตรวจสอบสิทธิ์และจัดสรรเงิน SSO

## 📋 สารบัญ

1. [ภาพรวมระบบ](#ภาพรวมระบบ)
2. [การติดตั้งและตั้งค่า](#การติดตั้งและตั้งค่า)
3. [การเชื่อมต่อกับ API สปสช](#การเชื่อมต่อกับ-api-สปสช)
4. [การเชื่อมต่อกับ Card Reader](#การเชื่อมต่อกับ-card-reader)
5. [ขั้นตอนการใช้งาน](#ขั้นตอนการใช้งาน)
6. [การแก้ไขปัญหา](#การแก้ไขปัญหา)

---

## 🎯 ภาพรวมระบบ

ระบบนี้ประกอบด้วย 3 ส่วนหลัก:

```
┌─────────────────────┐
│   Smart Card Reader │ ← อ่านบัตรประชาชน
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Card Reader Service│ ← Service อ่านบัตร (Port 8080)
│   (localhost:8080)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Next.js Frontend  │ ← หน้าเว็บ (/allocation-check)
│   (Port 3000)       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Next.js API       │ ← API Routes
│   (/api/nhso-check) │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│    API สปสช         │ ← เชื่อมต่อผ่าน HTTPS
│  (ucws.nhso.go.th)  │
└─────────────────────┘
```

---

## 🔧 การติดตั้งและตั้งค่า

### ขั้นตอนที่ 1: ติดตั้ง Dependencies

```bash
# ติดตั้ง packages ที่จำเป็น
npm install
```

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ในโฟลเดอร์หลักของโปรเจค:

```bash
# NHSO API Configuration
NHSO_TOKEN=your-token-here
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1

# Card Reader Service (ถ้าต้องการเปลี่ยน port)
CARD_READER_URL=http://localhost:8080
```

**หมายเหตุ:** 
- `NHSO_TOKEN` ต้องได้จากเจ้าหน้าที่ สปสช
- เก็บไฟล์ `.env.local` ให้ปลอดภัย (อย่า commit เข้า git)

### ขั้นตอนที่ 3: เริ่ม Development Server

```bash
npm run dev
```

ระบบจะรันที่ `http://localhost:3000`

---

## 🔌 การเชื่อมต่อกับ API สปสช

### 1. รับ Token จาก สปสช

ติดต่อเจ้าหน้าที่ สปสช เพื่อ:
- ขอ Token สำหรับ API
- รับเอกสาร API Specification
- รับ API URL ที่ถูกต้อง
- Whitelist IP Address ของ Server (ถ้าจำเป็น)

### 2. ตั้งค่า Token

ใส่ Token ในไฟล์ `.env.local`:

```bash
NHSO_TOKEN=0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed
```

### 3. ตรวจสอบการเชื่อมต่อ

ทดสอบการเชื่อมต่อผ่าน Browser:

```
http://localhost:3000/api/nhso-test?pid=1234567890123&hcode=11001
```

**ผลลัพธ์ที่คาดหวัง:**
- ✅ ถ้าเชื่อมต่อได้: จะเห็น response จาก API สปสช
- ❌ ถ้าเชื่อมต่อไม่ได้: จะเห็น error message

### 4. โครงสร้าง Request/Response

**Request:**
```json
POST /api/nhso-check
{
  "citizen_id": "1234567890123",
  "hcode": "11001"
}
```

**Response (สำเร็จ):**
```json
{
  "success": true,
  "data": {
    "citizen_id": "1234567890123",
    "patient_name": "นายสมชาย ใจดี",
    "main_right": {
      "code": "UCS",
      "name": "หลักประกันสุขภาพถ้วนหน้า (บัตรทอง)",
      "hospital_code": "11001",
      "hospital_name": "โรงพยาบาลชัยภูมิ",
      "expire_date": "2025-12-31"
    },
    "claim_info": {
      "total_allocated": 150000,
      "total_used": 45000,
      "remaining": 105000,
      "last_claim_date": "2025-01-10"
    }
  },
  "source": "nhso"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "ไม่สามารถเชื่อมต่อกับ API สปสช ได้: ..."
}
```

---

## 🎴 การเชื่อมต่อกับ Card Reader

### 1. ติดตั้ง Card Reader Service

#### สำหรับ Windows:
- Windows รองรับ Smart Card Reader โดยอัตโนมัติ
- เสียบเครื่องอ่านบัตรเข้ากับ USB
- ตรวจสอบใน Device Manager ว่าเห็นเครื่องอ่านบัตร

#### สำหรับ macOS:
```bash
# ติดตั้ง PC/SC Lite
brew install pcsc-lite

# ตรวจสอบว่าเห็นเครื่องอ่านบัตร
pcsctest
```

#### สำหรับ Linux:
```bash
# ติดตั้ง PC/SC Daemon
sudo apt-get install pcscd pcsc-tools  # Ubuntu/Debian
# หรือ
sudo yum install pcsc-lite pcsc-tools  # CentOS/RHEL

# เริ่ม service
sudo systemctl start pcscd
sudo systemctl enable pcscd

# ตรวจสอบ
pcsc_scan
```

### 2. ติดตั้ง Smart Card Library

```bash
# ติดตั้งใน card-reader-client directory
cd card-reader-client
npm install smartcard
```

### 3. เริ่ม Card Reader Service

```bash
# จากโฟลเดอร์ card-reader-client
node card-reader-service.js
```

**ผลลัพธ์:**
```
🎴 Card Reader Service running on http://localhost:8080
✅ พบ smartcard library
🎴 พบเครื่องอ่านบัตร: [ชื่อเครื่องอ่านบัตร]
```

### 4. ตรวจสอบสถานะ

ทดสอบผ่าน Browser:
```
http://localhost:8080/status
```

หรือผ่าน API ของระบบ:
```
http://localhost:3000/api/card-reader
(Method: GET)
```

---

## 📱 ขั้นตอนการใช้งาน

### 1. เข้าสู่ระบบ

1. เปิด Browser ไปที่ `http://localhost:3000`
2. คลิก "ตรวจสอบข้อมูลการจัดสรรเงิน"
3. ใส่ Username และ Password
4. คลิก "เข้าสู่ระบบ"

### 2. อ่านบัตรประชาชน

1. **เตรียมการ:**
   - ให้แน่ใจว่า Card Reader Service กำลังรันอยู่ (port 8080)
   - เสียบเครื่องอ่านบัตรเข้ากับคอมพิวเตอร์
   - ใส่บัตรประชาชนเข้าเครื่องอ่านบัตร

2. **อ่านบัตร:**
   - หน้าจอจะแสดงสถานะ "พร้อมใช้งาน"
   - คลิกปุ่ม "📖 อ่านบัตรประชาชนและเช็คสิทธิ์"
   - รอสักครู่ (2-5 วินาที)
   - ระบบจะอ่านข้อมูลจากบัตรอัตโนมัติ

3. **ผลลัพธ์:**
   - แสดงข้อมูลจากบัตรประชาชน:
     - เลขบัตรประชาชน
     - ชื่อ-นามสกุล
     - วันเกิด
     - ที่อยู่
     - วันหมดอายุบัตร

### 3. ตรวจสอบสิทธิ์กับ สปสช

หลังจากอ่านบัตรสำเร็จ ระบบจะ**อัตโนมัติ**ตรวจสอบสิทธิ์กับ สปสช:

1. **ระบบส่งข้อมูลไปยัง API สปสช:**
   - เลขบัตรประชาชน (PID)
   - รหัสโรงพยาบาล (HCODE)

2. **แสดงผลข้อมูลสิทธิ์:**
   - ✅ สิทธิ์การรักษาหลัก (UCS/SSS/OFC)
   - 🏥 หน่วยบริการประจำ
   - 💰 งบประมาณที่จัดสรร/ใช้ไป/คงเหลือ
   - 📋 สิทธิ์เสริม (ถ้ามี)

3. **การใช้งาน:**
   - คลิก "พิมพ์ใบรับรองสิทธิ์" เพื่อพิมพ์ข้อมูล
   - คลิก "ตรวจสอบคนใหม่" เพื่อเริ่มต้นใหม่

---

## 🔍 การตรวจสอบสถานะ

### 1. ตรวจสอบ Card Reader Service

**ดูใน Terminal ที่รัน Card Reader Service:**
```
✅ พบ smartcard library
🎴 พบเครื่องอ่านบัตร: [ชื่อเครื่อง]
```

**หรือผ่าน Browser:**
```
GET http://localhost:8080/status
```

### 2. ตรวจสอบ API สปสช

**ดูใน Terminal ที่รัน Next.js Server:**
```
🔄 กำลังเรียก NHSO API... { pid: 'xxx', hcode: '11001' }
✅ ได้รับข้อมูลจาก NHSO API: {...}
```

**หรือดูใน Browser Console (F12):**
- เปิด Developer Tools (F12)
- ไปที่ Tab "Console"
- ดู log เมื่อเรียกใช้ API

### 3. ตรวจสอบ Network

**ใน Browser Developer Tools:**
- ไปที่ Tab "Network"
- เรียกใช้ฟีเจอร์อ่านบัตร
- ดู Request/Response:
  - `/api/card-reader` - อ่านบัตร
  - `/api/nhso-check` - ตรวจสอบสิทธิ์

---

## 🛠️ การแก้ไขปัญหา

### ปัญหา: Card Reader Service ไม่ทำงาน

**สาเหตุที่เป็นไปได้:**
- ไม่ได้รัน Card Reader Service
- Port 8080 ถูกใช้งานแล้ว
- ไม่พบเครื่องอ่านบัตร

**วิธีแก้ไข:**
```bash
# 1. ตรวจสอบว่า Service รันอยู่หรือไม่
curl http://localhost:8080/status

# 2. ตรวจสอบ Port
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# 3. รัน Service ใหม่
cd card-reader-client
node card-reader-service.js
```

### ปัญหา: ไม่พบเครื่องอ่านบัตร

**สาเหตุที่เป็นไปได้:**
- เครื่องอ่านบัตรไม่เสียบ
- Driver ไม่ถูกต้อง
- ไม่ได้ติดตั้ง PC/SC

**วิธีแก้ไข:**
1. **ตรวจสอบการเชื่อมต่อ:**
   - เสียบ USB อีกครั้ง
   - ลองพอร์ต USB อื่น
   - Restart เครื่อง

2. **ตรวจสอบ Driver:**
   - Windows: ดูใน Device Manager
   - macOS: `system_profiler SPUSBDataType`
   - Linux: `lsusb` และ `pcsc_scan`

3. **ติดตั้ง Driver ใหม่:**
   - ดาวน์โหลดจากผู้ผลิตเครื่องอ่านบัตร
   - ติดตั้งตามคู่มือ

### ปัญหา: API สปสช ไม่ตอบกลับ

**สาเหตุที่เป็นไปได้:**
- Token หมดอายุหรือไม่ถูกต้อง
- API URL ผิด
- Network/Firewall บล็อก
- IP ไม่ได้ Whitelist

**วิธีแก้ไข:**
1. **ตรวจสอบ Token:**
   ```bash
   # ดูใน .env.local
   cat .env.local | grep NHSO_TOKEN
   ```

2. **ทดสอบการเชื่อมต่อ:**
   ```
   http://localhost:3000/api/nhso-test?pid=1234567890123&hcode=11001
   ```

3. **ตรวจสอบ Log:**
   - ดูใน Terminal ที่รัน Next.js
   - ดู Error Message ใน Browser Console

4. **ติดต่อ สปสช:**
   - ตรวจสอบ Token กับเจ้าหน้าที่
   - ขอ Whitelist IP Address
   - ตรวจสอบ API URL

### ปัญหา: อ่านบัตรไม่ได้         

**สาเหตุที่เป็นไปได้:**
- บัตรเสียบไม่ถูกทิศทาง
- บัตรสกปรกหรือเสียหาย
- เครื่องอ่านบัตรสกปรก

**วิธีแก้ไข:**
1. ตรวจสอบทิศทางบัตร (ต้องเสียบถูกด้าน)
2. ทำความสะอาดบัตร (ใช้ผ้านุ่มเช็ด)
3. ทำความสะอาดเครื่องอ่านบัตร
4. ลองบัตรอื่น

### ปัญหา: Timeout เมื่อเชื่อมต่อ API สปสช

**สาเหตุที่เป็นไปได้:**
- Network ช้า
- API สปสช ไม่ตอบกลับ
- Firewall บล็อก

**วิธีแก้ไข:**
1. ตรวจสอบ Network Connection
2. ลองอีกครั้ง (อาจเป็นปัญหาเฉพาะครั้ง)
3. ตรวจสอบ Firewall Rules
4. ติดต่อเจ้าหน้าที่ สปสช

---

## 📞 ติดต่อ Support

### สำหรับ API สปสช:
- Email: support@nhso.go.th
- Website: https://www.nhso.go.th

### สำหรับ Card Reader:
- ตรวจสอบคู่มือเครื่องอ่านบัตร
- ติดต่อผู้ผลิตเครื่องอ่านบัตร

---

## ⚠️ หมายเหตุสำคัญ

1. **ข้อมูลส่วนบุคคล:**
   - ข้อมูลบัตรประชาชนเป็นข้อมูลส่วนบุคคล
   - ต้องปฏิบัติตาม PDPA
   - ใช้ HTTPS ใน Production

2. **Security:**
   - เก็บ `.env.local` ให้ปลอดภัย
   - อย่า commit Token เข้า Git
   - ใช้ Environment Variables ใน Production

3. **Production:**
   - ต้องมี Token ที่ถูกต้อง
   - ต้องเชื่อมต่อกับ API สปสช ได้
   - ต้องมี Card Reader Service ที่ทำงานได้

---

## 📚 เอกสารเพิ่มเติม

- `README.md` - ภาพรวมระบบ
- `NHSO_SETUP.md` - รายละเอียดการตั้งค่า API สปสช
- `CARD_READER_GUIDE.md` - คู่มือเครื่องอ่านบัตร
- `NHSO_CONNECTION_STATUS.md` - สถานะการเชื่อมต่อ

---

**อัปเดตล่าสุด:** 2025-01-24

