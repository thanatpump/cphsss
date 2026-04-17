# คำแนะนำการตั้งค่า NHSO API

## ขั้นตอนที่ 1: สร้างไฟล์ .env.local

สร้างไฟล์ `.env.local` ในโฟลเดอร์หลัก (root) ของโปรเจค แล้วใส่ Token ดังนี้:

```bash
# NHSO API Configuration
NHSO_TOKEN=0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

## ขั้นตอนที่ 2: Restart Development Server

หลังจากสร้างไฟล์ `.env.local` แล้ว ให้ทำการ restart development server:

```bash
# หยุด server เดิม (Ctrl+C)
# แล้วเริ่มใหม่
npm run dev
```

## การทำงานของระบบ

### 1. API อ่านบัตรประชาชน
- **Endpoint**: `POST /api/card-reader`
- **ฟังก์ชัน**: อ่านข้อมูลจากบัตรประชาชนผ่าน Smart Card Reader
- **ข้อมูลที่ได้**:
  - เลขบัตรประชาชน 13 หลัก
  - ชื่อ-นามสกุล
  - วันเกิด
  - ที่อยู่
  - วันหมดอายุบัตร

### 2. API ตรวจสอบสิทธิ์ สปสช
- **Endpoint**: `POST /api/nhso-check`
- **ฟังก์ชัน**: เรียก API สปสช เพื่อตรวจสอบสิทธิ์การรักษา
- **ข้อมูลที่ส่ง**:
  ```json
  {
    "citizen_id": "1234567890123",
    "hcode": "11001"
  }
  ```
- **ข้อมูลที่ได้รับ**:
  - สิทธิ์การรักษาหลัก (UCS/SSS/OFC)
  - หน่วยบริการประจำ
  - งบประมาณที่จัดสรร/ใช้ไป/คงเหลือ
  - สิทธิ์เสริม (ถ้ามี)

## โครงสร้างการเรียก API

```
Frontend (allocation-check/data)
    ↓
    ├─→ POST /api/card-reader
    │   └─→ อ่านบัตรประชาชน
    │
    └─→ POST /api/nhso-check
        ├─→ เชื่อมต่อ NHSO API
        │   (https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1)
        │
        └─→ ส่งข้อมูลสิทธิ์กลับมา
```

## Development Mode

ในโหมด development (`NODE_ENV=development`):
- ถ้า API สปสช ไม่ตอบกลับ ระบบจะใช้ Mock Data แทน
- สามารถทดสอบระบบได้โดยไม่ต้องเชื่อมต่อกับ Smart Card Reader จริง

## Production Mode

ในโหมด production:
- ต้องมี Token ที่ถูกต้อง
- ต้องเชื่อมต่อกับ API สปสช ได้
- ต้องมี Smart Card Reader และ Driver ที่ทำงานได้

## การปรับแต่ง API Response

ถ้าโครงสร้างข้อมูลจาก API สปสช แตกต่างจากที่คาดไว้ สามารถปรับแต่งได้ที่:

**ไฟล์**: `app/api/nhso-check/route.ts`

**ฟังก์ชัน**: `transformNHSOData()`

```typescript
function transformNHSOData(nhsoData: any, citizenId: string) {
  // ปรับแต่งการแปลงข้อมูลตามโครงสร้างจริงของ API
  // ...
}
```

## Troubleshooting

### ปัญหา: API ไม่ตอบกลับ
- ตรวจสอบว่า Token ถูกต้อง
- ตรวจสอบว่า API URL ถูกต้อง
- ตรวจสอบ Network/Firewall

### ปัญหา: ข้อมูลไม่ถูกต้อง
- ตรวจสอบโครงสร้างข้อมูลจาก API
- แก้ไขฟังก์ชัน `transformNHSOData()`
- ตรวจสอบ Console Log เพื่อดู response จริง

### ปัญหา: Smart Card Reader ไม่ทำงาน
- ตรวจสอบว่าติดตั้ง Driver แล้ว
- ตรวจสอบว่าเครื่องอ่านบัตรเสียบอยู่
- ลอง restart local service

## ข้อมูลเพิ่มเติม

สำหรับข้อมูลเพิ่มเติมเกี่ยว API สปสช:
- เอกสาร API: ติดต่อเจ้าหน้าที่ สปสช
- ขอ Token: ติดต่อเจ้าหน้าที่ สปสช
- Support: support@nhso.go.th





