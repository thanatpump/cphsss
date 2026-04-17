# 🔍 ตรวจสอบ NHSO API Endpoint

## 📋 สิ่งที่พบจากเว็บ srmcitizen.nhso.go.th

เว็บ [srmcitizen.nhso.go.th](https://srmcitizen.nhso.go.th) สามารถ:
- ✅ กรอกเลขบัตรประชาชน 13 หลักได้เลย
- ✅ เช็คสิทธิ์กับสปสชได้ทันที (ไม่ต้องใช้ smartcard)
- ✅ ใช้ API ของสปสชโดยตรง

---

## 🔍 ปัญหาที่พบ

**Network Error: fetch failed** หมายความว่า:
1. **API URL อาจไม่ถูกต้อง** - endpoint ที่ใช้อาจไม่ใช่ endpoint ที่ถูกต้อง
2. **ต้องใช้ API endpoint อื่น** - อาจต้องใช้ endpoint ที่เหมือนกับ srmcitizen.nhso.go.th

---

## 💡 วิธีแก้ไข

### 1. ตรวจสอบ API Endpoint ที่ถูกต้อง

**ติดต่อเจ้าหน้าที่สปสช เพื่อ:**
- ขอเอกสาร API Specification
- ขอ API URL ที่ถูกต้องสำหรับตรวจสอบสิทธิ์
- ขอตัวอย่าง Request/Response format

**คำถามที่ควรถาม:**
- API endpoint สำหรับตรวจสอบสิทธิ์คืออะไร?
- Request format เป็นอย่างไร?
- Response format เป็นอย่างไร?
- ต้องใช้ Token หรือ Certificate อะไรบ้าง?

### 2. เปรียบเทียบ API Endpoint

**API ที่ใช้อยู่:**
```
https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

**API ที่เว็บ srmcitizen.nhso.go.th อาจใช้:**
```
https://srmcitizen.nhso.go.th/api/...
หรือ
https://ucws.nhso.go.th/api/... (endpoint อื่น)
```

### 3. ทดสอบ API Endpoint

**วิธีที่ 1: ใช้ Browser Developer Tools**

1. เปิดเว็บ https://srmcitizen.nhso.go.th
2. เปิด Developer Tools (F12)
3. ไปที่ Tab **Network**
4. กรอกเลขบัตรและกดเช็คสิทธิ์
5. ดู Request ที่ส่งไป - จะเห็น API endpoint ที่ใช้จริง

**วิธีที่ 2: ใช้ curl**

```bash
# ทดสอบ endpoint ต่างๆ
curl -X POST https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1 \
  -H "Content-Type: application/json" \
  -H "token: YOUR_TOKEN" \
  -d '{"pid":"1234567890123","hcode":"11001"}'

# หรือลอง endpoint อื่น
curl -X POST https://srmcitizen.nhso.go.th/api/check-right \
  -H "Content-Type: application/json" \
  -d '{"citizen_id":"1234567890123"}'
```

---

## 📝 API Endpoint ที่อาจถูกต้อง

### Option 1: UCWS API (ที่ใช้อยู่)
```
https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1
```

### Option 2: SRM Citizen API
```
https://srmcitizen.nhso.go.th/api/check-right
หรือ
https://srmcitizen.nhso.go.th/api/verify-right
```

### Option 3: API อื่นๆ
```
https://ucws.nhso.go.th/api/...
หรือ
https://api.nhso.go.th/...
```

---

## 🔧 วิธีแก้ไขชั่วคราว

### 1. ตรวจสอบ Network/Firewall ก่อน

ปัญหาอาจไม่ใช่ API URL แต่เป็น Network issue:

```bash
# ทดสอบการเชื่อมต่อ
ping ucws.nhso.go.th
ping srmcitizen.nhso.go.th

# ทดสอบ HTTPS
curl -v https://ucws.nhso.go.th
curl -v https://srmcitizen.nhso.go.th
```

### 2. ตรวจสอบ API URL ใน .env.local

```bash
# บน Server
cd /www/wwwroot/sso
cat .env.local | grep NHSO_API_URL
```

### 3. ลองเปลี่ยน API URL

**แก้ไข .env.local:**
```bash
# ลอง endpoint อื่น (ต้องตรวจสอบกับสปสชก่อน)
NHSO_API_URL=https://srmcitizen.nhso.go.th/api/check-right
# หรือ
NHSO_API_URL=https://ucws.nhso.go.th/api/verify-right
```

---

## 📞 ติดต่อสปสช

**สิ่งที่ต้องถาม:**
1. API endpoint สำหรับตรวจสอบสิทธิ์คืออะไร?
2. Request format เป็นอย่างไร? (JSON structure)
3. Response format เป็นอย่างไร?
4. ต้องใช้ Token หรือ Certificate อะไรบ้าง?
5. มีเอกสาร API Specification หรือไม่?

**ติดต่อ:**
- ☎️ โทร: 0-2141-4000
- 📧 Email: callcenter@nhso.go.th
- 🌐 Website: https://www.nhso.go.th

---

## ✅ Checklist

- [ ] ตรวจสอบ API endpoint ที่เว็บ srmcitizen.nhso.go.th ใช้จริง (ผ่าน Browser DevTools)
- [ ] ติดต่อสปสช เพื่อขอ API endpoint ที่ถูกต้อง
- [ ] ทดสอบ API endpoint ด้วย curl
- [ ] อัพเดท NHSO_API_URL ใน .env.local
- [ ] Restart server
- [ ] ทดสอบอีกครั้ง

---

## 💡 หมายเหตุ

**สำคัญ:** API endpoint ที่ถูกต้องต้องได้จากเจ้าหน้าที่สปสช เท่านั้น เพราะ:
- API endpoint อาจเปลี่ยนแปลงได้
- แต่ละระบบอาจใช้ endpoint ต่างกัน
- ต้องมี Token/Certificate ที่ถูกต้อง
