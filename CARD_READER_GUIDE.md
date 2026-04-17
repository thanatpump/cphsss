# คู่มือการติดตั้งเครื่องอ่านบัตรประชาชน

## ระบบที่รองรับ
- ✅ macOS (ต้องติดตั้ง PCSC Lite)
- ✅ Windows (มี Driver ในตัว)
- ✅ Linux (ต้องติดตั้ง pcscd)

## ขั้นตอนการติดตั้ง (macOS)

### 1. ติดตั้ง PC/SC Lite
```bash
# ใช้ Homebrew ติดตั้ง
brew install pcsc-lite
```

### 2. ติดตั้ง Smart Card Library
```bash
# ติดตั้ง Node.js library สำหรับอ่านบัตร
npm install smartcard
```

### 3. เสียบเครื่องอ่านบัตร
- เสียบ USB Smart Card Reader เข้ากับเครื่อง
- ใส่บัตรประชาชนเข้าเครื่องอ่าน

### 4. ตรวจสอบการเชื่อมต่อ
```bash
# ตรวจสอบว่าเห็นเครื่องอ่านบัตรหรือไม่
pcsctest
```

## สำหรับ Windows

### 1. ติดตั้ง Driver
- Windows รองรับ Smart Card Reader ในตัว
- ติดตั้ง driver จากผู้ผลิต (ถ้ามี)

### 2. ตรวจสอบ
- เปิด Device Manager
- ดูที่ Smart Card Readers
- ควรเห็นชื่อเครื่องอ่านบัตร

## การใช้งานกับระบบ

### Option 1: ใช้ Local Service (แนะนำ)

สร้าง Local Service ที่รันบน localhost:8080

**ไฟล์: `card-reader-service.js`**

```javascript
const express = require('express');
const cors = require('cors');
const { Devices, Iso7816Application } = require('smartcard');

const app = express();
app.use(cors());
app.use(express.json());

const devices = new Devices();

// Endpoint สำหรับอ่านบัตร
app.post('/read-card', async (req, res) => {
  try {
    const card = await devices.onActivated();
    const application = new Iso7816Application(card);
    
    // อ่านข้อมูลจากบัตร
    const citizenId = await application.readCitizenId();
    const name = await application.readName();
    const birthDate = await application.readBirthDate();
    const address = await application.readAddress();
    
    res.json({
      success: true,
      data: {
        citizen_id: citizenId,
        title_th: name.title,
        first_name_th: name.firstName,
        last_name_th: name.lastName,
        birth_date: birthDate,
        address: address,
        issue_date: await application.readIssueDate(),
        expire_date: await application.readExpireDate(),
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ตรวจสอบสถานะ
app.get('/status', (req, res) => {
  res.json({
    success: true,
    status: devices.listDevices().length > 0 ? 'connected' : 'not_connected'
  });
});

app.listen(8080, () => {
  console.log('🎴 Card Reader Service running on http://localhost:8080');
});
```

**รันด้วย:**
```bash
node card-reader-service.js
```

### Option 2: ใช้ Thai ID Card API (ถ้ามี)

บางหน่วยงานมี API สำเร็จรูป เช่น:
- ThaiD API
- Thai National ID Card API
- หรือพัฒนาเอง

## การเชื่อมต่อกับระบบ SSO

แก้ไขไฟล์ `/app/api/card-reader/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  try {
    // เรียก Local Service
    const response = await fetch('http://localhost:8080/read-card', {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('ไม่สามารถอ่านบัตรได้');
    }
    
    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    // Fallback เป็น Mock Data สำหรับ Development
    return NextResponse.json({
      success: true,
      data: getMockCardData(),
      source: 'mock'
    });
  }
}
```

## การทดสอบ

### 1. ทดสอบเครื่องอ่านบัตร
```bash
# เปิด Local Service
node card-reader-service.js

# ทดสอบอ่านบัตร
curl -X POST http://localhost:8080/read-card
```

### 2. ทดสอบกับระบบ SSO
1. เปิดระบบ: http://localhost:3000
2. ไปที่ "ตรวจสอบข้อมูลการจัดสรรเงิน"
3. Login เข้าระบบ
4. ใส่บัตรประชาชนเข้าเครื่องอ่าน
5. กดปุ่ม "เสียบบัตรและอ่านข้อมูล"

### 3. ตรวจสอบ Console
ดู Terminal จะแสดง:
```
🎴 อ่านบัตรสำเร็จ: 3xxxxxxxxxxxx
🔄 กำลังเรียก NHSO API... { pid: '3xxxxxxxxxxxx', hcode: '11001' }
✅ ได้รับข้อมูลจาก NHSO API สำเร็จ!
```

## เครื่องอ่านบัตรที่แนะนำ

### สำหรับองค์กร
1. **HID Omnikey 3121** (~1,500-2,000 บาท)
   - เชื่อถือได้สูง
   - รองรับ macOS/Windows/Linux

2. **Gemalto PC USB-TR** (~1,200-1,800 บาท)
   - ใช้งานง่าย
   - Driver ครบทุก OS

3. **ACS ACR38U** (~800-1,200 บาท)
   - ราคาประหยัด
   - เหมาะสำหรับทดสอบ

## Troubleshooting

### ปัญหา: ไม่เห็นเครื่องอ่านบัตร
- ตรวจสอบว่าเสียบ USB แล้ว
- ลองเสียบพอร์ต USB อื่น
- Restart เครื่อง

### ปัญหา: อ่านบัตรไม่ได้
- ตรวจสอบว่าใส่บัตรถูกทิศทาง
- ทำความสะอาดบัตร (ใช้ผ้านุ่มเช็ด)
- ทำความสะอาดเครื่องอ่าน

### ปัญหา: Driver ไม่ทำงาน
- ติดตั้ง Driver ใหม่
- ตรวจสอบใน Device Manager
- ดาวน์โหลด Driver ล่าสุดจากผู้ผลิต

## ข้อมูลเพิ่มเติม

- **คู่มือ PCSC**: https://pcsclite.apdu.fr/
- **Smart Card ใน Node.js**: https://github.com/pokusew/nfc-pcsc
- **Thai ID Card Library**: สอบถามหน่วยงานราชการ

## Security Notice

⚠️ **ข้อมูลบัตรประชาชนเป็นข้อมูลส่วนบุคคล**
- เก็บข้อมูลอย่างปลอดภัย
- ไม่บันทึก log ข้อมูลส่วนตัว
- ปฏิบัติตาม PDPA
- ใช้ HTTPS ใน Production





