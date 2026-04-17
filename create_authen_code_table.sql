-- สร้าง table authen_code สำหรับเก็บข้อมูลการอ่านบัตรและตรวจสอบสิทธิ์
-- hcode: ชื่อผู้ใช้งาน (user_sks - hcode 5 หลัก จาก login_sks table) - เก็บค่า user_sks แต่ใช้ชื่อ field เป็น hcode
-- date: รูปแบบ ddmmyyyy เช่น 12032025
-- time: รูปแบบ HH:mm:ss เช่น 11:30:21
-- citizen_id: เลขบัตรประชาชน 13 หลัก
-- authen: Primary Key ที่ generate จาก user_sks, date, time, citizen_id
CREATE TABLE IF NOT EXISTS authen_code (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hcode VARCHAR(20) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (user_sks - hcode 5 หลัก)',
  date VARCHAR(8) NOT NULL,
  time VARCHAR(8) NOT NULL,
  citizen_id VARCHAR(13) NOT NULL,
  authen VARCHAR(20) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_authen (authen),
  INDEX idx_citizen_id (citizen_id),
  INDEX idx_hcode_date (hcode, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
