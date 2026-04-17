# ระบบจัดการข้อมูล SSO

ระบบจัดการข้อมูลสำหรับนำเข้าและจัดการข้อมูลจากไฟล์ XML 4 ประเภท ได้แก่ SIGNSTMM, SIGNSTMS, SOGNSTMM, และ SOGNSTMP

## คุณสมบัติ

### 📊 ประเภทข้อมูลที่รองรับ

1. **SIGNSTMM** - ข้อมูลการชำระเงินผู้ป่วยใน
2. **SIGNSTMS** - ข้อมูลการชำระเงินผู้ป่วยใน (สรุป)
3. **SOGNSTMM** - ข้อมูลการชำระเงินผู้ป่วยนอก
4. **SOGNSTMP** - ข้อมูลการชำระเงินผู้ป่วยนอก (พิเศษ)

### 🚀 ฟีเจอร์หลัก

- **อัปโหลดไฟล์ XML** - รองรับการอัปโหลดไฟล์ XML สำหรับแต่ละประเภทข้อมูล
- **แสดงข้อมูลแบบตาราง** - แสดงข้อมูลที่นำเข้าแล้วในรูปแบบตารางที่อ่านง่าย
- **ระบบแบ่งหน้า (Pagination)** - แสดงข้อมูลแบบแบ่งหน้าเพื่อประสิทธิภาพ
- **สถิติฐานข้อมูล** - แสดงสถิติข้อมูลของแต่ละตาราง
- **UI ที่สวยงาม** - ใช้ Tailwind CSS สำหรับการออกแบบที่ทันสมัย

## การติดตั้ง

1. Clone โปรเจกต์:
```bash
git clone <repository-url>
cd sso
```

2. ติดตั้ง dependencies:
```bash
npm install
```

3. รันเซิร์ฟเวอร์สำหรับการพัฒนา:
```bash
npm run dev
```

4. เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

## การใช้งาน

### หน้าหลัก
- แสดงเมนูหลักสำหรับเข้าถึงฟีเจอร์ต่างๆ
- แบ่งเป็น 4 ส่วนตามประเภทข้อมูล
- มีลิงก์ไปยังหน้าสถิติฐานข้อมูล

### การอัปโหลดข้อมูล
1. คลิกที่ "อัปโหลดข้อมูล" สำหรับประเภทข้อมูลที่ต้องการ
2. เลือกไฟล์ XML ที่ต้องการอัปโหลด
3. คลิก "อัปโหลดไฟล์" เพื่อเริ่มการนำเข้าข้อมูล
4. ระบบจะแสดงผลการอัปโหลด

### การดูข้อมูล
1. คลิกที่ "ดูข้อมูล" สำหรับประเภทข้อมูลที่ต้องการ
2. ข้อมูลจะแสดงในรูปแบบตาราง
3. ใช้ปุ่มแบ่งหน้าเพื่อดูข้อมูลเพิ่มเติม

### สถิติฐานข้อมูล
- แสดงจำนวนรายการในแต่ละตาราง
- แสดงจำนวนรายการทั้งหมดในระบบ
- มีลิงก์ไปยังหน้าข้อมูลของแต่ละประเภท

## โครงสร้างฐานข้อมูล

### ตาราง SIGNSTMM
- ข้อมูลการชำระเงินผู้ป่วยใน
- ฟิลด์หลัก: STMdoc, hn, pid, name, total, invno, created_at

### ตาราง SIGNSTMS
- ข้อมูลการชำระเงินผู้ป่วยใน (สรุป)
- ฟิลด์หลัก: stmno, hn, an, pid, name, drg, rw, created_at

### ตาราง SOGNSTMM
- ข้อมูลการชำระเงินผู้ป่วยนอก
- ฟิลด์หลัก: STMdoc, hn, pid, name, total, invno, created_at

### ตาราง SOGNSTMP
- ข้อมูลการชำระเงินผู้ป่วยนอก (พิเศษ)
- ฟิลด์หลัก: STMdoc, hn, pid, name, total, invno, ExtP, created_at

## เทคโนโลยีที่ใช้

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite
- **XML Parsing**: xml2js
- **Date Handling**: date-fns

## โครงสร้างโปรเจกต์

```
sso/
├── app/
│   ├── api/
│   │   ├── data-signstmm/
│   │   ├── data-signstms/
│   │   ├── data-sognstmm/
│   │   ├── data-sognstmp/
│   │   ├── upload-signstmm/
│   │   ├── upload-signstms/
│   │   ├── upload-sognstmm/
│   │   ├── upload-sognstmp/
│   │   └── db-info/
│   ├── data-signstmm/
│   ├── data-signstms/
│   ├── data-sognstmm/
│   ├── data-sognstmp/
│   ├── upload-signstmm/
│   ├── upload-signstms/
│   ├── upload-sognstmm/
│   ├── upload-sognstmp/
│   ├── db-info/
│   └── page.tsx
├── lib/
│   └── database.ts
├── sso.db
└── package.json
```

## การพัฒนา

### การเพิ่มฟีเจอร์ใหม่
1. สร้าง API route ใน `app/api/`
2. สร้างหน้า UI ใน `app/`
3. อัปเดตฐานข้อมูลใน `lib/database.ts` หากจำเป็น

### การแก้ไขบั๊ก
1. ตรวจสอบ console logs ในเบราว์เซอร์
2. ตรวจสอบ server logs ใน terminal
3. ตรวจสอบฐานข้อมูล SQLite

## การ Deploy

### Vercel
1. Push โค้ดไปยัง GitHub
2. เชื่อมต่อกับ Vercel
3. Deploy อัตโนมัติ

### Server อื่นๆ
1. Build โปรเจกต์: `npm run build`
2. Start production server: `npm start`

## การสนับสนุน

หากมีปัญหาหรือคำถาม กรุณาสร้าง issue ใน GitHub repository

## License

MIT License
