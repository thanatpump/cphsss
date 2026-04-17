# 🔧 แก้ไขปัญหา: อ่านบัตรไม่ได้

## 📋 สรุปปัญหา

เมื่อกดปุ่ม "อ่านบัตร" แล้วไม่สามารถอ่านบัตรได้

## ✅ สิ่งที่แก้ไขแล้ว

1. **เพิ่มเวลา polling** จาก 30 เป็น 60 วินาที
2. **เพิ่มข้อความแสดงสถานะ** ทุก 5 วินาที
3. **เพิ่มคำแนะนำ** เมื่อหมดเวลา

---

## 🔍 วิธีตรวจสอบปัญหา

### ขั้นตอนที่ 1: ตรวจสอบ Desktop App

**ตรวจสอบว่า Desktop App กำลังทำงานอยู่หรือไม่:**

1. เปิด Terminal/Command Prompt
2. ไปที่โฟลเดอร์ `card-reader-desktop`
3. รันคำสั่ง:
   ```bash
   node main.js
   ```

**สิ่งที่ควรเห็น:**
```
⚙️  Configuration:
   SSO API URL: https://cphsss.hsoft.in.th
   Port: 3001
   ThaiIDCardReader URL: https://localhost:8443/smartcard/data/
🔄 เริ่มการอ่านบัตรอัตโนมัติ (ทุก 2 วินาที)
💡 เสียบบัตรประชาชนแล้ว Desktop App จะอ่านและส่งข้อมูลไปยัง Server อัตโนมัติ
```

**ถ้าไม่เห็นข้อความนี้:**
- Desktop App ไม่ทำงาน
- **วิธีแก้:** รัน Desktop App ใหม่

---

### ขั้นตอนที่ 2: ตรวจสอบ ThaiIDCardReader.exe

**ตรวจสอบว่า ThaiIDCardReader.exe กำลังทำงานอยู่หรือไม่:**

1. เปิด Browser
2. ไปที่: `https://localhost:8443/smartcard/data/`
3. **ถ้าเห็นข้อมูลบัตร** = ThaiIDCardReader ทำงานอยู่ ✅
4. **ถ้าไม่เห็นหรือ error** = ThaiIDCardReader ไม่ทำงาน ❌

**วิธีแก้:**
1. เปิดโปรแกรม `ThaiIDCardReader.exe` จากโฟลเดอร์ `card-reader-desktop/ThaiIDCardReader/`
2. รอให้โปรแกรมเริ่มทำงาน (จะเห็น icon ใน system tray)
3. เสียบบัตรประชาชนเข้าเครื่องอ่านบัตร
4. ตรวจสอบอีกครั้งที่ `https://localhost:8443/smartcard/data/`

---

### ขั้นตอนที่ 3: ตรวจสอบการเชื่อมต่อ

**ตรวจสอบว่า Desktop App ส่งข้อมูลไปยัง Server ได้หรือไม่:**

1. ดูที่ Terminal ที่รัน Desktop App
2. **ถ้าเห็น:**
   ```
   🎴 พบบัตรใหม่ - กำลังอ่านข้อมูล...
   ✅ ส่งข้อมูลไปยัง SSO สำเร็จ
   ```
   = Desktop App ทำงานปกติ ✅

3. **ถ้าเห็น:**
   ```
   ⚠️  ไม่สามารถเชื่อมต่อ SSO ได้
   ```
   = Desktop App ไม่สามารถเชื่อมต่อกับ Server ได้ ❌

**วิธีแก้:**
- ตรวจสอบว่า Next.js Server กำลังทำงานอยู่ (`npm run dev`)
- ตรวจสอบ `SSO_API_URL` ใน `config.json` ว่าถูกต้องหรือไม่

---

## 🔧 วิธีแก้ไขปัญหา

### ปัญหา 1: Desktop App ไม่ทำงาน

**อาการ:**
- กดปุ่ม "อ่านบัตร" แล้วไม่เกิดอะไรขึ้น
- ไม่เห็นข้อความใน Terminal

**วิธีแก้:**
1. ไปที่โฟลเดอร์ `card-reader-desktop`
2. ดับเบิ้ลคลิก `start.bat` (Windows) หรือ `start.sh` (Mac/Linux)
3. หรือรันคำสั่ง: `node main.js`

---

### ปัญหา 2: ThaiIDCardReader.exe ไม่ทำงาน

**อาการ:**
- Desktop App แสดงข้อความ "ไม่สามารถเชื่อมต่อ ThaiIDCardReader ได้"
- ไม่สามารถเข้าถึง `https://localhost:8443/smartcard/data/` ได้

**วิธีแก้:**
1. เปิดโปรแกรม `ThaiIDCardReader.exe` จากโฟลเดอร์ `card-reader-desktop/ThaiIDCardReader/`
2. รอให้โปรแกรมเริ่มทำงาน
3. เสียบบัตรประชาชนเข้าเครื่องอ่านบัตร
4. ตรวจสอบที่ `https://localhost:8443/smartcard/data/`

---

### ปัญหา 3: Desktop App ไม่สามารถเชื่อมต่อกับ Server ได้

**อาการ:**
- Desktop App แสดง "ไม่สามารถเชื่อมต่อ SSO ได้"
- แต่ข้อมูลถูกบันทึกในไฟล์แล้ว

**วิธีแก้:**
1. ตรวจสอบว่า Next.js Server กำลังทำงานอยู่:
   ```bash
   npm run dev
   ```

2. ตรวจสอบ `SSO_API_URL` ใน `card-reader-desktop/config.json`:
   ```json
   {
     "sso_api_url": "https://cphsss.hsoft.in.th",
     "port": 3001,
     "thaiid_reader_url": "https://localhost:8443/smartcard/data/"
   }
   ```

3. ถ้าใช้ localhost ให้เปลี่ยนเป็น:
   ```json
   {
     "sso_api_url": "http://localhost:3000",
     ...
   }
   ```

---

### ปัญหา 4: บัตรไม่ถูกอ่าน

**อาการ:**
- เสียบบัตรแล้ว แต่ Desktop App ไม่อ่าน

**วิธีแก้:**
1. **ตรวจสอบเครื่องอ่านบัตร:**
   - เสียบ USB เข้าเครื่องคอมพิวเตอร์
   - ตรวจสอบว่าเครื่องอ่านบัตรเปิดอยู่ (มีไฟ LED)

2. **ตรวจสอบบัตร:**
   - บัตรประชาชนต้องไม่ชำรุด
   - เสียบบัตรให้แน่น

3. **ลองใหม่:**
   - ถอดบัตรออก
   - รอ 2-3 วินาที
   - เสียบบัตรใหม่

---

## 📋 Checklist การแก้ไขปัญหา

- [ ] Desktop App กำลังทำงานอยู่ (ดูที่ Terminal)
- [ ] ThaiIDCardReader.exe กำลังทำงานอยู่ (ตรวจสอบที่ `https://localhost:8443/smartcard/data/`)
- [ ] Next.js Server กำลังทำงานอยู่ (`npm run dev`)
- [ ] เครื่องอ่านบัตรเสียบ USB แล้ว
- [ ] บัตรประชาชนเสียบเข้าเครื่องอ่านบัตรแล้ว
- [ ] `config.json` ตั้งค่าถูกต้อง
- [ ] ลองรัน Desktop App ใหม่
- [ ] ลองรัน ThaiIDCardReader.exe ใหม่

---

## 🚀 ขั้นตอนการใช้งานที่ถูกต้อง

1. **เริ่มต้น:**
   - รัน Next.js Server: `npm run dev`
   - รัน ThaiIDCardReader.exe
   - รัน Desktop App: `node main.js` หรือ `start.bat`

2. **ใช้งาน:**
   - เปิดหน้าเว็บ `/allocation-check/data`
   - เสียบบัตรประชาชนเข้าเครื่องอ่านบัตร
   - กดปุ่ม "อ่านบัตร"
   - รอสักครู่ (Desktop App จะอ่านบัตรอัตโนมัติทุก 2 วินาที)

3. **ตรวจสอบ:**
   - ดูที่ Terminal ของ Desktop App ว่ามีข้อความ "✅ ส่งข้อมูลไปยัง SSO สำเร็จ" หรือไม่
   - ดูที่หน้าเว็บว่ามีข้อมูลบัตรแสดงหรือไม่

---

## 📞 ติดต่อ

ถ้ายังแก้ไขไม่ได้:
1. ตรวจสอบ Logs ใน Terminal ของ Desktop App
2. ตรวจสอบ Logs ใน Terminal ของ Next.js Server
3. ตรวจสอบ Browser Console (F12) สำหรับ error messages
