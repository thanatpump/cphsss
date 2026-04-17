# 📋 คู่มือการใช้งาน Authen Code

## ✅ สิ่งที่สร้างเสร็จแล้ว

1. ✅ Table `authen_code` ในฐานข้อมูล
2. ✅ API Endpoint `/api/authen-code` (POST, GET)
3. ✅ ฟังก์ชัน Generate Authen Code
4. ✅ ปุ่มบันทึกในหน้าเว็บ
5. ✅ Error Handling และ Validation

---

## 🚀 ขั้นตอนการใช้งาน

### ขั้นตอนที่ 1: สร้าง Table ในฐานข้อมูล

**รัน SQL:**
```sql
-- Import ไฟล์ create_authen_code_table.sql
-- หรือรันคำสั่งนี้ใน phpMyAdmin/MySQL Client
CREATE TABLE IF NOT EXISTS authen_code (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hcode VARCHAR(10) NOT NULL,
  date VARCHAR(8) NOT NULL,
  time VARCHAR(8) NOT NULL,
  citizen_id VARCHAR(13) NOT NULL,
  authen VARCHAR(20) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_authen (authen),
  INDEX idx_citizen_id (citizen_id),
  INDEX idx_hcode_date (hcode, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### ขั้นตอนที่ 2: ทดสอบการใช้งาน

#### วิธีที่ 1: ทดสอบผ่านหน้าเว็บ

1. **เปิดหน้าเว็บ:**
   - ไปที่ `/allocation-check/data`
   - Login เข้าระบบ

2. **อ่านบัตรหรือกรอกเลขบัตร:**
   - อ่านบัตรผ่านเครื่องอ่านบัตร
   - หรือกรอกเลขบัตรด้วยตนเอง

3. **ตรวจสอบสิทธิ์:**
   - ระบบจะตรวจสอบสิทธิ์จาก NHSO API อัตโนมัติ

4. **กดปุ่ม "บันทึกข้อมูล":**
   - จะเห็นปุ่ม "บันทึกข้อมูล" สีเขียว
   - กดปุ่มเพื่อบันทึกข้อมูล authen_code
   - จะแสดงข้อความ "บันทึกสำเร็จ" เมื่อบันทึกเสร็จ

#### วิธีที่ 2: ทดสอบผ่าน API โดยตรง

**ใช้ curl:**
```bash
curl -X POST http://localhost:3000/api/authen-code \
  -H "Content-Type: application/json" \
  -d '{
    "hcode": "12345",
    "date": "12032025",
    "time": "11:30:21",
    "citizen_id": "1234567890123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authen": "45250312113021",
    "hcode": "12345",
    "date": "12032025",
    "time": "11:30:21",
    "citizen_id": "1234567890123"
  },
  "message": "บันทึกข้อมูลสำเร็จ"
}
```

---

## 📊 โครงสร้าง Authen Code

### รูปแบบการ Generate

```
[2 เลขท้ายของ hcode][2 หลักท้ายของปี][เดือน 2 หลัก][วัน 2 หลัก][เวลา hhmmss]
```

### ตัวอย่าง

**Input:**
- hcode: `12345`
- date: `12032025` (12 มีนาคม 2025)
- time: `11:30:21`

**Output:**
- authen: `45250312113021`
  - `45` = 2 เลขท้ายของ hcode (12345)
  - `25` = 2 หลักท้ายของปี (2025)
  - `03` = เดือน (มีนาคม)
  - `12` = วัน
  - `113021` = เวลา (11:30:21)

---

## 🔍 ตรวจสอบข้อมูลที่บันทึก

### ดูข้อมูลทั้งหมด

```bash
curl http://localhost:3000/api/authen-code
```

### ดูข้อมูลตาม citizen_id

```bash
curl "http://localhost:3000/api/authen-code?citizen_id=1234567890123"
```

### ดูข้อมูลตาม hcode

```bash
curl "http://localhost:3000/api/authen-code?hcode=12345"
```

---

## ⚠️ ข้อควรระวัง

1. **Authen Code ต้อง Unique:**
   - ถ้ามี authen code ซ้ำ จะไม่สามารถบันทึกได้
   - ระบบจะแสดง error "authen code นี้มีอยู่แล้วในระบบ"

2. **รูปแบบข้อมูล:**
   - `date`: ต้องเป็น `ddmmyyyy` (8 หลัก)
   - `time`: ต้องเป็น `HH:mm:ss` (8 ตัวอักษร)
   - `citizen_id`: ต้องเป็นตัวเลข 13 หลัก

3. **การบันทึก:**
   - บันทึกเมื่อกดปุ่ม "บันทึกข้อมูล" เท่านั้น
   - ไม่บันทึกอัตโนมัติเมื่ออ่านบัตรหรือตรวจสอบสิทธิ์

---

## ✅ Checklist การทดสอบ

- [ ] สร้าง table `authen_code` ในฐานข้อมูลแล้ว
- [ ] Restart Next.js server (ถ้าแก้ไขโค้ด)
- [ ] ทดสอบอ่านบัตรหรือกรอกเลขบัตร
- [ ] ทดสอบตรวจสอบสิทธิ์จาก NHSO API
- [ ] กดปุ่ม "บันทึกข้อมูล"
- [ ] ตรวจสอบว่าบันทึกสำเร็จ (แสดงข้อความ "บันทึกสำเร็จ")
- [ ] ตรวจสอบข้อมูลในฐานข้อมูลว่าถูกบันทึกหรือไม่

---

## 🐛 แก้ไขปัญหา

### ปัญหา: "ไม่สามารถบันทึกข้อมูลได้"

**สาเหตุที่เป็นไปได้:**
1. Table `authen_code` ยังไม่ได้สร้าง
2. Database connection ไม่ถูกต้อง
3. Authen code ซ้ำ (UNIQUE constraint)

**วิธีแก้:**
1. ตรวจสอบว่า table ถูกสร้างแล้ว
2. ตรวจสอบ `.env.local` ว่ามี database config ถูกต้อง
3. ตรวจสอบ logs ใน terminal

### ปัญหา: "authen code นี้มีอยู่แล้วในระบบ"

**สาเหตุ:**
- มีการบันทึกข้อมูลเดียวกันแล้ว (hcode, date, time, citizen_id เหมือนกัน)

**วิธีแก้:**
- ไม่เป็นปัญหา - ระบบป้องกันการบันทึกซ้ำอัตโนมัติ

---

## 📞 ติดต่อ

ถ้ามีปัญหา:
1. ตรวจสอบ logs ใน terminal
2. ตรวจสอบ Browser Console (F12)
3. ตรวจสอบข้อมูลในฐานข้อมูล
