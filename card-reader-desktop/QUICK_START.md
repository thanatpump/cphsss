# 🚀 SSO Card Reader - Quick Start Guide

## 📋 สำหรับ Developer - สร้างไฟล์ .exe

### ขั้นตอนที่ 1: ติดตั้ง Dependencies

```bash
cd card-reader-desktop
npm install
```

### ขั้นตอนที่ 2: สร้างไฟล์ .exe

**วิธีที่ 1: ใช้ Batch File (แนะนำ - ง่ายที่สุด)**
```bash
build-electron.bat
```

**วิธีที่ 2: ใช้ Command Line**
```bash
npm run build-win
```

### ขั้นตอนที่ 3: ไฟล์ที่สร้าง

ไฟล์จะอยู่ในโฟลเดอร์ `dist-electron/`:
- **`SSO Card Reader Setup.exe`** - Installer (ติดตั้งแล้วมี shortcut บน Desktop)
- **`SSO-CardReader-Portable.exe`** - Portable (ไม่ต้องติดตั้ง ดับเบิ้ลคลิกแล้วใช้งานได้เลย)

---

## 👥 สำหรับผู้ใช้ทั่วไป

### วิธีใช้งาน Portable Version (แนะนำ):

1. **ดาวน์โหลดไฟล์:**
   - `SSO-CardReader-Portable.exe`
   - `config.json` (ถ้ามี)

2. **วางไฟล์ในโฟลเดอร์เดียวกัน**

3. **แก้ไข `config.json`** (ถ้าจำเป็น):
   ```json
   {
     "sso_api_url": "https://cphsss.hsoft.in.th",
     "port": 3001,
     "thaiid_reader_url": "https://localhost:8443/smartcard/data/"
   }
   ```

4. **รัน ThaiIDCardReader.exe ก่อน** (ถ้ายังไม่มี)

5. **ดับเบิ้ลคลิก `SSO-CardReader-Portable.exe`**

6. **เสียบบัตรประชาชน** - โปรแกรมจะอ่านและส่งข้อมูลอัตโนมัติ

---

## ⚙️ การตั้งค่า

### ไฟล์ config.json:

```json
{
  "sso_api_url": "https://cphsss.hsoft.in.th",
  "port": 3001,
  "thaiid_reader_url": "https://localhost:8443/smartcard/data/"
}
```

- **`sso_api_url`**: URL ของเว็บ SSO (ต้องแก้ไขตาม Server จริง)
- **`port`**: Port ของ Desktop App (ไม่ต้องเปลี่ยน)
- **`thaiid_reader_url`**: URL ของ ThaiIDCardReader (ไม่ต้องเปลี่ยน)

---

## 🎯 สิ่งที่ต้องมี:

- ✅ เครื่องอ่านบัตรประชาชน
- ✅ ThaiIDCardReader.exe กำลังรันอยู่ (https://localhost:8443)
- ✅ เชื่อมต่ออินเทอร์เน็ต (เพื่อส่งข้อมูลไปยังเว็บ SSO)

---

## 🐛 แก้ไขปัญหา:

### ไม่พบเครื่องอ่านบัตร:
- ตรวจสอบว่า ThaiIDCardReader.exe กำลังรันอยู่
- ตรวจสอบว่าเครื่องอ่านบัตรเชื่อมต่ออยู่

### ไม่สามารถเชื่อมต่อ Server ได้:
- ตรวจสอบ URL ใน `config.json` ว่าถูกต้องหรือไม่
- ตรวจสอบว่าเว็บ SSO ทำงานอยู่

---

## 📝 หมายเหตุ:

- โปรแกรมจะอ่านบัตรอัตโนมัติทุก 2 วินาที
- ข้อมูลจะถูกส่งไปยัง Server ทันทีที่อ่านบัตรสำเร็จ
- ข้อมูลจะถูกบันทึกลงไฟล์ `card-data.json` เป็น backup
