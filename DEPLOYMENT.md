# คู่มือการ Deploy ระบบ SSO ชัยภูมิ

## ✅ Build สำเร็จแล้ว!

```
✓ Compiled successfully
✓ Generating static pages (46/46)
✓ Build complete
```

## 📦 ไฟล์ที่ต้องอัพโหลดขึ้น Server

### ไฟล์และโฟลเดอร์หลัก:
```
sso/
├── .next/                  ✅ โฟลเดอร์ build (สำคัญมาก!)
├── app/                    ✅ Source code
├── lib/                    ✅ Database utilities
├── node_modules/           ⚠️  ติดตั้งใหม่บน server
├── public/                 ✅ Static files
├── package.json            ✅ Dependencies
├── package-lock.json       ✅ Lock file
├── next.config.ts          ✅ Next.js config
├── tsconfig.json           ✅ TypeScript config
├── .env.local              ✅ Environment variables (สำคัญ!)
├── sso.db                  ✅ Database SQLite
└── *.csv                   ✅ Data files
```

## 🚀 วิธีการ Deploy

### Option 1: Deploy แบบ Standalone (แนะนำ)

#### 1. บีบอัดโปรเจค
```bash
# สร้าง zip file (ไม่รวม node_modules)
cd /Users/macbookpro16/Desktop
tar -czf sso-production.tar.gz \
  --exclude='sso/node_modules' \
  --exclude='sso/.git' \
  sso/
```

#### 2. อัพโหลดขึ้น Server
```bash
# ใช้ SCP หรือ FTP
scp sso-production.tar.gz user@server:/path/to/deploy/
```

#### 3. แตกไฟล์และติดตั้งบน Server
```bash
# SSH เข้า Server
ssh user@server

# แตกไฟล์
cd /path/to/deploy
tar -xzf sso-production.tar.gz
cd sso

# ติดตั้ง Dependencies
npm install --production

# หรือใช้ npm ci (เร็วกว่า)
npm ci --production
```

#### 4. ตั้งค่า Environment Variables
```bash
# สร้างหรือแก้ไขไฟล์ .env.local
nano .env.local

# ใส่ค่าเหล่านี้:
NHSO_TOKEN=0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
NODE_ENV=production
```

#### 5. รันระบบ
```bash
# แบบปกติ
npm start

# หรือใช้ PM2 (แนะนำสำหรับ Production)
npm install -g pm2
pm2 start npm --name "sso-chaiyaphum" -- start
pm2 save
pm2 startup
```

### Option 2: Deploy บน VPS (Ubuntu/Debian)

#### ติดตั้ง Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# ติดตั้ง PM2
sudo npm install -g pm2

# ติดตั้ง Nginx (ถ้าใช้)
sudo apt install -y nginx
```

#### อัพโหลดและรัน
```bash
# อัพโหลดไฟล์
scp -r /Users/macbookpro16/Desktop/sso user@server:/var/www/

# SSH เข้า Server
ssh user@server
cd /var/www/sso

# ติดตั้ง Dependencies
npm ci --production

# สร้าง .env.local
echo "NHSO_TOKEN=0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed" > .env.local
echo "NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1" >> .env.local

# รันด้วย PM2
pm2 start npm --name "sso-chaiyaphum" -- start
pm2 save
pm2 startup
```

#### ตั้งค่า Nginx (Optional)
```bash
# สร้าง config file
sudo nano /etc/nginx/sites-available/sso

# ใส่ config นี้:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/sso /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 3: Deploy บน Windows Server

#### 1. ติดตั้ง Node.js
- ดาวน์โหลดจาก https://nodejs.org/
- เลือก LTS version

#### 2. อัพโหลดโปรเจค
- Copy โฟลเดอร์ sso ไปที่ `C:\inetpub\wwwroot\sso`

#### 3. ติดตั้งและรัน
```cmd
cd C:\inetpub\wwwroot\sso
npm install --production

REM สร้าง .env.local
echo NHSO_TOKEN=0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed > .env.local
echo NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1 >> .env.local

REM รันระบบ
npm start
```

#### 4. ตั้งค่า Windows Service (แนะนำ)
```cmd
npm install -g node-windows
npm link node-windows

REM สร้าง service script
node install-service.js
```

## 🔧 Configuration สำคัญ

### 1. Environment Variables (.env.local)
```bash
# NHSO API
NHSO_TOKEN=0c9c4d14-d3c5-49b7-b84f-5b886e2ad4ed
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1

# Node Environment
NODE_ENV=production

# Database (ถ้ามี)
DATABASE_URL=file:./sso.db
```

### 2. Port Configuration
Default port: **3000**

เปลี่ยน port (ถ้าต้องการ):
```bash
# แก้ไขใน package.json
"start": "next start -p 8080"
```

### 3. Firewall
เปิด port ที่ใช้:
```bash
# Ubuntu/Debian
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## ✅ Checklist ก่อน Deploy

- [ ] Build สำเร็จ (`npm run build`)
- [ ] ไฟล์ `.env.local` พร้อมใช้งาน
- [ ] Database `sso.db` อยู่ในโฟลเดอร์
- [ ] ไฟล์ CSV ข้อมูลครบถ้วน
- [ ] Server มี Node.js 18+ ติดตั้งแล้ว
- [ ] Network เข้าถึง API สปสช ได้
- [ ] เครื่องอ่านบัตรพร้อมใช้งาน (สำหรับเครื่องที่ใช้จริง)

## 🎴 การเชื่อมต่อเครื่องอ่านบัตร

### บนเครื่อง Server
```bash
# ติดตั้ง PCSC Lite (Linux)
sudo apt install pcscd pcsc-tools

# ตรวจสอบเครื่องอ่านบัตร
pcsc_scan
```

### บนเครื่อง Client
- เครื่องอ่านบัตรเสียบที่เครื่อง client
- เชื่อมต่อผ่าน browser กับ server
- ระบบจะใช้ API ตรงกลาง

## 🔍 การตรวจสอบหลัง Deploy

### 1. ทดสอบระบบ
```bash
# เช็คว่าเว็บทำงาน
curl http://localhost:3000

# เช็ค API
curl http://localhost:3000/api/db-info

# ทดสอบ NHSO API
curl http://localhost:3000/api/nhso-test
```

### 2. ดู Logs
```bash
# PM2 logs
pm2 logs sso-chaiyaphum

# หรือ
pm2 monit
```

### 3. Monitor
```bash
# เช็คสถานะ
pm2 status

# ดู CPU/Memory
pm2 monit
```

## 🆘 Troubleshooting

### ปัญหา: Port already in use
```bash
# หา process ที่ใช้ port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### ปัญหา: Database locked
```bash
# ปิด process ที่กำลังใช้ database
pm2 stop all

# รันใหม่
pm2 start all
```

### ปัญหา: NHSO API timeout
- ตรวจสอบ network/firewall
- ตรวจสอบ Token
- ตรวจสอบว่า server IP ถูก whitelist แล้ว

### ปัญหา: Permission denied
```bash
# เปลี่ยน owner
sudo chown -R $USER:$USER /var/www/sso

# เปลี่ยน permission
chmod -R 755 /var/www/sso
```

## 📊 System Requirements

### ขั้นต่ำ:
- CPU: 2 cores
- RAM: 2 GB
- Disk: 10 GB
- Node.js: 18.x+
- OS: Ubuntu 20.04+ / Windows Server 2016+

### แนะนำ:
- CPU: 4 cores
- RAM: 4 GB
- Disk: 20 GB SSD
- Node.js: 20.x LTS
- OS: Ubuntu 22.04 LTS / Windows Server 2019+

## 🔐 Security

### 1. ใช้ HTTPS
```bash
# ติดตั้ง Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. ปิด API ทดสอบใน Production
แก้ไข `app/api/nhso-test/route.ts`:
```typescript
// เพิ่มการเช็ค environment
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
}
```

### 3. Backup Database
```bash
# Backup ทุกวัน
crontab -e

# เพิ่มบรรทัดนี้ (backup ทุกวันเวลา 2 AM)
0 2 * * * cp /var/www/sso/sso.db /var/backups/sso/sso-$(date +\%Y\%m\%d).db
```

## 📞 Support

หากพบปัญหา:
1. เช็ค logs: `pm2 logs`
2. เช็ค system: `pm2 monit`
3. รีสตาร์ท: `pm2 restart sso-chaiyaphum`

---

**ระบบพร้อม Deploy แล้ว! 🚀**

สร้างโดย: AI Assistant  
วันที่: 14 ตุลาคม 2025  
Version: 1.0.0





