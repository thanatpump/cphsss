# 📥 วิธีสร้างไฟล์ ZIP สำหรับแจกจ่าย

## วิธีที่ 1: ใช้ Batch File (Windows - แนะนำ)

1. ดับเบิ้ลคลิก `create-zip.bat`
2. รอให้สร้าง ZIP เสร็จ
3. ไฟล์ `SSO-CardReader-For-Users.zip` จะถูกสร้างในโฟลเดอร์เดียวกัน

## วิธีที่ 2: ใช้ Shell Script (Mac/Linux)

1. เปิด Terminal
2. รันคำสั่ง:
   ```bash
   cd card-reader-desktop
   ./create-zip.sh
   ```
3. ไฟล์ `SSO-CardReader-For-Users.zip` จะถูกสร้าง

## วิธีที่ 3: ใช้ PowerShell (Windows)

1. เปิด PowerShell
2. รันคำสั่ง:
   ```powershell
   cd card-reader-desktop
   Compress-Archive -Path "SSO-CardReader-For-Users\*" -DestinationPath "SSO-CardReader-For-Users.zip" -Force
   ```

## วิธีที่ 4: ใช้ GUI (ง่ายที่สุด)

1. คลิกขวาที่โฟลเดอร์ `SSO-CardReader-For-Users`
2. เลือก "Send to" → "Compressed (zipped) folder"
3. ไฟล์ ZIP จะถูกสร้างอัตโนมัติ

---

## 📋 Checklist ก่อนสร้าง ZIP:

- [ ] ไฟล์ `SSO-CardReader-Portable.exe` อยู่ในโฟลเดอร์
- [ ] ไฟล์ `config.json` อยู่ในโฟลเดอร์
- [ ] ไฟล์ `คู่มือใช้งาน.txt` อยู่ในโฟลเดอร์
- [ ] โฟลเดอร์ `ThaiIDCardReader/` อยู่ในโฟลเดอร์
- [ ] ตรวจสอบ URL ใน `config.json` ว่าถูกต้อง

---

## 💡 หมายเหตุ:

- ไฟล์ ZIP จะมีขนาดประมาณ 86-90 MB (ขึ้นอยู่กับไฟล์ในโฟลเดอร์)
- หลังจากสร้าง ZIP แล้ว สามารถแจกจ่ายให้ผู้ใช้งานได้เลย
- ผู้ใช้งานจะต้อง Extract ZIP ก่อนใช้งาน
