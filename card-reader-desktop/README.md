# SSO Card Reader Desktop Application

โปรแกรม Desktop สำหรับอ่านบัตรประชาชนและส่งข้อมูลไปยังระบบ SSO บนเซิร์ฟเวอร์

## ✨ ฟีเจอร์

- ✅ อ่านบัตรประชาชนอัตโนมัติเมื่อใส่บัตร
- ✅ ส่งข้อมูลไปยัง SSO API บนเซิร์ฟเวอร์
- ✅ ใช้งานง่าย - ไม่ต้องเปิด Terminal หรือรัน service แยก
- ✅ รองรับทั้ง Development และ Production

## 📦 การติดตั้ง

```bash
cd card-reader-desktop
npm install
```

## ⚙️ การตั้งค่า

### 1. สร้างไฟล์ config.json

คัดลอกจาก `config.example.json`:

```bash
cp config.example.json config.json
```

### 2. แก้ไข config.json

```json
{
  "sso_api_url": "https://your-server.com",
  "port": 3001
}
```

**สำคัญ:** แก้ไข `sso_api_url` ให้เป็น URL ของเซิร์ฟเวอร์จริง

### หรือใช้ Environment Variable

```bash
SSO_API_URL=https://your-server.com node main.js
```

## 🚀 วิธีใช้งาน

### สำหรับ Production (เซิร์ฟเวอร์)

```bash
# 1. แก้ไข config.json ให้ชี้ไปยังเซิร์ฟเวอร์จริง
# 2. รันโปรแกรม
node main.js
```

### สำหรับ Development (localhost)

```bash
# ใช้ค่า default (http://localhost:3000)
node main.js
```

## 🔄 Flow การทำงาน

```
1. รัน Desktop App บนเครื่อง client
   ↓
2. ใส่บัตรประชาชนเข้าเครื่องอ่านบัตร
   ↓
3. Desktop App อ่านข้อมูลอัตโนมัติ
   ↓
4. Desktop App ส่งข้อมูลไปยัง SSO API บนเซิร์ฟเวอร์
   ↓
5. เซิร์ฟเวอร์เก็บข้อมูลใน Memory Storage
   ↓
6. Frontend (เว็บ) อ่านข้อมูลจากเซิร์ฟเวอร์
   ↓
7. แสดงข้อมูลสิทธิ์
```

## 📋 ขั้นตอนการใช้งาน

### ขั้นตอนที่ 1: ตั้งค่า Desktop App

1. แก้ไข `config.json` ให้ชี้ไปยังเซิร์ฟเวอร์จริง
2. รันโปรแกรม: `node main.js`

### ขั้นตอนที่ 2: ใช้งานบนเว็บ

1. เปิดเว็บ SSO บนเซิร์ฟเวอร์
2. ไปที่หน้า "ตรวจสอบข้อมูลการจัดสรรเงิน"
3. Login เข้าระบบ
4. **ใส่บัตรประชาชนเข้าเครื่องอ่านบัตร** (บนเครื่องที่รัน Desktop App)
5. คลิกปุ่ม "อ่านบัตรประชาชนและเช็คสิทธิ์" บนเว็บ
6. ระบบจะอ่านข้อมูลและแสดงผล

## 🔌 API Endpoints

### PUT /api/card-reader
Desktop App ส่งข้อมูลมาที่นี่

### POST /api/card-reader
Frontend อ่านข้อมูลจากที่นี่

### GET /api/card-reader
ตรวจสอบสถานะ

## ⚠️ หมายเหตุสำคัญ

1. **Desktop App ต้องรันบนเครื่องที่ติดตั้งเครื่องอ่านบัตร**
2. **Desktop App ส่งข้อมูลไปยังเซิร์ฟเวอร์ผ่าน HTTPS**
3. **Frontend อ่านข้อมูลจากเซิร์ฟเวอร์ (ไม่ใช่จากเครื่อง client โดยตรง)**
4. **ข้อมูลถูกเก็บใน Memory Storage บนเซิร์ฟเวอร์ (ไม่เก็บถาวร)**

## 🛠️ Troubleshooting

### ปัญหา: ไม่สามารถส่งข้อมูลไปยังเซิร์ฟเวอร์ได้

**ตรวจสอบ:**
- URL ใน `config.json` ถูกต้องหรือไม่
- เซิร์ฟเวอร์รันอยู่หรือไม่
- Firewall ไม่บล็อกหรือไม่

### ปัญหา: Frontend อ่านข้อมูลไม่ได้

**ตรวจสอบ:**
- Desktop App ส่งข้อมูลสำเร็จหรือไม่ (ดู log)
- เซิร์ฟเวอร์เก็บข้อมูลแล้วหรือไม่
- Frontend poll ข้อมูลหรือไม่

## 📞 Supportหากมีปัญหา กรุณาตรวจสอบ:
1. Log ของ Desktop App
2. Log ของเซิร์ฟเวอร์
3. Network Tab ใน Browser