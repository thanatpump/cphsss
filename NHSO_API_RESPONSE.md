# โครงสร้าง Response จาก API สปสช

## 📤 Request ที่ส่งไปยัง API สปสช

```json
POST https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
Headers:
  Content-Type: application/json
  token: <NHSO_TOKEN>
  User-Agent: SSO-Chaiyaphum/1.0

Body:
{
  "pid": "1234567890123",
  "hcode": "11001",
  "correlationId": "SSO-1234567890123",
  "date_visit": "2025-01-24"
}
```

---

## 📥 Response จาก API สปสช (ดิบ)

**หมายเหตุ:** โครงสร้างนี้เป็นตัวอย่างที่คาดการณ์ไว้ อาจแตกต่างกันตามเอกสาร API จริงของ สปสช

```json
{
  "title": "นาย",
  "fname": "สมชาย",
  "lname": "ใจดี",
  "mainInscl": {
    "inscl": "UCS",
    "insclCode": "UCS",
    "dateexp": "2025-12-31",
    "hmain": {
      "hcode": "11001",
      "hCode": "11001",
      "hname": "โรงพยาบาลชัยภูมิ",
      "hName": "โรงพยาบาลชัยภูมิ"
    }
  },
  "subInscl": [
    {
      "inscl": "SSS",
      "insclCode": "SSS",
      "status": "active"
    }
  ],
  "budget": {
    "allocated": "150000",
    "used": "45000",
    "remaining": "105000"
  },
  "lastVisit": "2025-01-10"
}
```

---

## 🔄 Response ที่แปลงแล้ว (ที่ Frontend ใช้)

### โครงสร้าง Response หลัก

```json
{
  "success": true,
  "data": {
    // ข้อมูลที่แปลงแล้ว
  },
  "source": "nhso"
}
```

### โครงสร้าง `data` Object

```typescript
{
  citizen_id: string;              // เลขบัตรประชาชน 13 หลัก
  patient_name: string;            // ชื่อ-นามสกุล (จากบัตรหรือ API)
  main_right: {                    // สิทธิ์การรักษาหลัก
    code: string;                  // รหัสสิทธิ์ (UCS/SSS/OFC/etc.)
    name: string;                  // ชื่อสิทธิ์ (ภาษาไทย)
    hospital_code: string;         // รหัสหน่วยบริการหลัก
    hospital_name: string;         // ชื่อหน่วยบริการหลัก
    expire_date: string;           // วันหมดอายุสิทธิ์ (YYYY-MM-DD)
  },
  sub_rights: Array<{             // สิทธิ์เสริม (ถ้ามี)
    code: string;                  // รหัสสิทธิ์
    name: string;                  // ชื่อสิทธิ์ (ภาษาไทย)
    status: string;                // สถานะ (active/inactive)
  }>,
  claim_info: {                    // ข้อมูลการเบิกจ่าย
    total_allocated: number;       // งบประมาณที่จัดสรร (บาท)
    total_used: number;            // งบที่ใช้ไปแล้ว (บาท)
    remaining: number;             // งบคงเหลือ (บาท)
    last_claim_date: string;       // วันที่เบิกล่าสุด (YYYY-MM-DD)
  }
}
```

---

## 📋 ตัวอย่าง Response ครบถ้วน

### ตัวอย่างที่ 1: บัตรทอง (UCS)

```json
{
  "success": true,
  "data": {
    "citizen_id": "3101234567890",
    "patient_name": "นายสมชาย ใจดี",
    "main_right": {
      "code": "UCS",
      "name": "หลักประกันสุขภาพถ้วนหน้า (บัตรทอง)",
      "hospital_code": "11001",
      "hospital_name": "โรงพยาบาลชัยภูมิ",
      "expire_date": "2025-12-31"
    },
    "sub_rights": [
      {
        "code": "SSS",
        "name": "ประกันสังคม",
        "status": "active"
      }
    ],
    "claim_info": {
      "total_allocated": 150000.00,
      "total_used": 45000.00,
      "remaining": 105000.00,
      "last_claim_date": "2025-01-10"
    }
  },
  "source": "nhso"
}
```

### ตัวอย่างที่ 2: ประกันสังคม (SSS)

```json
{
  "success": true,
  "data": {
    "citizen_id": "3109876543210",
    "patient_name": "นางสมหญิง รักดี",
    "main_right": {
      "code": "SSS",
      "name": "ประกันสังคม",
      "hospital_code": "11002",
      "hospital_name": "โรงพยาบาลบำเหน็จณรงค์",
      "expire_date": "2026-06-30"
    },
    "sub_rights": [],
    "claim_info": {
      "total_allocated": 200000.00,
      "total_used": 125000.00,
      "remaining": 75000.00,
      "last_claim_date": "2025-01-15"
    }
  },
  "source": "nhso"
}
```

### ตัวอย่างที่ 3: ข้าราชการ (OFC)

```json
{
  "success": true,
  "data": {
    "citizen_id": "3105555555555",
    "patient_name": "นางสาวสมใส สวยงาม",
    "main_right": {
      "code": "OFC",
      "name": "ข้าราชการ",
      "hospital_code": "11003",
      "hospital_name": "โรงพยาบาลคอนสาร",
      "expire_date": "2027-12-31"
    },
    "sub_rights": [
      {
        "code": "UCS",
        "name": "หลักประกันสุขภาพถ้วนหน้า (บัตรทอง)",
        "status": "active"
      }
    ],
    "claim_info": {
      "total_allocated": 500000.00,
      "total_used": 320000.00,
      "remaining": 180000.00,
      "last_claim_date": "2025-01-20"
    }
  },
  "source": "nhso"
}
```

---

## 🏷️ รหัสสิทธิ์ที่รองรับ

| รหัส | ชื่อสิทธิ์ | คำอธิบาย |
|------|----------|----------|
| **UCS** | หลักประกันสุขภาพถ้วนหน้า (บัตรทอง) | สิทธิ์หลักประกันสุขภาพถ้วนหน้า |
| **SSS** | ประกันสังคม | สิทธิ์ประกันสังคม |
| **OFC** | ข้าราชการ | สิทธิ์ข้าราชการ |
| **LGO** | องค์กรปกครองส่วนท้องถิ่น | สิทธิ์องค์กรปกครองส่วนท้องถิ่น |
| **WEL** | สวัสดิการรักษาพยาบาล | สวัสดิการรักษาพยาบาล |
| **OTH** | อื่นๆ | สิทธิ์อื่นๆ |

---

## ❌ Response เมื่อเกิด Error

### Error: Token ไม่ถูกต้อง

```json
{
  "success": false,
  "error": "API สปสช ส่งข้อผิดพลาด: 401 Unauthorized",
  "details": "Invalid token"
}
```

### Error: Timeout

```json
{
  "success": false,
  "error": "การเชื่อมต่อกับ API สปสช หมดเวลา กรุณาลองใหม่อีกครั้ง"
}
```

### Error: Network Error

```json
{
  "success": false,
  "error": "ไม่สามารถเชื่อมต่อกับ API สปสช ได้: Network request failed"
}
```

### Error: เลขบัตรประชาชนไม่ถูกต้อง

```json
{
  "success": false,
  "error": "เลขบัตรประชาชนไม่ถูกต้อง"
}
```

---

## 🔍 การแมปข้อมูลจาก API สปสช

ระบบจะแปลงข้อมูลจาก API สปสช ดังนี้:

### 1. ข้อมูลผู้ป่วย

| API สปสช (ดิบ) | แปลงเป็น |
|---------------|----------|
| `nhsoData.title` | `patient_name` (ส่วนต้น) |
| `nhsoData.fname` | `patient_name` (ส่วนกลาง) |
| `nhsoData.lname` | `patient_name` (ส่วนท้าย) |

### 2. สิทธิ์หลัก

| API สปสช (ดิบ) | แปลงเป็น |
|---------------|----------|
| `mainInscl.inscl` หรือ `mainInscl.insclCode` | `main_right.code` |
| `mainInscl.dateexp` หรือ `mainInscl.dateExp` | `main_right.expire_date` |
| `hmain.hcode` หรือ `hmain.hCode` | `main_right.hospital_code` |
| `hmain.hname` หรือ `hmain.hName` | `main_right.hospital_name` |

### 3. สิทธิ์เสริม

| API สปสช (ดิบ) | แปลงเป็น |
|---------------|----------|
| `subInscl[].inscl` หรือ `subInscl[].insclCode` | `sub_rights[].code` |
| `subInscl[].status` | `sub_rights[].status` |

### 4. ข้อมูลการเบิกจ่าย

| API สปสช (ดิบ) | แปลงเป็น |
|---------------|----------|
| `budget.allocated` | `claim_info.total_allocated` (แปลงเป็น number) |
| `budget.used` | `claim_info.total_used` (แปลงเป็น number) |
| `budget.remaining` | `claim_info.remaining` (แปลงเป็น number) |
| `lastVisit` | `claim_info.last_claim_date` |

---

## 📝 หมายเหตุสำคัญ

1. **โครงสร้าง Response จาก API สปสช:**
   - โครงสร้างที่แสดงด้านบนเป็นตัวอย่างที่คาดการณ์ไว้
   - โครงสร้างจริงอาจแตกต่างกันตามเอกสาร API ของ สปสช
   - ต้องตรวจสอบโครงสร้างจริงจาก API และปรับ `transformNHSOData()` ให้ตรง

2. **การแปลงข้อมูล:**
   - ระบบจะลองอ่านข้อมูลหลายรูปแบบ (เช่น `inscl` หรือ `insclCode`)
   - ถ้าไม่มีข้อมูล จะใช้ค่า default
   - วันที่จะอยู่ในรูปแบบ `YYYY-MM-DD`

3. **ข้อมูลชื่อผู้ป่วย:**
   - ถ้าอ่านบัตรได้ ระบบจะใช้ชื่อจากบัตรแทนชื่อจาก API
   - ดูที่ `app/allocation-check/data/page.tsx` บรรทัด 147-149

4. **ค่าที่อาจเป็น null หรือ empty:**
   - `sub_rights` อาจเป็น array ว่าง `[]`
   - `hospital_code` และ `hospital_name` อาจเป็น string ว่าง `""`
   - `claim_info` อาจมีค่าเป็น 0 ถ้าไม่มีข้อมูล

---

## 🔧 การปรับแต่งโครงสร้างข้อมูล

ถ้าโครงสร้างข้อมูลจาก API สปสช แตกต่างจากที่คาดการณ์ไว้:

**แก้ไขที่:** `app/api/nhso-check/route.ts`

**ฟังก์ชัน:** `transformNHSOData(nhsoData: any, citizenId: string)`

```typescript
function transformNHSOData(nhsoData: any, citizenId: string) {
  // ปรับแต่งการแปลงข้อมูลตามโครงสร้างจริง
  // ...
}
```

**วิธีตรวจสอบโครงสร้างจริง:**
1. ดู Console Log: `console.log('✅ ได้รับข้อมูลจาก NHSO API:', data);`
2. ดูใน Browser Network Tab
3. ดูใน Server Log (Terminal)

---

**อัปเดตล่าสุด:** 2025-01-24

