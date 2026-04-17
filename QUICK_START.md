# 🚀 คู่มือเริ่มใช้งานด่วน (Quick Start Guide)

## เริ่มใช้งานใน 3 ขั้นตอน

### ขั้นตอนที่ 1: ติดตั้ง Dependencies

```bash
# ติดตั้ง Main Application
cd /Users/macbookpro16/Desktop/sso
npm install

# ติดตั้ง Card Reader Service
cd card-reader-client
npm install
cd ..
```

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

```bash
# สร้างไฟล์ .env.local
cp .env.local.example .env.local
```

แก้ไขไฟล์ `.env.local`:
```env
NHSO_TOKEN=your_token_here
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
CARD_READER_URL=http://localhost:8080
```

⚠️ **สำคัญ**: ถ้าไม่มี NHSO_TOKEN จริง ระบบจะใช้ Mock Data แทน (เหมาะสำหรับทดสอบ)

### ขั้นตอนที่ 3: รันระบบ

#### Terminal หน้าต่างที่ 1 - Card Reader Service
```bash
cd /Users/macbookpro16/Desktop/sso/card-reader-client
node card-reader-service.js
```

#### Terminal หน้าต่างที่ 2 - Next.js App
```bash
cd /Users/macbookpro16/Desktop/sso
npm run dev
```

### เปิดเบราว์เซอร์

```
http://localhost:3000/nhso-check
```

---

## 🎯 วิธีใช้งาน

1. **ใส่บัตรประชาชน** เข้าเครื่องอ่าน
2. **กดปุ่ม** "📖 อ่านบัตรประชาชนและเช็คกับ สปสช"
3. **รอ 2-5 วินาที** - ระบบทำงานอัตโนมัติ
4. **ดูผลลัพธ์** - แสดงข้อมูลครบถ้วน

---

## 🐛 แก้ปัญหาเบื้องต้น

### ปัญหา: "ไม่สามารถเชื่อมต่อ Card Reader Service ได้"
**แก้**: รัน Card Reader Service ใน Terminal หน้าต่างที่ 1

### ปัญหา: "ไม่พบเครื่องอ่านบัตร"
**แก้**: ตรวจสอบว่าเครื่องอ่านบัตรเสียบกับ USB แล้ว

### ปัญหา: "หมดเวลารอบัตร"
**แก้**: ใส่บัตรให้ชิพหันเข้าหาเครื่องอ่าน

---

## 📖 เอกสารเพิ่มเติม

- `PRODUCTION_READY_CHECKLIST.md` - เช็คลิสต์ครบถ้วน
- `NHSO_CARD_READER_GUIDE.md` - คู่มือละเอียด
- `README.md` - ข้อมูลโปรเจกต์

---

**พร้อมใช้งานแล้ว! 🎉**















