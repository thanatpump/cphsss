# 🔧 แก้ไขปัญหา NHSO API Timeout

## ✅ สิ่งที่แก้ไขแล้ว

1. **เพิ่ม Timeout** จาก 10 วินาที เป็น **30 วินาที**
2. **ปรับปรุง Error Handling** ให้แสดงรายละเอียดมากขึ้น
3. **เพิ่ม Logging** เพื่อ debug

---

## 🔍 วิธีตรวจสอบปัญหา

### 1. ตรวจสอบว่า NHSO_TOKEN ถูกตั้งค่าหรือไม่

**บน Server (aaPanel):**
```bash
# SSH เข้า Server
cd /www/wwwroot/sso

# ตรวจสอบไฟล์ .env.local
cat .env.local | grep NHSO_TOKEN
```

**ต้องมี:**
```bash
NHSO_TOKEN=your_token_here
NHSO_API_URL=https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

### 2. ตรวจสอบ Logs บน Server

**ดู Logs จาก PM2:**
```bash
pm2 logs sso-app
```

**หรือดู Logs จาก Next.js:**
```bash
# ใน terminal ที่รัน npm run dev หรือ npm start
# จะเห็น logs แบบนี้:
# 🔄 กำลังเรียก NHSO API...
# 📍 API URL: https://ucws.nhso.go.th/...
# 🔑 Token: 0c9c4d14-d...
```

### 3. ทดสอบการเชื่อมต่อ

**ทดสอบผ่าน Browser:**
```
https://cphsss.hsoft.in.th/api/nhso-test?pid=1234567890123&hcode=11001
```

**หรือใช้ curl:**
```bash
curl -X POST https://cphsss.hsoft.in.th/api/nhso-check \
  -H "Content-Type: application/json" \
  -d '{"citizen_id":"1234567890123","hcode":"11001"}'
```

---

## 🚨 สาเหตุที่เป็นไปได้

### 1. ไม่มี NHSO_TOKEN
**อาการ:** Error "ไม่พบ Token สำหรับเชื่อมต่อ API"
**วิธีแก้:**
- เพิ่ม `NHSO_TOKEN=your_token_here` ใน `.env.local`
- Restart server

### 2. Token ไม่ถูกต้องหรือหมดอายุ
**อาการ:** Timeout หรือ Error 401/403
**วิธีแก้:**
- ติดต่อเจ้าหน้าที่สปสช เพื่อขอ Token ใหม่
- อัพเดท Token ใน `.env.local`
- Restart server

### 3. API URL ไม่ถูกต้อง
**อาการ:** Timeout หรือ Error 404
**วิธีแก้:**
- ตรวจสอบ API URL กับเจ้าหน้าที่สปสช
- อัพเดท `NHSO_API_URL` ใน `.env.local`
- Restart server

### 4. Network/Firewall Issue
**อาการ:** Timeout หรือ Error "fetch failed"
**วิธีแก้:**
- ตรวจสอบว่า Server สามารถเข้าถึง Internet ได้
- ตรวจสอบ Firewall settings
- ตรวจสอบว่า IP Server ถูก Whitelist กับสปสช หรือไม่

### 5. API สปสช ล่าช้าหรือไม่ทำงาน
**อาการ:** Timeout 30 วินาที
**วิธีแก้:**
- รอสักครู่แล้วลองใหม่
- ติดต่อเจ้าหน้าที่สปสช เพื่อตรวจสอบสถานะ API

---

## 📋 Checklist การแก้ไข

- [ ] ตรวจสอบว่า `.env.local` มี `NHSO_TOKEN`
- [ ] ตรวจสอบว่า Token ถูกต้อง (ติดต่อสปสช)
- [ ] ตรวจสอบว่า API URL ถูกต้อง
- [ ] Restart server หลังจากแก้ไข `.env.local`
- [ ] ตรวจสอบ Network/Firewall
- [ ] ทดสอบผ่าน `/api/nhso-test`
- [ ] ดู Logs เพื่อดู error message ที่ชัดเจน

---

## 💡 หมายเหตุ

- Timeout ถูกเพิ่มเป็น **30 วินาที** แล้ว
- Error messages จะแสดงรายละเอียดมากขึ้น
- Logs จะแสดง Token preview และ API URL เพื่อ debug

---

## 📞 ติดต่อสปสช

ถ้ายังแก้ไขไม่ได้:
- ☎️ โทร: 0-2141-4000
- 📧 Email: callcenter@nhso.go.th
- 🌐 Website: https://www.nhso.go.th

**สิ่งที่ควรสอบถาม:**
- Token ยังใช้งานได้หรือไม่?
- API URL ที่ถูกต้องคืออะไร?
- IP Address ต้อง Whitelist ไหม?
