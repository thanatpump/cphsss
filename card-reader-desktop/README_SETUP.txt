========================================
  คู่มือการตั้งค่า SSO Card Reader
========================================

📋 ข้อมูลที่ต้องเตรียม:

1. URL ของ Server
   - ถ้า Server อยู่บน cloud (เช่น aaPanel)
     ตัวอย่าง: https://sso.example.com
     หรือ: https://123.456.789.0:3000
   
   - ถ้า Server อยู่บนเครื่องเดียวกัน
     ใช้: http://localhost:3000

2. Port (ปกติไม่ต้องเปลี่ยน)
   - ค่า default: 3001
   - ใช้สำหรับ Desktop App เอง

3. URL ของ ThaiIDCardReader (ปกติไม่ต้องเปลี่ยน)
   - ค่า default: https://localhost:8443/smartcard/data/
   - ใช้เมื่อโปรแกรม ThaiIDCardReader.exe รันอยู่

========================================

🚀 วิธีตั้งค่า:

วิธีที่ 1: ใช้ SETUP.bat (แนะนำ)
  1. ดับเบิ้ลคลิก SETUP.bat
  2. กรอก URL ของ Server
  3. กด Enter เพื่อยืนยัน

วิธีที่ 2: แก้ไขด้วย Notepad
  1. เปิดไฟล์ config.json ด้วย Notepad
  2. แก้ไข "sso_api_url" ให้เป็น URL ของ Server จริง
  3. บันทึกไฟล์

========================================

📝 ตัวอย่าง config.json:

{
  "sso_api_url": "https://sso.example.com",
  "port": 3001,
  "thaiid_reader_url": "https://localhost:8443/smartcard/data/"
}

========================================

⚠️ หมายเหตุ:

- ถ้า Server ใช้ HTTPS (https://) ต้องมี SSL Certificate
- ถ้า Server ใช้ HTTP (http://) ไม่ต้องมี SSL
- ตรวจสอบว่า Server รันอยู่และสามารถเข้าถึงได้จากเครื่องนี้

========================================
