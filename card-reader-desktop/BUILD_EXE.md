# วิธีสร้างไฟล์ .exe สำหรับ SSO Card Reader

## ข้อมูลที่ต้องการจากคุณ:

1. **URL ของเว็บ SSO** - ต้องการให้เชื่อมต่อกับ URL ไหน? (เช่น: `https://cphsss.hsoft.in.th`)
2. **ThaiIDCardReader.exe** - มีไฟล์นี้อยู่แล้วหรือไม่? (ต้องมีเพื่ออ่านบัตร)
3. **ต้องการ GUI หรือ Console?** - ต้องการหน้าต่างแสดงสถานะหรือแค่รันในพื้นหลัง?

## วิธีสร้าง .exe (สำหรับ Developer):

### วิธีที่ 1: ใช้ pkg (แนะนำ - ง่ายที่สุด)

```bash
cd card-reader-desktop
npm install
npm install -g pkg
npm run build-exe
```

จะได้ไฟล์ `SSO-CardReader.exe` ที่สามารถรันได้โดยไม่ต้องติดตั้ง Node.js

### วิธีที่ 2: ใช้ nexe (ทางเลือก)

```bash
npm install -g nexe
nexe main.js -o SSO-CardReader.exe -t windows-x64-18.17.0
```

## ไฟล์ที่ต้องแจกจ่าย:

1. `SSO-CardReader.exe` - ไฟล์หลัก
2. `config.json` - ไฟล์ตั้งค่า (หรือรวมไว้ใน .exe)
3. `ThaiIDCardReader/` - โฟลเดอร์ที่มี ThaiIDCardReader.exe

## ข้อจำกัด:

- ต้องมี ThaiIDCardReader.exe รันอยู่ก่อน (https://localhost:8443)
- ต้องมีเครื่องอ่านบัตรเชื่อมต่ออยู่
