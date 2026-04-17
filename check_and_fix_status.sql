-- Script ตรวจสอบและแก้ไข column status
-- รัน script นี้เพื่อตรวจสอบและแก้ไข enum ของ status

-- 1. ตรวจสอบ enum ปัจจุบันของ column status
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'sso_user' 
  AND COLUMN_NAME = 'status';

-- 2. ตรวจสอบข้อมูล user ทั้งหมดและ status
SELECT id, username, role, status, created_at 
FROM sso_user 
ORDER BY created_at DESC;

-- 3. แก้ไข enum ของ status ให้รองรับ 'pending', 'active', 'inactive'
-- ถ้า error แสดงว่า enum ถูกต้องแล้ว
ALTER TABLE sso_user 
MODIFY COLUMN status ENUM('pending', 'active', 'inactive') DEFAULT 'pending' 
COMMENT 'สถานะ (pending=รอยืนยัน, active=ใช้งานได้, inactive=ถูกระงับ)';

-- 4. อัปเดต user ที่ status เป็น NULL หรือ '' ให้เป็น 'pending'
UPDATE sso_user 
SET status = 'pending' 
WHERE status IS NULL OR status = '';

-- 5. ตรวจสอบอีกครั้ง
SELECT id, username, role, status, created_at 
FROM sso_user 
ORDER BY created_at DESC;
