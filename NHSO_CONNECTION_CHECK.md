# 🔍 ตรวจสอบการเชื่อมต่อไปยังสปสช

## ✅ สิ่งที่ระบบทำได้แล้ว

### 1. API Endpoint สำหรับเชื่อมต่อสปสช
- **Endpoint**: `POST /api/nhso-check`
- **Location**: `app/api/nhso-check/route.ts`
- **Status**: ✅ พร้อมใช้งาน

### 2. การตรวจสอบข้อมูล
- ✅ ตรวจสอบ `citizen_id` ต้องเป็น 13 หลัก
- ✅ ตรวจสอบ `NHSO_TOKEN` ต้องมีค่า
- ✅ ตรวจสอบ `NHSO_API_URL` (มีค่า default)

### 3. Error Handling
- ✅ Timeout handling (10 วินาที)
- ✅ Error messages ที่ชัดเจน
- ✅ Logging สำหรับ debugging

### 4. การแปลงข้อมูล
- ✅ แปลงข้อมูลจาก API สปสช ให้อยู่ในรูปแบบที่ frontend ใช้งานได้
- ✅ รองรับสิทธิ์ต่างๆ (UCS, SSS, OFC, LGO, WEL, OTH)

---

## ⚙️ สิ่งที่ต้องตั้งค่า

### Environment Variables (.env.local)

```bash
# NHSO API Configuration
NHSO_TOKEN=your_token_here
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

**⚠️ สำคัญ:**
- `NHSO_TOKEN` ต้องได้จากเจ้าหน้าที่สปสช
- อย่า commit `.env.local` เข้า Git

---

## 🧪 วิธีทดสอบการเชื่อมต่อ

### วิธีที่ 1: ทดสอบผ่าน API Test Endpoint

```bash
# ทดสอบการเชื่อมต่อ
curl -X GET http://localhost:3000/api/nhso-test
```

### วิธีที่ 2: ทดสอบผ่านหน้าเว็บ

1. เปิดหน้า `https://cphsss.hsoft.in.th/allocation-check/data`
2. อ่านบัตรประชาชน
3. ระบบจะเรียก API สปสช อัตโนมัติ

### วิธีที่ 3: ทดสอบด้วย Postman/curl

```bash
curl -X POST https://cphsss.hsoft.in.th/api/nhso-check \
  -H "Content-Type: application/json" \
  -d '{
    "citizen_id": "1234567890123",
    "hcode": "11001"
  }'
```

---

## 📋 Flow การทำงาน

```
Frontend (allocation-check/data)
    ↓
POST /api/nhso-check
    ↓
ตรวจสอบ citizen_id (13 หลัก)
    ↓
ตรวจสอบ NHSO_TOKEN
    ↓
เรียก NHSO API
    POST https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
    Headers:
      - Content-Type: application/json
      - token: NHSO_TOKEN
    Body:
      {
        "pid": "1234567890123",
        "hcode": "11001",
        "correlationId": "SSO-...",
        "date_visit": "2024-12-20"
      }
    ↓
แปลงข้อมูลจาก NHSO API
    ↓
ส่งกลับไปยัง Frontend
```

---

## ⚠️ ปัญหาที่อาจเกิดขึ้น

### 1. "ไม่พบ Token สำหรับเชื่อมต่อ API"
**สาเหตุ**: ไม่มี `NHSO_TOKEN` ใน `.env.local`
**วิธีแก้**: เพิ่ม `NHSO_TOKEN=your_token_here` ใน `.env.local`

### 2. "การเชื่อมต่อกับ API สปสช หมดเวลา"
**สาเหตุ**: NHSO API ตอบช้าหรือไม่ตอบ
**วิธีแก้**: 
- ตรวจสอบการเชื่อมต่อ Internet
- ตรวจสอบว่า NHSO API ทำงานอยู่
- ลองใหม่อีกครั้ง

### 3. "API สปสช ส่งข้อผิดพลาด: 401 Unauthorized"
**สาเหตุ**: Token ไม่ถูกต้องหรือหมดอายุ
**วิธีแก้**: 
- ตรวจสอบ Token จากเจ้าหน้าที่สปสช
- อัพเดท Token ใน `.env.local`
- Restart server

### 4. "API สปสช ส่งข้อผิดพลาด: 400 Bad Request"
**สาเหตุ**: ข้อมูลที่ส่งไม่ถูกต้อง
**วิธีแก้**: 
- ตรวจสอบ `citizen_id` ต้องเป็น 13 หลัก
- ตรวจสอบ `hcode` ต้องเป็นรหัสโรงพยาบาลที่ถูกต้อง

---

## ✅ Checklist การเชื่อมต่อ

- [ ] มีไฟล์ `.env.local` ในโฟลเดอร์ root
- [ ] มี `NHSO_TOKEN` ใน `.env.local`
- [ ] มี `NHSO_API_URL` ใน `.env.local` (หรือใช้ค่า default)
- [ ] Server restart แล้วหลังจากแก้ไข `.env.local`
- [ ] ทดสอบการเชื่อมต่อผ่าน `/api/nhso-test`
- [ ] ทดสอบด้วยข้อมูลจริงผ่านหน้าเว็บ

---

## 📞 ติดต่อสปสช

ถ้ายังไม่มี Token หรือมีปัญหา:
- ติดต่อเจ้าหน้าที่สปสช
- ขอ Token สำหรับ API
- ขอเอกสาร API Specification
- ขอ Whitelist IP Address (ถ้าจำเป็น)
