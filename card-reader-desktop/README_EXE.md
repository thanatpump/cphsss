# 📦 SSO Card Reader - ไฟล์ .exe สำหรับผู้ใช้

## 🎯 สำหรับผู้ใช้ทั่วไป (ไม่ต้องติดตั้ง Node.js)

### วิธีใช้งาน:

1. **ดาวน์โหลดไฟล์:**
   - `SSO-CardReader.exe` - ไฟล์หลัก
   - `config.json` - ไฟล์ตั้งค่า
   - `ThaiIDCardReader/` - โฟลเดอร์โปรแกรมอ่านบัตร

2. **วางไฟล์ทั้งหมดในโฟลเดอร์เดียวกัน**

3. **แก้ไข `config.json`** (ถ้าจำเป็น):
   ```json
   {
     "sso_api_url": "https://cphsss.hsoft.in.th",
     "port": 3001,
     "thaiid_reader_url": "https://localhost:8443/smartcard/data/"
   }
   ```

4. **รัน ThaiIDCardReader.exe ก่อน** (ถ้ายังไม่มี)

5. **ดับเบิ้ลคลิก `SSO-CardReader.exe`** เพื่อเริ่มใช้งาน

6. **เสียบบัตรประชาชน** - โปรแกรมจะอ่านและส่งข้อมูลอัตโนมัติ

## ⚠️ สิ่งที่ต้องมี:

- ✅ เครื่องอ่านบัตรประชาชน
- ✅ ThaiIDCardReader.exe กำลังรันอยู่ (https://localhost:8443)
- ✅ เชื่อมต่ออินเทอร์เน็ต (เพื่อส่งข้อมูลไปยังเว็บ)

## 🔧 สำหรับ Developer - สร้างไฟล์ .exe ใหม่:

```bash
cd card-reader-desktop
npm install
npm install -g pkg
npm run build-exe
```

ไฟล์ .exe จะอยู่ในโฟลเดอร์ `dist/`
