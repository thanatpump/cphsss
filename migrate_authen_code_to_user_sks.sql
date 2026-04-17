-- Migration Script: เปลี่ยน hcode เป็น user_sks ใน table authen_code
-- รัน script นี้ถ้า table authen_code มีอยู่แล้วและมี field hcode

-- วิธีที่ 1: ALTER TABLE (ถ้า table ยังไม่มีข้อมูล)
-- ALTER TABLE authen_code CHANGE COLUMN hcode user_sks VARCHAR(20) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (hcode 5 หลัก)';
-- ALTER TABLE authen_code DROP INDEX idx_hcode_date;
-- ALTER TABLE authen_code ADD INDEX idx_user_sks_date (user_sks, date);

-- วิธีที่ 2: สร้าง table ใหม่ (ถ้ามีข้อมูลแล้ว ต้อง backup ก่อน)
-- 1. Backup ข้อมูลเดิม
-- CREATE TABLE authen_code_backup AS SELECT * FROM authen_code;

-- 2. ลบ table เดิม
-- DROP TABLE IF EXISTS authen_code;

-- 3. สร้าง table ใหม่
CREATE TABLE IF NOT EXISTS authen_code (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_sks VARCHAR(20) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (hcode 5 หลัก)',
  date VARCHAR(8) NOT NULL,
  time VARCHAR(8) NOT NULL,
  citizen_id VARCHAR(13) NOT NULL,
  authen VARCHAR(20) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_authen (authen),
  INDEX idx_citizen_id (citizen_id),
  INDEX idx_user_sks_date (user_sks, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Restore ข้อมูล (ถ้าต้องการ)
-- INSERT INTO authen_code (user_sks, date, time, citizen_id, authen, created_at)
-- SELECT hcode, date, time, citizen_id, authen, created_at FROM authen_code_backup;
