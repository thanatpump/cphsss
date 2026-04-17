# ✅ Checklist สำหรับใช้งานจริง (Production)

## 📋 สิ่งที่ต้องทำก่อนใช้งานจริง

### ส่วนที่ 1: ฮาร์ดแวร์ 🔧

#### ✅ เครื่องอ่านบัตรประชาชน
- [ ] ซื้อเครื่องอ่านบัตร Smart Card Reader
- [ ] เสียบ USB เข้าเครื่อง Server/Computer ที่ใช้งาน
- [ ] ติดตั้ง Driver สำเร็จ
- [ ] ทดสอบอ่านบัตรได้

**ขั้นตอนติดตั้ง:**

**สำหรับ Windows:**
```cmd
1. เสียบเครื่องอ่านบัตรเข้า USB
2. Windows จะติดตั้ง driver อัตโนมัติ
3. ตรวจสอบใน Device Manager → Smart Card Readers
4. ต้องเห็นชื่อเครื่องอ่านบัตร
```

**สำหรับ macOS:**
```bash
# ติดตั้ง PC/SC Lite
brew install pcsc-lite

# ตรวจสอบ
pcsctest
```

**สำหรับ Linux/Ubuntu:**
```bash
# ติดตั้ง PCSC
sudo apt install pcscd pcsc-tools

# ตรวจสอบ
pcsc_scan
```

---

### ส่วนที่ 2: ซอฟต์แวร์ 💻

#### ✅ Local Card Reader Service

**ต้องสร้าง Service สำหรับอ่านบัตร:**

**ไฟล์: `card-reader-service.js`** (สร้างใหม่)

```javascript
const express = require('express');
const cors = require('cors');
const SmartCard = require('smartcard');

const app = express();
app.use(cors());
app.use(express.json());

// เริ่มต้น SmartCard
const Devices = SmartCard.Devices;
const devices = new Devices();

devices.on('device-activated', (event) => {
  console.log('🎴 พบเครื่องอ่านบัตร:', event.device.name);
});

// Endpoint สำหรับอ่านบัตร
app.post('/read-card', async (req, res) => {
  try {
    console.log('📖 กำลังอ่านบัตร...');
    
    // รอให้มีบัตรใส่เข้ามา
    const card = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('ไม่พบบัตร กรุณาใส่บัตรประชาชน'));
      }, 10000); // รอ 10 วินาที

      devices.on('card-inserted', (event) => {
        clearTimeout(timeout);
        resolve(event.card);
      });
    });

    console.log('✅ พบบัตร ATR:', card.getAtr());

    // อ่านข้อมูลจากบัตร (ต้องใช้ Thai ID Card library)
    // ตัวอย่างนี้เป็น pseudo-code
    const data = await readThaiIDCard(card);

    res.json({
      success: true,
      data: {
        citizen_id: data.citizenId,
        title_th: data.titleTh,
        first_name_th: data.firstNameTh,
        last_name_th: data.lastNameTh,
        birth_date: data.birthDate,
        address: data.address,
        issue_date: data.issueDate,
        expire_date: data.expireDate,
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ตรวจสอบสถานะ
app.get('/status', (req, res) => {
  const deviceList = devices.listDevices();
  res.json({
    success: true,
    status: deviceList.length > 0 ? 'connected' : 'not_connected',
    devices: deviceList.map(d => d.name)
  });
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`🎴 Card Reader Service running on http://localhost:${PORT}`);
  console.log('🔍 กำลังรอเครื่องอ่านบัตร...');
});
```

**รัน Service:**
```bash
cd /path/to/sso
node card-reader-service.js
```

#### ✅ แก้ไข API Route

**ไฟล์: `app/api/card-reader/route.ts`** (แก้ไข)

ตอนนี้ยังเป็น Mock อยู่ ต้องแก้เป็น:

```typescript
export async function POST(request: NextRequest) {
  try {
    // เรียก Local Card Reader Service
    const response = await fetch('http://localhost:8080/read-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('ไม่สามารถอ่านบัตรได้');
    }
    
    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      data: result.data,
      source: 'real' // ← บอกว่าเป็นข้อมูลจริง
    });
    
  } catch (error) {
    console.error('Card Reader Error:', error);
    
    // ถ้าอ่านไม่ได้ ให้ส่ง error กลับไป (ไม่ใช้ Mock)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'ไม่สามารถอ่านบัตรได้'
      },
      { status: 500 }
    );
  }
}
```

---

### ส่วนที่ 3: Network และ API 🌐

#### ✅ NHSO API Connection

**ตรวจสอบว่า:**
- [ ] Server เชื่อมต่ออินเทอร์เน็ตได้
- [ ] Firewall ไม่บล็อก API สปสช
- [ ] IP Address ของ Server ถูก Whitelist แล้ว (ติดต่อ สปสช)
- [ ] Token ยังไม่หมดอายุ

**วิธีทดสอบ:**
```bash
# เปิด browser ไปที่
http://your-server:3000/api/nhso-test?pid=3xxxxxxxxxxxx&hcode=11001

# ดู Console Log
# ถ้าสำเร็จจะเห็น:
✅ ได้รับข้อมูลจาก NHSO API สำเร็จ

# ถ้าไม่สำเร็จ:
❌ NHSO API Error: timeout/unauthorized
```

#### ✅ ติดต่อ สปสช

**สิ่งที่ต้องสอบถาม:**
1. Token `0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed` ยังใช้ได้อยู่ไหม?
2. IP ของ Server ต้อง Whitelist ไหม?
3. API Endpoint ถูกต้องแล้วใช่ไหม?
4. มีเอกสาร API Documentation ไหม?

**ติดต่อ:**
- ☎️ โทร: 0-2141-4000
- 📧 Email: callcenter@nhso.go.th
- 🌐 Website: https://www.nhso.go.th

---

### ส่วนที่ 4: Testing 🧪

#### ✅ Test Checklist

**1. ทดสอบเครื่องอ่านบัตร:**
```bash
# Start Card Reader Service
node card-reader-service.js

# ทดสอบอ่านบัตร
curl -X POST http://localhost:8080/read-card

# ควรได้เลขบัตร 13 หลักจริง
```

**2. ทดสอบระบบ SSO:**
```bash
# Start SSO System
npm start

# เปิด browser
http://localhost:3000

# 1. ไปที่ "ตรวจสอบข้อมูลการจัดสรรเงิน"
# 2. Login
# 3. ใส่บัตรประชาชนเข้าเครื่องอ่าน
# 4. กดปุ่ม "เสียบบัตรและอ่านข้อมูล"
```

**3. ตรวจสอบ Console Log:**
```
✅ อ่านบัตรสำเร็จ: 3xxxxxxxxxxxx
🔄 กำลังเรียก NHSO API...
✅ ได้รับข้อมูลจาก NHSO API สำเร็จ!
```

**ถ้าเห็น 3 ✅ นี้ = พร้อมใช้งานจริง!**

---

## 🎯 Flow การทำงานจริง

```
┌─────────────────────────────────────────────┐
│  1. ผู้ใช้งานเสียบบัตรประชาชน              │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  2. เครื่องอ่านบัตรอ่านเลขบัตร 13 หลัก    │
│     เช่น: 3101234567890                     │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  3. Card Reader Service ส่งข้อมูลไปยัง     │
│     Next.js API (/api/card-reader)          │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  4. Next.js API เรียก NHSO API             │
│     URL: ucws.nhso.go.th                    │
│     Token: 0c9c4d14-d3c5-49b7...            │
│     PID: 3101234567890                      │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  5. NHSO API ตรวจสอบในฐานข้อมูล            │
│     - ค้นหาเลขบัตร                          │
│     - ตรวจสอบสิทธิ์                         │
│     - ดึงข้อมูลงบประมาณ                    │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  6. ส่งข้อมูลสิทธิ์กลับมา                  │
│     - สิทธิ์หลัก (UCS/SSS/OFC)              │
│     - หน่วยบริการประจำ                      │
│     - งบประมาณ (จัดสรร/ใช้/คงเหลือ)        │
└──────────────┬──────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│  7. แสดงผลบนหน้าจอ ✅                      │
└─────────────────────────────────────────────┘
```

---

## ⚠️ ข้อควรระวัง

### 1. Security
- 🔐 ใช้ HTTPS ใน Production
- 🔐 เก็บ Token ไว้ใน Environment Variables
- 🔐 ไม่ log ข้อมูลส่วนตัว
- 🔐 ปฏิบัติตาม PDPA

### 2. Error Handling
- ⚠️ ถ้าอ่านบัตรไม่ได้ → แสดง error message
- ⚠️ ถ้า API timeout → แสดงว่าเครือข่ายมีปัญหา
- ⚠️ ถ้าไม่พบสิทธิ์ → แจ้งให้ผู้ใช้ทราบ

### 3. User Experience
- 💡 แสดง Loading ขณะอ่านบัตร
- 💡 แสดง Loading ขณะเรียก API
- 💡 แจ้งผลสำเร็จหรือผิดพลาดชัดเจน

---

## 📞 Support

### ถ้าพบปัญหา:

**1. เครื่องอ่านบัตรไม่ทำงาน:**
- ตรวจสอบ USB
- ตรวจสอบ Driver
- Restart Card Reader Service

**2. API Timeout:**
- ตรวจสอบ Network
- ตรวจสอบ Firewall
- ติดต่อ สปสช

**3. ไม่พบสิทธิ์:**
- ตรวจสอบเลขบัตรถูกต้องไหม
- ตรวจสอบว่าลงทะเบียนแล้วไหม
- ติดต่อ สปสช

---

## 🎯 สรุป Quick Start

### ก่อนใช้งานจริง ต้องทำ 3 ขั้นตอน:

1. **ติดตั้งเครื่องอ่านบัตร** + Driver ✅
2. **สร้าง Card Reader Service** (port 8080) ✅
3. **ทดสอบด้วยบัตรจริง** + เช็ค Log ✅

### เมื่อครบ 3 ขั้นตอน:
✅ ระบบจะอ่านบัตรจริง  
✅ เรียก API สปสช จริง  
✅ แสดงข้อมูลสิทธิ์จริง  

**= พร้อมใช้งาน Production!** 🚀

---

**หมายเหตุ:** ตอนนี้ระบบยังใช้ Mock Data อยู่  
เมื่อทำตาม Checklist นี้ครบ จะเป็นข้อมูลจริง 100%





