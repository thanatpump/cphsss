# 🔄 Flow การทำงานของข้อมูลบัตรประชาชน

## 📋 สรุป Flow ทั้งหมด

```
ThaiIDCardReader.exe (localhost:8443)
    ↓
Desktop App (main.js) - อ่านบัตรอัตโนมัติทุก 2 วินาที
    ↓
แปลงข้อมูล: citizenId → citizen_id (13 หลัก)
    ↓
PUT /api/card-reader (Server)
    ↓
Memory Storage (เก็บข้อมูลชั่วคราว)
    ↓
POST /api/card-reader (Frontend เรียก)
    ↓
แสดงข้อมูลบนหน้าเว็บ
    ↓
POST /api/nhso-check (ส่ง citizen_id ไปยัง NHSO API)
```

---

## 🔍 รายละเอียดแต่ละขั้นตอน

### 1. ThaiIDCardReader.exe
- **Input**: บัตรประชาชน
- **Output**: JSON data
  ```json
  {
    "citizenId": "1234567890123",
    "titleTh": "นาย",
    "firstNameTh": "สมชาย",
    "lastNameTh": "ใจดี",
    "birthDate": "1990-05-15",
    "address": "...",
    "issueDate": "2020-01-10",
    "expireDate": "2030-01-10"
  }
  ```

### 2. Desktop App (main.js)
- **อ่านบัตร**: Poll ทุก 2 วินาที
- **แปลงข้อมูล**: 
  - `citizenId` → `citizen_id` (string, trim, ตรวจสอบ 13 หลัก)
  - `titleTh` → `title_th`
  - `firstNameTh` → `first_name_th`
  - `lastNameTh` → `last_name_th`
  - `birthDate` → `birth_date`
  - `address` → `address`
  - `issueDate` → `issue_date`
  - `expireDate` → `expire_date`
- **ตรวจสอบ**: `citizen_id` ต้องเป็นตัวเลข 13 หลัก
- **ส่งข้อมูล**: PUT `/api/card-reader`

### 3. API card-reader (PUT)
- **รับข้อมูล**: `citizen_id`, `title_th`, `first_name_th`, `last_name_th`, `birth_date`, `address`, `issue_date`, `expire_date`
- **ตรวจสอบ**: 
  - `citizen_id` ต้องมีค่า
  - `citizen_id` ต้องเป็นตัวเลข 13 หลัก
- **เก็บข้อมูล**: Memory Storage (พร้อม timestamp)

### 4. API card-reader (POST)
- **อ่านข้อมูล**: จาก Memory Storage
- **ตรวจสอบ**: ข้อมูลต้องใหม่ (ภายใน 30 วินาที)
- **ส่งกลับ**: ข้อมูลบัตรทั้งหมด

### 5. Frontend (allocation-check/data)
- **แสดงข้อมูล**: ข้อมูลบัตรประชาชน
- **ส่งไปยัง NHSO**: `citizen_id` (13 หลัก)

### 6. API nhso-check
- **รับข้อมูล**: `citizen_id`, `hcode`
- **ตรวจสอบ**: `citizen_id.length === 13`
- **ส่งไปยัง NHSO API**: `pid: citizen_id`

---

## ✅ การตรวจสอบความสอดคล้อง

### Format ข้อมูลที่สอดคล้องกัน:

```typescript
interface CardReaderData {
  citizen_id: string;      // 13 หลัก, ตัวเลขเท่านั้น
  title_th: string;         // เช่น "นาย", "นาง", "นางสาว"
  first_name_th: string;     // ชื่อภาษาไทย
  last_name_th: string;      // นามสกุลภาษาไทย
  birth_date: string;        // YYYY-MM-DD
  address: string;           // ที่อยู่
  issue_date: string;        // YYYY-MM-DD
  expire_date: string;       // YYYY-MM-DD
}
```

### การตรวจสอบที่ทำแล้ว:

1. ✅ **Desktop App**: ตรวจสอบ `citizen_id` เป็นตัวเลข 13 หลัก
2. ✅ **API card-reader (PUT)**: ตรวจสอบ `citizen_id` เป็นตัวเลข 13 หลัก
3. ✅ **API nhso-check**: ตรวจสอบ `citizen_id.length === 13`
4. ✅ **การแปลงข้อมูล**: ทุก field ถูก trim() เพื่อลบ whitespace
5. ✅ **การแปลงชื่อ field**: สอดคล้องกันทุกจุด (snake_case)

---

## 🎯 สรุป

**ระบบทำงานสอดคล้องกันแล้ว!** ✅

- ข้อมูลถูกแปลง format อย่างสม่ำเสมอ
- การตรวจสอบ `citizen_id` ถูกต้องทุกจุด
- ข้อมูลถูก trim() เพื่อลบ whitespace
- Flow การส่งข้อมูลชัดเจนและถูกต้อง
