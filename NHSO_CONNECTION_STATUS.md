# สถานะการเชื่อมต่อ API สปสช

## 📋 สรุปสถานะปัจจุบัน

ระบบมีการตั้งค่า API สปสช ไว้แล้ว แต่มี **fallback mechanism** ที่จะใช้ Mock Data ถ้าไม่สามารถเชื่อมต่อได้

## 🔍 วิธีตรวจสอบว่ามันเชื่อมต่อได้จริงหรือไม่

### 1. ตรวจสอบใน Console Log

เมื่อใช้งานหน้า `/allocation-check/data` และอ่านบัตรแล้ว ดูที่ Console (F12) จะเห็น:

**ถ้าเชื่อมต่อได้จริง:**
```
✅ ได้รับข้อมูลจาก API สปสช สำเร็จ
🔄 กำลังเรียก NHSO API... { pid: 'xxx', hcode: 'xxx' }
✅ ได้รับข้อมูลจาก NHSO API: {...}
```

**ถ้าใช้ Mock Data (เชื่อมต่อไม่ได้):**
```
⚠️ ใช้ข้อมูลจำลอง (Mock Data) เนื่องจากไม่สามารถเชื่อมต่อ API สปสช ได้
⚠️ ใช้ Mock Data แทน
```

### 2. ตรวจสอบ Response Source

ในโค้ด `app/allocation-check/data/page.tsx` มีการตรวจสอบ `result.source`:

```typescript
if (result.source === 'mock') {
  console.log('⚠️ ใช้ข้อมูลจำลอง (Mock Data)');
} else {
  console.log('✅ ได้รับข้อมูลจาก API สปสช สำเร็จ');
}
```

### 3. ทดสอบผ่าน API Test Endpoint

มี API endpoint สำหรับทดสอบ: `/api/nhso-test`

**วิธีใช้:**
```bash
# ทดสอบใน browser หรือ curl
http://localhost:3000/api/nhso-test?pid=1234567890123&hcode=11001
```

**ผลลัพธ์ที่คาดหวัง:**
- ถ้าเชื่อมต่อได้: จะเห็น response จาก API สปสช จริง
- ถ้าเชื่อมต่อไม่ได้: จะเห็น error message

## 🚨 ปัญหาที่อาจเกิดขึ้น

### 1. API สปสช ไม่ตอบกลับ

**สาเหตุที่เป็นไปได้:**
- Token หมดอายุหรือไม่ถูกต้อง
- API URL เปลี่ยน
- Server IP ไม่ได้ Whitelist กับ สปสช
- Firewall บล็อกการเชื่อมต่อ
- Network timeout

**วิธีแก้ไข:**
- ตรวจสอบ Token กับเจ้าหน้าที่ สปสช
- ตรวจสอบ Network/Firewall settings
- ตรวจสอบ Console Log เพื่อดู error message

### 2. ใช้ Mock Data อยู่เสมอ

**สาเหตุที่เป็นไปได้:**
- API สปสช ไม่ตอบกลับ (ดูข้อ 1)
- Timeout (10 วินาที)
- Error ในรูปแบบการส่ง request

**วิธีตรวจสอบ:**
1. ดู Console Log ใน server (terminal ที่รัน `npm run dev`)
2. ดู Network Tab ใน Browser (F12)
3. ทดสอบผ่าน `/api/nhso-test`

## ✅ วิธีทำให้เชื่อมต่อได้จริง

### 1. ตรวจสอบ Token

ไฟล์ `.env.local` ต้องมี:
```bash
NHSO_TOKEN=your-token-here
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

### 2. ตรวจสอบ API URL

API URL ที่ใช้:
```
https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

**หมายเหตุ:** API URL นี้เป็นตัวอย่าง อาจต้องตรวจสอบกับเจ้าหน้าที่ สปสช ว่า URL ที่ถูกต้องคืออะไร

### 3. ตรวจสอบ Request Format

ตอนนี้ระบบส่ง request ในรูปแบบ:
```json
{
  "pid": "1234567890123",
  "hcode": "11001",
  "correlationId": "SSO-1234567890",
  "date_visit": "2025-01-24"
}
```

**หมายเหตุ:** รูปแบบนี้อาจต้องปรับตามเอกสาร API จริงของ สปสช

### 4. ตรวจสอบ Headers

ตอนนี้ระบบส่ง headers:
```
Content-Type: application/json
token: <your-token>
User-Agent: SSO-Chaiyaphum/1.0
```

**หมายเหตุ:** บาง API อาจใช้ `Authorization: Bearer <token>` แทน `token: <token>`

## 🔧 การแก้ไขโค้ด

### ถ้า API สปสช ใช้รูปแบบแตกต่าง

แก้ไขที่: `app/api/nhso-check/route.ts`

**ฟังก์ชันที่ต้องแก้:**
1. `transformNHSOData()` - แปลง response จาก API สปสช
2. Request body format - ปรับตามเอกสาร API
3. Headers - ปรับตามเอกสาร API

### ถ้าต้องการปิดการใช้ Mock Data

แก้ไขที่: `app/api/nhso-check/route.ts`

แทนที่จะ return mock data เมื่อ error ให้ return error จริง:

```typescript
// แทนที่
return NextResponse.json({
  success: true,
  data: getMockData(citizen_id),
  source: 'mock'
});

// ด้วย
return NextResponse.json({
  success: false,
  error: errorMessage
}, { status: 500 });
```

## 📊 การตรวจสอบสถานะจริง

### วิธีที่ 1: ดู Server Log

เมื่อเรียก API จะเห็น log ใน terminal:
- `🔄 กำลังเรียก NHSO API...` = กำลังเชื่อมต่อ
- `✅ ได้รับข้อมูลจาก NHSO API:` = เชื่อมต่อสำเร็จ
- `❌ NHSO API Error:` = เกิด error
- `⚠️ ใช้ Mock Data แทน` = ใช้ mock data

### วิธีที่ 2: ใช้ Browser DevTools

1. เปิด Browser DevTools (F12)
2. ไปที่ Tab "Network"
3. เรียกใช้หน้า `/allocation-check/data`
4. อ่านบัตร
5. ดู request ไปที่ `/api/nhso-check`
6. ดู response - ถ้า `source: "nhso"` = ใช้ข้อมูลจริง, ถ้า `source: "mock"` = ใช้ mock data

### วิธีที่ 3: ทดสอบ API โดยตรง

```bash
curl -X POST http://localhost:3000/api/nhso-check \
  -H "Content-Type: application/json" \
  -d '{"citizen_id":"1234567890123","hcode":"11001"}'
```

ดู response:
- ถ้า `"source": "nhso"` = เชื่อมต่อได้จริง
- ถ้า `"source": "mock"` = ใช้ mock data

## 🎯 สรุป

ระบบสามารถเชื่อมต่อกับ API สปสช ได้ **ถ้า:**
1. ✅ มี Token ที่ถูกต้อง
2. ✅ API URL ถูกต้อง
3. ✅ Network เชื่อมต่อได้
4. ✅ Server IP ได้รับการ Whitelist (ถ้าจำเป็น)
5. ✅ Request format ถูกต้องตามเอกสาร API

**ถ้าเชื่อมต่อไม่ได้:**
- ระบบจะใช้ Mock Data แทน (fallback)
- ผู้ใช้ยังสามารถทดสอบระบบได้
- แต่ข้อมูลจะไม่ใช่ข้อมูลจริง

