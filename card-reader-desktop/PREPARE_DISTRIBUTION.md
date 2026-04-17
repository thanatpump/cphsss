# 📦 วิธีเตรียมไฟล์สำหรับแจกจ่าย (สำหรับ Developer)

## 🎯 สำหรับผู้ใช้งานทั่วไป - สิ่งที่ต้องโหลด:

**ผู้ใช้งานทั่วไปไม่ต้องโหลดอะไรเลย!** แค่ดาวน์โหลดไฟล์ที่คุณ zip ให้เท่านั้น

---

## 📋 ขั้นตอนการเตรียมไฟล์สำหรับแจกจ่าย:

### ขั้นตอนที่ 1: Build ไฟล์ .exe

```bash
cd card-reader-desktop
npm install
npm run build-win
```

หรือใช้:
```bash
build-electron.bat
```

### ขั้นตอนที่ 2: ไฟล์ที่สร้างจะอยู่ในโฟลเดอร์ `dist-electron/`

คุณจะเห็นไฟล์:
- `SSO Card Reader Setup.exe` (Installer - ไม่ต้องใช้)
- `SSO-CardReader-Portable.exe` (Portable - ใช้ตัวนี้!)

### ขั้นตอนที่ 3: สร้างโฟลเดอร์สำหรับแจกจ่าย

สร้างโฟลเดอร์ใหม่ชื่อ `SSO-CardReader-For-Users` แล้ว copy ไฟล์เหล่านี้เข้าไป:

```
SSO-CardReader-For-Users/
├── SSO-CardReader-Portable.exe    (จาก dist-electron/)
├── config.json                     (จาก card-reader-desktop/)
├── ThaiIDCardReader/               (ทั้งโฟลเดอร์จาก card-reader-desktop/)
│   └── ThaiIDCardReader.exe
└── คู่มือใช้งาน.txt                (ไฟล์คำแนะนำ)
```

### ขั้นตอนที่ 4: Zip โฟลเดอร์

1. คลิกขวาที่โฟลเดอร์ `SSO-CardReader-For-Users`
2. เลือก "Send to" → "Compressed (zipped) folder"
3. จะได้ไฟล์ `SSO-CardReader-For-Users.zip`

### ขั้นตอนที่ 5: แจกจ่ายไฟล์ .zip

ให้ผู้ใช้งานทั่วไปดาวน์โหลดไฟล์ `SSO-CardReader-For-Users.zip` แล้ว:
1. Extract ไฟล์ .zip (คลิกขวา → Extract All)
2. เปิดโฟลเดอร์ที่ extract
3. อ่านไฟล์ `คู่มือใช้งาน.txt`
4. ทำตามขั้นตอนในไฟล์

---

## 📝 Checklist สำหรับการแจกจ่าย:

- [ ] Build ไฟล์ .exe สำเร็จ
- [ ] Copy `SSO-CardReader-Portable.exe` จาก `dist-electron/`
- [ ] Copy `config.json` (ตรวจสอบ URL ว่าถูกต้อง)
- [ ] Copy โฟลเดอร์ `ThaiIDCardReader/` ทั้งหมด
- [ ] Copy ไฟล์ `คู่มือใช้งาน.txt`
- [ ] Zip ทั้งหมดเป็นไฟล์เดียว
- [ ] ทดสอบว่า extract แล้วใช้งานได้

---

## ⚙️ ตรวจสอบ config.json:

ก่อน zip ตรวจสอบว่า `config.json` มี URL ที่ถูกต้อง:

```json
{
  "sso_api_url": "https://cphsss.hsoft.in.th",
  "port": 3001,
  "thaiid_reader_url": "https://localhost:8443/smartcard/data/"
}
```

**สำคัญ:** ตรวจสอบว่า `sso_api_url` ชี้ไปที่ Server ที่ถูกต้อง!

---

## 🎁 ไฟล์ที่ต้องมีใน .zip:

1. ✅ `SSO-CardReader-Portable.exe` - โปรแกรมหลัก
2. ✅ `config.json` - ไฟล์ตั้งค่า
3. ✅ `ThaiIDCardReader/` - โฟลเดอร์โปรแกรมอ่านบัตร
4. ✅ `คู่มือใช้งาน.txt` - คู่มือใช้งาน

---

## 💡 Tips:

- ตั้งชื่อไฟล์ .zip ให้ชัดเจน เช่น `SSO-CardReader-v1.0.zip`
- ใส่หมายเลขเวอร์ชันในชื่อไฟล์
- ทดสอบ extract และรันโปรแกรมก่อนแจกจ่าย
- ถ้ามี icon หรือ logo สามารถใส่เข้าไปได้
