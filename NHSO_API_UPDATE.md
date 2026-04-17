# 🔄 อัพเดท NHSO API Configuration

## ✅ สิ่งที่แก้ไขแล้ว

### 1. อัพเดท API Endpoint และ Method
- **API URL เดิม:** `https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1` (POST)
- **API URL ใหม่:** `https://nhsoapi.nhso.go.th/nhsoendpoint/api/RealPerson` (GET)
- **Method:** เปลี่ยนจาก POST เป็น GET
- **Authorization:** เปลี่ยนจาก `token: {token}` เป็น `Authorization: Bearer {token}`
- **Request Format:** เปลี่ยนจาก Body เป็น Query Parameters

### 2. อัพเดท Request Format
**เดิม (POST with Body):**
```json
{
  "pid": "1234567890123",
  "hcode": "11001",
  "correlationId": "...",
  "date_visit": "2025-01-24"
}
```

**ใหม่ (GET with Query Parameters):**
```
?SOURCE_ID=10702&PID=1234567890123
```

### 3. อัพเดท Response Transformation
- ปรับให้รองรับโครงสร้าง Response จาก API RealPerson
- รองรับฟิลด์: `fullName`, `firstName`, `lastName`, `mainInsclCode`, `subInsclCode`, `hospSubNew`, `hospMainOpNew`, `hospMainNew`

---

## ⚙️ การตั้งค่า .env.local

แก้ไขไฟล์ `.env.local` ในโฟลเดอร์ root:

```bash
# NHSO API Configuration (อัพเดทตามโค้ด PHP ที่ทำงานได้)
NHSO_TOKEN=c61c428d-b8d5-49db-a3c6-a04757cd6e12
NHSO_API_URL=https://nhsoapi.nhso.go.th/nhsoendpoint/api/RealPerson
NHSO_HCODE=10702
```

**หมายเหตุ:**
- `NHSO_TOKEN`: Token จากโค้ด PHP ที่ส่งมา (`c61c428d-b8d5-49db-a3c6-a04757cd6e12`)
- `NHSO_API_URL`: API endpoint ที่ทำงานได้จริง
- `NHSO_HCODE`: รหัสโรงพยาบาล (default: 10702, หรือใช้จาก parameter `hcode`)

---

## 📋 โครงสร้าง Response จาก API

API จะส่ง Response กลับมาในรูปแบบ:

```json
{
  "pid": "1234567890123",
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "fullName": "นายสมชาย ใจดี",
  "sex": "1",
  "age": "45",
  "nationCode": "001",
  "nationDescription": "ไทย",
  "provinceCode": "76",
  "provinceName": "ชัยภูมิ",
  "subInsclCode": "UCS",
  "subInsclName": "หลักประกันสุขภาพถ้วนหน้า",
  "birthDate": "1978-01-15",
  "mainInscl": "UCS",
  "mainInsclCode": "UCS",
  "mainInsclName": "หลักประกันสุขภาพถ้วนหน้า (บัตรทอง)",
  "subInscl": [...],
  "hospSubNew": {
    "hcode": "10702",
    "hname": "โรงพยาบาลชัยภูมิ"
  },
  "hospMainOpNew": {
    "hcode": "10702",
    "hname": "โรงพยาบาลชัยภูมิ"
  },
  "hospMainNew": {
    "hcode": "10702",
    "hname": "โรงพยาบาลชัยภูมิ"
  }
}
```

---

## 🔧 ขั้นตอนการอัพเดท

### 1. อัพเดท .env.local

```bash
# แก้ไขไฟล์ .env.local
NHSO_TOKEN=c61c428d-b8d5-49db-a3c6-a04757cd6e12
NHSO_API_URL=https://nhsoapi.nhso.go.th/nhsoendpoint/api/RealPerson
NHSO_HCODE=10702
```

### 2. Restart Development Server

```bash
# หยุด server เดิม (Ctrl+C)
# แล้วเริ่มใหม่
npm run dev
```

### 3. ทดสอบการเชื่อมต่อ

```bash
# ทดสอบผ่าน API test endpoint
curl "http://localhost:3000/api/nhso-test?pid=1234567890123&hcode=10702"
```

หรือทดสอบผ่านหน้าเว็บ:
1. เปิดหน้า `/allocation-check/data`
2. อ่านบัตรประชาชน
3. ตรวจสอบว่า API ทำงานได้

---

## ✅ Checklist

- [x] อัพเดท API endpoint เป็น `https://nhsoapi.nhso.go.th/nhsoendpoint/api/RealPerson`
- [x] เปลี่ยน Method จาก POST เป็น GET
- [x] เปลี่ยน Authorization header เป็น `Bearer {token}`
- [x] เปลี่ยน Request format เป็น Query Parameters
- [x] อัพเดท Response transformation function
- [ ] อัพเดท `.env.local` ด้วย Token และ API URL ใหม่
- [ ] Restart server
- [ ] ทดสอบการเชื่อมต่อ

---

## 📞 หมายเหตุ

- Token และ HCODE ในโค้ด PHP อาจเป็นของโรงพยาบาลชัยภูมิ (`10702`)
- ถ้าเป็นโรงพยาบาลอื่น ต้องเปลี่ยน `NHSO_HCODE` ให้ตรงกับรหัสโรงพยาบาลของตัวเอง
- หรือส่ง `hcode` ผ่าน parameter เมื่อเรียก API
