# คู่มือการใช้งานระบบเช็คสิทธิ์ สปสช ด้วยบัตรประชาชน

## ภาพรวมระบบ

ระบบนี้สามารถอ่านข้อมูลจากบัตรประชาชนโดยใช้ Smart Card Reader แล้วเชื่อมต่อกับ API ของสำนักงานหลักประกันสุขภาพแห่งชาติ (สปสช) เพื่อดึงข้อมูลสิทธิ์การรักษาพยาบาลแบบ Real-time

## สถาปัตยกรรมระบบ

```
[Smart Card Reader] 
    ↓ (อ่านบัตร)
[Card Reader Service] (localhost:8080)
    ↓ (REST API)
[Next.js Frontend] (/nhso-check)
    ↓ (API Call)
[Next.js API Route] (/api/nhso-check)
    ↓ (HTTPS)
[NHSO API] (สปสช)
```

## ขั้นตอนการติดตั้ง

### 1. ติดตั้ง Smart Card Reader

#### Windows
- ติดตั้ง Driver จากผู้ผลิตเครื่องอ่านบัตร
- เสียบเครื่องอ่านบัตรเข้ากับ USB port
- ตรวจสอบว่า Windows รู้จักอุปกรณ์แล้วใน Device Manager

#### macOS
- macOS รองรับ Smart Card Reader ส่วนใหญ่โดยอัตโนมัติ
- เสียบเครื่องอ่านบัตรเข้ากับ USB port
- ตรวจสอบด้วยคำสั่ง: `system_profiler SPUSBDataType`

#### Linux
- ติดตั้ง `pcscd` (PC/SC Daemon):
  ```bash
  # Ubuntu/Debian
  sudo apt-get install pcscd pcsc-tools
  
  # CentOS/RHEL
  sudo yum install pcsc-lite pcsc-tools
  ```
- เริ่ม service:
  ```bash
  sudo systemctl start pcscd
  sudo systemctl enable pcscd
  ```
- ตรวจสอบด้วยคำสั่ง: `pcsc_scan`

### 2. ติดตั้ง Dependencies

```bash
cd /Users/macbookpro16/Desktop/sso/card-reader-client
npm install
```

Dependencies ที่จำเป็น:
- `express` - Web server
- `cors` - Cross-Origin Resource Sharing
- `smartcard` (optional) - สำหรับอ่านบัตรจริง

### 3. รัน Card Reader Service

#### วิธีที่ 1: รันด้วยคำสั่งธรรมดา
```bash
cd /Users/macbookpro16/Desktop/sso/card-reader-client
node card-reader-service.js
```

#### วิธีที่ 2: รันด้วย Script (Windows)
```bash
cd /Users/macbookpro16/Desktop/sso/card-reader-client
start-card-reader.bat
```

#### วิธีที่ 3: รันด้วย Script (macOS/Linux)
```bash
cd /Users/macbookpro16/Desktop/sso/card-reader-client
chmod +x start-card-reader.sh
./start-card-reader.sh
```

### 4. รัน Next.js Application

เปิด Terminal ใหม่:
```bash
cd /Users/macbookpro16/Desktop/sso
npm run dev
```

### 5. เปิดเว็บไซต์

เปิดเบราว์เซอร์และไปที่:
```
http://localhost:3000/nhso-check
```

## การใช้งาน

### ขั้นตอนการเช็คสิทธิ์

1. **เปิดหน้าตรวจสอบสิทธิ์**
   - ไปที่หน้าหลัก: http://localhost:3000
   - คลิกปุ่ม "เช็คสิทธิ์ สปสช (อ่านบัตรประชาชน)"

2. **ตรวจสอบสถานะเครื่องอ่านบัตร**
   - ระบบจะตรวจสอบสถานะ Card Reader อัตโนมัติทุก 3 วินาที
   - หากพบเครื่องอ่านบัตร จะแสดงสถานะเป็น "เครื่องอ่านบัตรพร้อมใช้งาน" (สีเขียว)
   - หากไม่พบ จะแสดงวิธีการแก้ไข

3. **ใส่บัตรประชาชน**
   - เสียบบัตรประชาชนเข้าเครื่องอ่านบัตร
   - หากระบบตรวจพบบัตร จะแสดง "✓ มีบัตร"

4. **อ่านบัตรและเช็คกับ สปสช**
   - กรอกรหัสโรงพยาบาล (default: 11001 - โรงพยาบาลชัยภูมิ)
   - คลิกปุ่ม "📖 อ่านบัตรประชาชนและเช็คกับ สปสช"
   - รอระบบอ่านบัตร (ประมาณ 2-5 วินาที)
   - ระบบจะเช็คกับ API สปสช อัตโนมัติ

5. **ดูผลลัพธ์**
   - **ข้อมูลจากบัตรประชาชน**: เลขบัตร, ชื่อ-นามสกุล, วันเกิด, ที่อยู่
   - **สิทธิ์หลัก**: ประเภทสิทธิ์, หน่วยบริการหลัก, วันหมดอายุ
   - **ข้อมูลการเบิกจ่าย**: งบประมาณ, ใช้ไปแล้ว, คงเหลือ
   - **สิทธิ์เสริม**: สิทธิ์อื่นๆ ที่มี (ถ้ามี)

## การแก้ไขปัญหา

### ปัญหา: "ไม่สามารถเชื่อมต่อ Card Reader Service ได้"

**สาเหตุ**: Card Reader Service ไม่ได้รัน

**วิธีแก้**:
1. เปิด Terminal ใหม่
2. รันคำสั่ง:
   ```bash
   cd /Users/macbookpro16/Desktop/sso/card-reader-client
   node card-reader-service.js
   ```
3. ตรวจสอบว่าแสดงข้อความ "✅ Server running on http://localhost:8080"

### ปัญหา: "หมดเวลารอบัตร"

**สาเหตุ**: ไม่ได้ใส่บัตรหรือใส่ช้าเกินไป

**วิธีแก้**:
1. ใส่บัตรประชาชนเข้าเครื่องอ่านบัตร
2. ตรวจสอบว่าบัตรใส่ถูกทิศทาง (chip หันเข้าหาเครื่องอ่าน)
3. คลิกปุ่มอ่านบัตรใหม่อีกครั้ง

### ปัญหา: "ไม่พบเครื่องอ่านบัตร - ใช้ Mock Data"

**สาเหตุ**: ไม่มี smartcard library หรือไม่พบเครื่องอ่านบัตร

**วิธีแก้ (ถ้าต้องการใช้งานจริง)**:
1. ติดตั้ง smartcard library:
   ```bash
   cd /Users/macbookpro16/Desktop/sso/card-reader-client
   npm install smartcard
   ```

2. ตรวจสอบว่าเครื่องอ่านบัตรเสียบเข้ากับ USB แล้ว

3. รีสตาร์ท Card Reader Service

**หมายเหตุ**: หากใช้ Mock Data ระบบจะส่งข้อมูลตัวอย่างแทน เหมาะสำหรับการทดสอบ

### ปัญหา: "Connect Timeout Error" จาก NHSO API

**สาเหตุ**: เชื่อมต่อ API สปสช ไม่ได้หรือช้าเกินไป

**วิธีแก้**:
1. ตรวจสอบการเชื่อมต่อ Internet
2. ตรวจสอบว่า NHSO_API_URL และ NHSO_TOKEN ใน `.env.local` ถูกต้อง
3. ระบบจะใช้ Mock Data แทนอัตโนมัติหากเชื่อมต่อไม่ได้

## การตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` ในโฟลเดอร์ root:

```env
# NHSO API Configuration
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
NHSO_TOKEN=your_token_here

# Card Reader Service URL
CARD_READER_URL=http://localhost:8080
```

## ข้อมูลเพิ่มเติม

### รหัสโรงพยาบาลในจังหวัดชัยภูมิ

| รหัส | ชื่อโรงพยาบาล |
|------|--------------|
| 11001 | โรงพยาบาลชัยภูมิ |
| 11002 | โรงพยาบาลบ้านแท่น |
| 11003 | โรงพยาบาลคอนสวรรค์ |
| 11004 | โรงพยาบาลเกษตรสมบูรณ์ |
| 11005 | โรงพยาบาลหนองบัวแดง |

### ประเภทสิทธิ์การรักษา

| รหัส | ชื่อสิทธิ์ |
|------|-----------|
| UCS | หลักประกันสุขภาพถ้วนหน้า (บัตรทอง) |
| SSS | ประกันสังคม |
| OFC | ข้าราชการ |
| LGO | องค์กรปกครองส่วนท้องถิ่น |
| WEL | สวัสดิการรักษาพยาบาล |

## คำแนะนำด้านความปลอดภัย

1. **อย่าแชร์ Token API**: NHSO_TOKEN เป็นข้อมูลสำคัญ ห้ามแชร์หรือ commit ลง Git
2. **ใช้ HTTPS**: ในการ deploy production ต้องใช้ HTTPS เสมอ
3. **ตรวจสอบสิทธิ์ผู้ใช้**: ในระบบจริงควรมีการ Authentication ก่อนเข้าใช้งาน
4. **Log การใช้งาน**: บันทึกการเข้าถึงข้อมูลผู้ป่วยทุกครั้ง

## การ Deploy Production

### 1. ตั้งค่า Environment Variables

ในเซิร์ฟเวอร์ production:
```bash
export NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
export NHSO_TOKEN=your_production_token
export CARD_READER_URL=http://localhost:8080
```

### 2. รัน Card Reader Service เป็น Service

สร้างไฟล์ systemd service (Linux):

```ini
# /etc/systemd/system/card-reader.service
[Unit]
Description=Card Reader Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/sso/card-reader-client
ExecStart=/usr/bin/node card-reader-service.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

เริ่มใช้งาน:
```bash
sudo systemctl enable card-reader
sudo systemctl start card-reader
sudo systemctl status card-reader
```

### 3. Deploy Next.js Application

```bash
npm run build
npm run start
```

หรือใช้ PM2:
```bash
npm install -g pm2
pm2 start npm --name "sso-app" -- start
pm2 save
pm2 startup
```

## ติดต่อและสนับสนุน

หากพบปัญหาหรือต้องการความช่วยเหลือ:
- อีเมล: support@sso.go.th
- โทร: 02-xxx-xxxx

---

**อัปเดตล่าสุด**: 3 พฤศจิกายน 2025
**เวอร์ชัน**: 1.0.0















