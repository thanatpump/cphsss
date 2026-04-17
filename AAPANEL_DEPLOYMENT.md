# 🚀 คู่มือ Deploy บน aaPanel

## ✅ Build สำเร็จแล้ว!

```
✓ Compiled successfully
✓ 46 pages
✓ พร้อม Deploy
```

---

## 📦 ไฟล์ที่ต้องอัพโหลดขึ้น Server

### วิธีที่ 1: อัพโหลดทั้งโปรเจค (แนะนำ)

```bash
# บีบอัดโปรเจค (ไม่รวม node_modules)
cd /Users/macbookpro16/Desktop
tar -czf sso-production.tar.gz \
  --exclude='sso/node_modules' \
  --exclude='sso/.git' \
  --exclude='sso/.next/cache' \
  sso/

# อัพโหลด sso-production.tar.gz ขึ้น aaPanel
```

### วิธีที่ 2: ใช้ Git (ถ้ามี repository)

```bash
# บน Server
cd /www/wwwroot
git clone https://github.com/your-repo/sso.git
cd sso
```

---

## 🔧 ขั้นตอนติดตั้งบน aaPanel

### ขั้นตอนที่ 1: อัพโหลดไฟล์

1. เข้า **aaPanel**
2. ไปที่ **Files** → `/www/wwwroot/`
3. สร้าง folder ใหม่ชื่อ `sso`
4. อัพโหลด `sso-production.tar.gz`
5. แตกไฟล์: คลิกขวา → Extract

### ขั้นตอนที่ 2: ติดตั้ง Node.js (ถ้ายังไม่มี)

1. ไปที่ **App Store** → ค้นหา **Node.js**
2. ติดตั้ง **Node.js 18.x** หรือสูงกว่า
3. รอจนติดตั้งเสร็จ

### ขั้นตอนที่ 3: สร้าง Database MySQL

1. ไปที่ **Database** ใน aaPanel
2. คลิก **Add Database**
3. ตั้งค่า:
   - **Database Name**: `sso_chaiyaphum` (หรือชื่อที่ต้องการ)
   - **Username**: `sso_user` (หรือชื่อที่ต้องการ)
   - **Password**: สร้างรหัสผ่านที่แข็งแรง
   - **Access Host**: `localhost` หรือ `127.0.0.1`
4. คลิก **Submit**
5. **บันทึกข้อมูลเหล่านี้ไว้** (จะต้องใช้ใน .env.local)

### ขั้นตอนที่ 4: Import Database Schema

1. ไปที่ **Database** → เลือก database ที่สร้าง
2. คลิก **phpMyAdmin** หรือ **Adminer**
3. Import ไฟล์ SQL:
   - ใช้ไฟล์ `sqlite_schema.sql` เป็นแนวทาง
   - หรือสร้างตารางตาม schema ที่มีในโค้ด

**ตารางที่ต้องมี:**
- `signstmm` - ข้อมูลผู้ป่วยใน
- `signstms` - ข้อมูลผู้ป่วยในสรุป
- `sognstmm` - ข้อมูลผู้ป่วยนอก
- `sognstmp` - ข้อมูลผู้ป่วยนอกพิเศษ
- `hospcode` - ข้อมูลโรงพยาบาล
- `login_sks` - ข้อมูลผู้ใช้ login
- `amppart` - ข้อมูลอำเภอ

### ขั้นตอนที่ 5: สร้างไฟล์ .env.local

```bash
# SSH เข้า Server หรือใช้ Terminal ใน aaPanel
cd /www/wwwroot/sso

# สร้างไฟล์ .env.local
cat > .env.local << 'EOF'
# NHSO API Configuration
NHSO_TOKEN=0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1

# MySQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=sso_user
DB_PASS=your_password_here
DB_NAME=sso_chaiyaphum

# Environment
NODE_ENV=production
EOF
```

**⚠️ สำคัญ:** แก้ไขค่าต่อไปนี้ให้ตรงกับที่ตั้งค่าไว้:
- `DB_USER` = ชื่อผู้ใช้ database ที่สร้างไว้
- `DB_PASS` = รหัสผ่าน database ที่สร้างไว้
- `DB_NAME` = ชื่อ database ที่สร้างไว้

### ขั้นตอนที่ 6: ติดตั้ง Dependencies

```bash
cd /www/wwwroot/sso

# ติดตั้ง dependencies (production only)
npm ci --production

# หรือถ้า ci ไม่ได้
npm install --production
```

### ขั้นตอนที่ 7: ตั้งค่า PM2

```bash
# ติดตั้ง PM2 (ถ้ายังไม่มี)
npm install -g pm2

# รันโปรเจค
pm2 start npm --name "sso-chaiyaphum" -- start

# บันทึก config
pm2 save

# ตั้งให้รันตอน boot
pm2 startup
# (copy คำสั่งที่มันแสดงแล้วรัน)
```

### ขั้นตอนที่ 8: ตั้งค่า Nginx/Apache Reverse Proxy

**Option A: ใช้ Node.js Manager ใน aaPanel (ง่ายสุด)**

1. ไปที่ **App Store** → **Node.js**
2. คลิก **Settings**
3. Add Project:
   - **Project Name**: SSO Chaiyaphum
   - **Project Path**: `/www/wwwroot/sso`
   - **Port**: 3000
   - **Startup File**: `npm start`
   - **Domain**: your-domain.com (ถ้ามี)
4. Save และ Start

**Option B: ตั้งค่า Nginx Manual**

1. ไปที่ **Website** → เลือก domain ของคุณ
2. **Settings** → **Reverse Proxy**
3. Add Proxy:
   ```
   Proxy Name: sso
   Target URL: http://127.0.0.1:3000
   ```
4. Save

หรือแก้ไข Nginx config:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### ขั้นตอนที่ 9: ตั้งค่า SSL (ถ้ามี domain)

1. ไปที่ **Website** → เลือก domain
2. **SSL** → **Let's Encrypt**
3. Apply
4. Force HTTPS

### ขั้นตอนที่ 10: เปิด Firewall

```bash
# เปิด port 3000 (ถ้า direct access)
# ใน aaPanel → Security

# หรือใช้ command line
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

---

## ✅ ตรวจสอบการทำงาน

```bash
# เช็คว่า PM2 รันอยู่
pm2 status

# ดู logs
pm2 logs sso-chaiyaphum

# ทดสอบ
curl http://localhost:3000

# ทดสอบการเชื่อมต่อ Database
curl http://localhost:3000/api/db-info

# หรือเปิด browser
http://your-domain.com
```

### ตรวจสอบ Database Connection

1. เปิด browser ไปที่ `http://your-domain.com/api/db-info`
2. ควรแสดงข้อมูลสถิติจาก database
3. ถ้ามี error ให้ตรวจสอบ:
   - `.env.local` ตั้งค่าถูกต้องหรือไม่
   - Database user มีสิทธิ์เข้าถึงหรือไม่
   - MySQL service รันอยู่หรือไม่

---

## 📦 เตรียมโปรแกรมอ่านบัตรให้ผู้ใช้

### โปรแกรมอยู่ที่ไหน?

โปรแกรม Desktop App **มีอยู่ในโปรเจกต์แล้ว** อยู่ที่:
```
sso/card-reader-desktop/
```

### วิธีเตรียมไฟล์ให้ผู้ใช้:

```bash
# สร้าง ZIP file
cd /Users/macbookpro16/Desktop/sso
zip -r card-reader-desktop.zip card-reader-desktop/ \
  -x "*node_modules*" \
  -x "*.git*" \
  -x "*.DS_Store"
```

**ไฟล์ที่ต้องแจก:**
- `card-reader-desktop.zip` (โฟลเดอร์ card-reader-desktop บีบอัด)
- คู่มือการติดตั้ง (ดูไฟล์ `CARD_READER_DISTRIBUTION.md`)

---

## 📝 สำหรับ Client (ผู้ใช้งาน)

### ระบบทำงานอย่างไร:

1. **Server (aaPanel)**: รันเว็บแอปพลิเคชัน
2. **Client (เครื่องผู้ใช้)**: รัน Desktop App เพื่ออ่านบัตร
3. **Flow**:
   - ผู้ใช้เปิด Desktop App → เสียบบัตร → Desktop App อ่านและส่งข้อมูลไปที่ Server
   - ผู้ใช้เปิดเว็บ → กดปุ่มอ่านบัตร → เว็บดึงข้อมูลจาก Server → แสดงผลบนเว็บ

### ไฟล์ที่ต้องแจกให้ Client:

**โฟลเดอร์: `card-reader-desktop/`** (อยู่ใน Desktop/sso/)

**มีไฟล์:**
```
card-reader-desktop/
├── main.js                     ← Desktop App
├── config.json                 ← ตั้งค่า URL ของ Server
├── package.json                ← Dependencies
├── start.bat                   ← Windows (ดับเบิ้ลคลิก)
├── start.sh                    ← macOS/Linux
└── README.md                   ← คู่มือ
```

### คู่มือสำหรับ Client:

**1. ติดตั้ง Node.js** (ครั้งเดียว)
   - ดาวน์โหลด: https://nodejs.org/
   - เลือก LTS version (18.x หรือสูงกว่า)
   - ติดตั้งตามปกติ

**2. แตกไฟล์ card-reader-desktop**

**3. ตั้งค่า URL ของ Server:**
   - เปิดไฟล์ `config.json`
   - แก้ไข `SSO_API_URL` เป็น URL ของ Server:
     ```json
     {
       "SSO_API_URL": "http://your-domain.com",
       "PORT": 3001
     }
     ```
   - **สำคัญ**: ต้องเป็น URL ที่เข้าถึงได้จากเครื่อง client

**4. ติดตั้ง Dependencies:**
   ```bash
   cd card-reader-desktop
   npm install
   ```

**5. รัน Desktop App:**
   - **Windows**: ดับเบิ้ลคลิก `start.bat`
   - **macOS/Linux**: 
     ```bash
     chmod +x start.sh
     ./start.sh
     ```
   - ควรเห็นข้อความ "Desktop App running on port 3001"

**6. เสียบเครื่องอ่านบัตร USB**

**7. เปิด browser ไปที่เว็บ:**
   ```
   http://your-domain.com
   ```

**8. ใช้งาน:**
   - Login เข้าระบบ
   - ไปที่หน้า "ตรวจสอบข้อมูลการจัดสรรเงิน"
   - กดปุ่ม "เสียบบัตรและอ่านข้อมูล"
   - เสียบบัตรประชาชนเข้าเครื่องอ่านบัตร
   - รอสักครู่ ข้อมูลจะแสดงบนเว็บอัตโนมัติ

### ⚠️ หมายเหตุสำคัญ:

- **Desktop App ต้องรันอยู่ตลอดเวลา** ขณะใช้งาน
- Desktop App จะส่งข้อมูลไปที่ Server อัตโนมัติเมื่ออ่านบัตรสำเร็จ
- ถ้า Desktop App ไม่ทำงาน เว็บจะไม่สามารถอ่านบัตรได้
- Desktop App ต้องเข้าถึง URL ของ Server ได้ (ตรวจสอบ Firewall/Network)

---

## 🔧 Management Commands

```bash
# ดูสถานะ
pm2 status

# ดู logs
pm2 logs sso-chaiyaphum
pm2 logs sso-chaiyaphum --lines 100

# Restart
pm2 restart sso-chaiyaphum

# Stop
pm2 stop sso-chaiyaphum

# Start
pm2 start sso-chaiyaphum

# Delete
pm2 delete sso-chaiyaphum

# Monitor
pm2 monit

# List all
pm2 list
```

---

## 🔄 อัพเดทโปรเจค

เมื่อมีการแก้ไขโค้ด:

```bash
# 1. SSH เข้า server
ssh user@your-server-ip

# 2. ไปที่ directory โปรเจค
cd /www/wwwroot/sso

# 3. Pull code ใหม่ (ถ้าใช้ Git)
git pull

# 4. Build ใหม่ (ถ้าจำเป็น)
npm run build

# 5. Restart
pm2 restart sso-chaiyaphum

# 6. เช็คว่าทำงาน
pm2 logs sso-chaiyaphum
```

หรือแบบ manual:
```bash
# 1. อัพโหลดไฟล์ใหม่ทับของเก่า
# 2. Restart PM2
pm2 restart sso-chaiyaphum
```

---

## 🆘 Troubleshooting

### ปัญหา: Port 3000 ถูกใช้งานอยู่

```bash
# หา process
lsof -i :3000
# หรือ
netstat -tulpn | grep 3000

# Kill process
kill -9 <PID>
```

### ปัญหา: PM2 ไม่รัน

```bash
# ลบและสร้างใหม่
pm2 delete sso-chaiyaphum
pm2 start npm --name "sso-chaiyaphum" -- start
pm2 save
```

### ปัญหา: Database connection error

```bash
# ตรวจสอบ MySQL service
systemctl status mysql
# หรือ
systemctl status mariadb

# ตรวจสอบ .env.local
cat /www/wwwroot/sso/.env.local

# ทดสอบเชื่อมต่อ database
mysql -u sso_user -p sso_chaiyaphum
# (ใส่รหัสผ่าน)

# ตรวจสอบว่า user มีสิทธิ์
# ใน aaPanel → Database → เลือก database → ตรวจสอบ user permissions
```

### ปัญหา: Table doesn't exist

```bash
# เช็คว่าตารางมีอยู่หรือไม่
mysql -u sso_user -p sso_chaiyaphum -e "SHOW TABLES;"

# ถ้าไม่มีตาราง ให้ import schema
# ใช้ phpMyAdmin ใน aaPanel หรือใช้ command line
```

### ปัญหา: Permission denied

```bash
# Fix permissions
chown -R www:www /www/wwwroot/sso
chmod -R 755 /www/wwwroot/sso
```

### ปัญหา: Module not found

```bash
# ลบและติดตั้งใหม่
cd /www/wwwroot/sso
rm -rf node_modules
npm install --production
pm2 restart sso-chaiyaphum
```

---

## 📊 System Requirements

### ขั้นต่ำ:
- CPU: 2 cores
- RAM: 2 GB
- Disk: 10 GB
- Node.js: 18.x+

### แนะนำ:
- CPU: 4 cores
- RAM: 4 GB
- Disk: 20 GB SSD
- Node.js: 20.x LTS

---

## 🔐 Security Checklist

- [ ] เปิด HTTPS/SSL
- [ ] ตั้งค่า Firewall
- [ ] Backup Database ทุกวัน
- [ ] เก็บ .env.local ไว้เป็นความลับ
- [ ] Update Node.js และ dependencies เป็นประจำ
- [ ] ตรวจสอบ logs เป็นประจำ

---

## 📞 ติดต่อ

หากมีปัญหา:
- เช็ค logs: `pm2 logs sso-chaiyaphum`
- เช็คสถานะ: `pm2 status`
- Restart: `pm2 restart sso-chaiyaphum`

---

## 🎉 เสร็จสิ้น!

ระบบพร้อมใช้งานบน aaPanel แล้ว!

**URL สำหรับผู้ใช้:**
```
http://your-domain.com
```

**Card Reader Client:**
```
แจกไฟล์: card-reader-client.zip
```

---

**Last Updated:** 14 ตุลาคม 2025  
**Version:** 1.0.0



