# 🚨 ปัญหา: NHSO API Connection Failed

## 📋 สรุปปัญหา

**Error:** `Network Error: fetch failed`
**API Endpoint:** `https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1`
**Status:** Connection Timeout (ไม่ตอบกลับ)

## 🔍 สาเหตุที่เป็นไปได้

### 1. API Endpoint ไม่ถูกต้อง
- API endpoint `https://ucws.nhso.go.th/ucwstokenp1/UCWSTokenP1` อาจไม่ใช่ endpoint ที่ถูกต้อง
- อาจต้องใช้ endpoint อื่นตามเอกสาร Secure Smartcard Agent

### 2. Network/Firewall Issue
- Server ไม่สามารถเข้าถึง `ucws.nhso.go.th` ได้
- Firewall บล็อกการเชื่อมต่อ
- ต้อง Whitelist IP Address

### 3. API ต้องใช้ VPN หรือ Network พิเศษ
- API อาจต้องเข้าถึงผ่าน VPN หรือ network internal ของ NHSO
- อาจต้องใช้ Certificate หรือ Authentication พิเศษ

## ✅ วิธีแก้ไข

### ขั้นตอนที่ 1: ตรวจสอบ API Endpoint จากเอกสาร Secure Smartcard Agent

เอกสาร PDF `Secure Smartcard Agent.pdf` ควรมีข้อมูลเกี่ยวกับ:
- API Endpoint URL ที่ถูกต้อง
- Request/Response format
- Authentication method

**ตรวจสอบ:**
1. อ่านเอกสาร PDF อีกครั้งเพื่อหา API endpoint
2. ตรวจสอบ Sequence Diagram ในเอกสาร
3. ดูตัวอย่าง Request/Response ในเอกสาร

### ขั้นตอนที่ 2: ติดต่อ NHSO เพื่อขอข้อมูล API

**สิ่งที่ต้องถาม:**
1. ✅ API endpoint สำหรับตรวจสอบสิทธิ์คืออะไร?
2. ✅ Request format เป็นอย่างไร? (JSON structure)
3. ✅ Response format เป็นอย่างไร?
4. ✅ ต้องใช้ Token หรือ Certificate อะไรบ้าง?
5. ✅ ต้อง Whitelist IP Address หรือไม่?
6. ✅ API ต้องเข้าถึงผ่าน VPN หรือไม่?

**ติดต่อ NHSO:**
- ☎️ โทร: 0-2141-4000
- 📧 Email: callcenter@nhso.go.th
- 🌐 Website: https://www.nhso.go.th

### ขั้นตอนที่ 3: ทดสอบ API Endpoint อื่นๆ

ลองใช้ endpoint อื่นๆ ที่อาจถูกต้อง:

```bash
# Option 1: SRM Citizen API
NHSO_API_URL=https://srmcitizen.nhso.go.th/api/check-right

# Option 2: UCWS API อื่น
NHSO_API_URL=https://ucws.nhso.go.th/api/verify-right

# Option 3: API อื่นๆ (ต้องตรวจสอบกับ NHSO)
NHSO_API_URL=https://api.nhso.go.th/...
```

**ทดสอบด้วย curl:**
```bash
# ทดสอบ endpoint ต่างๆ
curl -v -X POST https://srmcitizen.nhso.go.th/api/check-right \
  -H "Content-Type: application/json" \
  -H "token: YOUR_TOKEN" \
  -d '{"pid":"1234567890123","claimType":"OP","hn":"11001"}'
```

### ขั้นตอนที่ 4: ตรวจสอบ Network/Firewall

```bash
# ทดสอบการเชื่อมต่อ
ping ucws.nhso.go.th
ping srmcitizen.nhso.go.th

# ทดสอบ HTTPS
curl -v https://ucws.nhso.go.th
curl -v https://srmcitizen.nhso.go.th

# ทดสอบ DNS
nslookup ucws.nhso.go.th
nslookup srmcitizen.nhso.go.th
```

## 📝 Request Format ตามเอกสาร PDF

ตามเอกสาร **Secure Smartcard Agent.pdf** Request ควรมี:

```json
{
  "pid": "string",
  "claimType": "string",
  "mobile": "string",
  "correlationId": "string",
  "hn": "string"
}
```

**โค้ดปัจจุบันได้แก้ไขให้รองรับ format นี้แล้ว:**
- ✅ เพิ่ม `claimType` (default: "OP")
- ✅ เพิ่ม `mobile` (optional)
- ✅ เพิ่ม `hn` (Hospital Number)
- ✅ รองรับรูปแบบเดิม (`hcode`, `date_visit`) สำหรับ backward compatibility

## 🔧 การแก้ไขชั่วคราว (สำหรับทดสอบ)

ถ้ายังไม่สามารถเชื่อมต่อ API ได้ สามารถใช้ Mock Data เพื่อทดสอบระบบ:

```typescript
// ใน app/api/nhso-check/route.ts
// เพิ่ม fallback เป็น mock data (สำหรับ development เท่านั้น)
if (process.env.NODE_ENV === 'development' && fetchError) {
  return NextResponse.json({
    success: true,
    data: getMockNHSOData(citizen_id),
    source: 'mock',
    note: '⚠️ ใช้ Mock Data เนื่องจากไม่สามารถเชื่อมต่อ API ได้'
  });
}
```

## ✅ Checklist

- [ ] อ่านเอกสาร Secure Smartcard Agent.pdf เพื่อหา API endpoint ที่ถูกต้อง
- [ ] ติดต่อ NHSO เพื่อขอข้อมูล API endpoint
- [ ] ทดสอบ API endpoint ด้วย curl
- [ ] ตรวจสอบ Network/Firewall settings
- [ ] อัพเดท `NHSO_API_URL` ใน `.env.local`
- [ ] Restart server
- [ ] ทดสอบอีกครั้ง

## 📞 ติดต่อ

ถ้ายังแก้ไขไม่ได้:
1. ติดต่อ NHSO เพื่อขอข้อมูล API endpoint ที่ถูกต้อง
2. ขอ Whitelist IP Address (ถ้าจำเป็น)
3. ขอเอกสาร API Specification

---

**หมายเหตุ:** API endpoint ที่ถูกต้องต้องได้จากเจ้าหน้าที่ NHSO เท่านั้น เพราะ:
- API endpoint อาจเปลี่ยนแปลงได้
- แต่ละระบบอาจใช้ endpoint ต่างกัน
- ต้องมี Token/Certificate ที่ถูกต้อง
- อาจต้อง Whitelist IP Address
