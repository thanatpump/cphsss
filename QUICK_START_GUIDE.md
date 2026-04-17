# คู่มือเริ่มต้นใช้งานอย่างรวดเร็ว

## 🚀 ขั้นตอนการเริ่มต้นใช้งาน

### 1. ติดตั้งและตั้งค่า (ครั้งแรก)

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้างไฟล์ .env.local
cat > .env.local << EOF
NHSO_TOKEN=your-token-from-nhso
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
CARD_READER_URL=http://localhost:8080
EOF

# 3. เริ่ม Next.js Server
npm run dev
```

### 2. เริ่ม Card Reader Service (Terminal ใหม่)

```bash
# สำหรับ Windows
cd card-reader-client
node card-reader-service.js

# สำหรับ macOS/Linux (ต้องติดตั้ง pcsc-lite ก่อน)
brew install pcsc-lite  # macOS
# หรือ
sudo apt-get install pcscd  # Linux
node card-reader-service.js
```

### 3. ใช้งาน

1. เปิด Browser: `http://localhost:3000`
2. คลิก "ตรวจสอบข้อมูลการจัดสรรเงิน"
3. Login เข้าระบบ
4. เสียบบัตรประชาชนเข้าเครื่องอ่านบัตร
5. คลิก "อ่านบัตรประชาชนและเช็คสิทธิ์"
6. ระบบจะแสดงข้อมูลสิทธิ์จาก สปสช อัตโนมัติ

---

## 📊 โครงสร้างการเชื่อมต่อ (ภาพรวม)

```
┌─────────────────────────────────────────────────────────────┐
│                     ขั้นตอนการใช้งาน                          │
└─────────────────────────────────────────────────────────────┘

1. ผู้ใช้ใส่บัตรประชาชนเข้าเครื่องอ่านบัตร
   ↓
2. คลิกปุ่ม "อ่านบัตรประชาชนและเช็คสิทธิ์"
   ↓
3. Frontend ส่ง Request ไปยัง /api/card-reader
   ↓
4. API เรียก Card Reader Service (localhost:8080)
   ↓
5. Card Reader Service อ่านข้อมูลจากบัตร
   ↓
6. ส่งข้อมูลบัตรกลับมา (เลขบัตรประชาชน, ชื่อ, ฯลฯ)
   ↓
7. Frontend ส่ง Request ไปยัง /api/nhso-check
   ├─→ ส่ง: citizen_id, hcode
   ↓
8. API เชื่อมต่อกับ API สปสช (HTTPS)
   ├─→ ส่ง: pid, hcode, correlationId, date_visit
   ↓
9. API สปสช ส่งข้อมูลสิทธิ์กลับมา
   ↓
10. Frontend แสดงผลข้อมูลสิทธิ์:
    - สิทธิ์การรักษาหลัก
    - งบประมาณที่จัดสรร/ใช้ไป/คงเหลือ
    - หน่วยบริการประจำ
    - สิทธิ์เสริม (ถ้ามี)
```

---

## 🔌 Endpoints หลัก

### Card Reader API

**อ่านบัตรประชาชน:**
```http
POST http://localhost:3000/api/card-reader
```

**ตรวจสอบสถานะ:**
```http
GET http://localhost:3000/api/card-reader
```

### NHSO API

**ตรวจสอบสิทธิ์:**
```http
POST http://localhost:3000/api/nhso-check
Content-Type: application/json

{
  "citizen_id": "1234567890123",
  "hcode": "11001"
}
```

**ทดสอบการเชื่อมต่อ:**
```http
GET http://localhost:3000/api/nhso-test?pid=1234567890123&hcode=11001
```

---

## ✅ Checklist ก่อนใช้งานจริง

- [ ] ติดตั้ง dependencies (`npm install`)
- [ ] สร้างไฟล์ `.env.local` พร้อม NHSO_TOKEN
- [ ] ติดตั้ง Card Reader Driver (ถ้าจำเป็น)
- [ ] รัน Card Reader Service (`node card-reader-service.js`)
- [ ] รัน Next.js Server (`npm run dev`)
- [ ] ทดสอบการเชื่อมต่อ API สปสช (`/api/nhso-test`)
- [ ] ทดสอบการอ่านบัตร (`/api/card-reader`)

---

## 🆘 แก้ปัญหาเบื้องต้น

| ปัญหา | วิธีแก้ |
|------|--------|
| Card Reader ไม่ทำงาน | รัน `node card-reader-service.js` |
| API สปสช ไม่เชื่อมต่อ | ตรวจสอบ Token ใน `.env.local` |
| Port 8080 ถูกใช้งาน | เปลี่ยน `CARD_READER_URL` ใน `.env.local` |
| อ่านบัตรไม่ได้ | ตรวจสอบการเสียบบัตรและทำความสะอาด |

---

**ดูรายละเอียดเพิ่มเติม:** `USER_GUIDE.md`

