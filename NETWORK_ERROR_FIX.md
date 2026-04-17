# 🔧 แก้ไขปัญหา Network Error: fetch failed

## 🚨 ปัญหาที่พบ

```
❌ Network Error: fetch failed
POST /api/nhso-check 503 in 10265ms
```

**สาเหตุ:** Server ไม่สามารถเชื่อมต่อกับ API สปสช ได้

---

## 🔍 วิธีตรวจสอบและแก้ไข

### 1. ตรวจสอบการเชื่อมต่อ Internet

**บน Server (aaPanel):**

```bash
# SSH เข้า Server
ssh user@your-server

# ทดสอบ ping
ping -c 4 ucws.nhso.go.th

# ทดสอบ DNS
nslookup ucws.nhso.go.th

# ทดสอบ HTTPS connection
curl -v https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

**ผลลัพธ์ที่คาดหวัง:**
- Ping ควรได้ response
- DNS ควร resolve ได้
- curl ควรเชื่อมต่อได้ (แม้จะได้ error 401 ก็ตาม)

### 2. ตรวจสอบ Firewall

**บน aaPanel:**
1. ไปที่ **Security** → **Firewall**
2. ตรวจสอบว่า **Outbound Rules** อนุญาต HTTPS (port 443) หรือไม่
3. ถ้าไม่มี ให้เพิ่ม:
   - **Protocol:** TCP
   - **Port:** 443
   - **Action:** Allow
   - **Direction:** Outbound

**หรือใช้ Command Line:**
```bash
# ตรวจสอบ firewall rules
sudo ufw status

# อนุญาต HTTPS outbound (ถ้าใช้ ufw)
sudo ufw allow out 443/tcp
```

### 3. ตรวจสอบ DNS Resolution

```bash
# ทดสอบ DNS
dig ucws.nhso.go.th

# หรือ
nslookup ucws.nhso.go.th
```

**ถ้า DNS ไม่ทำงาน:**
```bash
# แก้ไข /etc/resolv.conf
sudo nano /etc/resolv.conf

# เพิ่ม:
nameserver 8.8.8.8
nameserver 8.8.4.4
```

### 4. ตรวจสอบ SSL/TLS

```bash
# ทดสอบ SSL connection
openssl s_client -connect ucws.nhso.go.th:443 -showcerts

# หรือใช้ curl
curl -v https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

### 5. ทดสอบจาก Node.js

**สร้างไฟล์ทดสอบ:**
```bash
cd /www/wwwroot/sso
cat > test-nhso-connection.js << 'EOF'
const https = require('https');

const options = {
  hostname: 'ucws.nhso.go.th',
  port: 443,
  path: '/ucwstokenp1/UCWSTokenP1',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(JSON.stringify({
  pid: '1234567890123',
  hcode: '11001'
}));

req.end();
EOF

# รันทดสอบ
node test-nhso-connection.js
```

---

## 🛠️ วิธีแก้ไข

### วิธีที่ 1: ตรวจสอบ Firewall (aaPanel)

1. เข้า **aaPanel**
2. ไปที่ **Security** → **Firewall**
3. ตรวจสอบ **Outbound Rules**
4. เพิ่ม rule สำหรับ HTTPS (port 443) ถ้ายังไม่มี

### วิธีที่ 2: ตรวจสอบ Network Interface

```bash
# ตรวจสอบ network interface
ip addr show

# ตรวจสอบ routing
ip route show

# ตรวจสอบ default gateway
ip route | grep default
```

### วิธีที่ 3: ตรวจสอบ Proxy Settings

**ถ้า Server ใช้ Proxy:**

```bash
# ตรวจสอบ environment variables
echo $HTTP_PROXY
echo $HTTPS_PROXY
echo $http_proxy
echo $https_proxy

# ถ้ามี proxy ให้ตั้งค่าใน Node.js
export HTTPS_PROXY=http://proxy-server:port
```

### วิธีที่ 4: Whitelist IP (ถ้าจำเป็น)

**ติดต่อเจ้าหน้าที่สปสช เพื่อ:**
- Whitelist IP Address ของ Server
- ตรวจสอบว่า IP ถูกบล็อกหรือไม่

---

## 📋 Checklist

- [ ] Server สามารถ ping ucws.nhso.go.th ได้
- [ ] DNS resolve ได้ถูกต้อง
- [ ] Firewall อนุญาต HTTPS outbound (port 443)
- [ ] SSL/TLS connection ทำงานได้
- [ ] ไม่มี Proxy ที่บล็อกการเชื่อมต่อ
- [ ] IP Address ถูก Whitelist กับสปสช (ถ้าจำเป็น)

---

## 💡 Debug Tips

### ดู Logs แบบละเอียด

```bash
# ดู PM2 logs
pm2 logs sso-app --lines 100

# หรือดู Next.js logs
# ใน terminal ที่รัน npm run dev หรือ npm start
```

### ทดสอบจาก Browser

เปิด Browser บน Server (ถ้าเป็นไปได้):
```
https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

### ใช้ curl เพื่อทดสอบ

```bash
curl -X POST https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1 \
  -H "Content-Type: application/json" \
  -H "token: YOUR_TOKEN_HERE" \
  -d '{"pid":"1234567890123","hcode":"11001"}'
```

---

## 📞 ติดต่อ Support

ถ้ายังแก้ไขไม่ได้:

1. **ติดต่อ aaPanel Support** - สำหรับปัญหา Firewall/Network
2. **ติดต่อสปสช** - สำหรับปัญหา API/Token
   - ☎️ โทร: 0-2141-4000
   - 📧 Email: callcenter@nhso.go.th

**ข้อมูลที่ควรเตรียม:**
- Server IP Address
- Error logs
- ผลการทดสอบ ping/curl
- Firewall configuration
