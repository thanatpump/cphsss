# 🔌 คำอธิบายเกี่ยวกับ Port

## 📋 Port ที่ใช้ในระบบ

### Port 3000 - Next.js Web App (Server)
- **ที่อยู่**: Server บน aaPanel
- **หน้าที่**: รัน Next.js Web Application
- **URL**: `https://cphsss.hsoft.in.th` (ผ่าน Nginx reverse proxy)
- **เข้าถึงได้จาก**: ทุกคนที่เข้าเว็บ

### Port 3001 - Desktop App (Client)
- **ที่อยู่**: เครื่อง Client (เครื่องที่เชื่อมต่อเครื่องอ่านบัตร)
- **หน้าที่**: รัน Desktop App สำหรับอ่านบัตรและส่งข้อมูลไปยัง Server
- **URL**: `http://localhost:3001` (เฉพาะเครื่อง client เท่านั้น)
- **เข้าถึงได้จาก**: เฉพาะเครื่องที่รัน Desktop App เท่านั้น

---

## ❓ คำถาม: Port 3001 กับ 3000 ต้องเป็นอันเดียวกันหรือไม่?

### คำตอบ: **ไม่ต้องเป็นอันเดียวกัน!** ✅

**เหตุผล:**
- Port 3000 = **Server** (รันบน aaPanel)
- Port 3001 = **Client** (รันบนเครื่องผู้ใช้)

**พวกนี้เป็นคนละเครื่องกัน:**
- Server (Port 3000) = อยู่บน cloud/aaPanel
- Client (Port 3001) = อยู่บนเครื่องผู้ใช้ (เครื่องที่เชื่อมต่อเครื่องอ่านบัตร)

---

## 🔄 Flow การทำงาน

```
┌─────────────────────────────────┐
│  เครื่อง Client (เครื่องผู้ใช้)   │
│                                  │
│  Desktop App (Port 3001)        │ ← รันบนเครื่อง client
│  - อ่านบัตรจาก ThaiIDCardReader  │
│  - ส่งข้อมูลไปยัง Server          │
└──────────────┬──────────────────┘
               │
               │ HTTPS
               │ (ส่งไปยัง Server)
               ↓
┌─────────────────────────────────┐
│  Server (aaPanel)               │
│                                  │
│  Next.js Web App (Port 3000)    │ ← รันบน Server
│  - รับข้อมูลจาก Desktop App      │
│  - แสดงผลบนหน้าเว็บ              │
│  - เชื่อมต่อ NHSO API            │
└─────────────────────────────────┘
```

---

## ⚙️ การตั้งค่า

### Server (aaPanel) - Port 3000
```bash
# Next.js รันที่ port 3000
# Nginx reverse proxy ไปที่ localhost:3000
# ไม่ต้องเปลี่ยนอะไร
```

### Client (Desktop App) - Port 3001
```json
// config.json
{
  "sso_api_url": "https://cphsss.hsoft.in.th",  // ← Server URL
  "port": 3001,                                   // ← Port ของ Desktop App เอง
  "thaiid_reader_url": "https://localhost:8443/smartcard/data/"
}
```

**อธิบาย:**
- `sso_api_url` = URL ของ Server (ไม่ต้องใส่ port เพราะใช้ HTTPS/HTTP มาตรฐาน)
- `port` = Port ที่ Desktop App ใช้รันเอง (3001)

---

## 💡 ทำไมต้องใช้ Port 3001?

**เหตุผล:**
1. **หลีกเลี่ยงการชนกับ Port อื่น**: ถ้าเครื่อง client มีโปรแกรมอื่นใช้ port 3000 อยู่แล้ว
2. **แยกความชัดเจน**: Port 3000 = Server, Port 3001 = Client
3. **ไม่จำเป็นต้องเป็นอันเดียวกัน**: เพราะเป็นคนละเครื่องกัน

---

## 🔧 ถ้าต้องการเปลี่ยน Port

### เปลี่ยน Port ของ Desktop App (Client)

แก้ไขไฟล์ `config.json`:
```json
{
  "sso_api_url": "https://cphsss.hsoft.in.th",
  "port": 8080,  // ← เปลี่ยนเป็น port อื่นได้
  "thaiid_reader_url": "https://localhost:8443/smartcard/data/"
}
```

**หมายเหตุ:** Port ของ Desktop App ไม่เกี่ยวกับ Server เลย เพราะ Desktop App จะส่งข้อมูลไปยัง Server ผ่าน `sso_api_url` เท่านั้น

---

## ✅ สรุป

- **Port 3000** = Server (aaPanel) - ไม่ต้องเปลี่ยน
- **Port 3001** = Client (Desktop App) - เปลี่ยนได้ถ้าต้องการ
- **ไม่ต้องเป็นอันเดียวกัน** เพราะเป็นคนละเครื่องกัน
- Desktop App จะส่งข้อมูลไปยัง Server ผ่าน `sso_api_url` (ไม่เกี่ยวกับ port ของ Desktop App)
