-- Migration Script แบบง่าย: เพิ่ม column ที่ยังไม่มี
-- รันทีละคำสั่ง ถ้า error แสดงว่ามีอยู่แล้ว - ข้ามไปได้

-- 1. เพิ่ม column role (ถ้ายังไม่มี)
ALTER TABLE sso_user 
ADD COLUMN role ENUM('user', 'admin_rps', 'admin_server') DEFAULT 'user' COMMENT 'บทบาท' AFTER password;

-- 2. เปลี่ยน column status (ถ้ามีอยู่แล้ว) หรือเพิ่มใหม่ (ถ้ายังไม่มี)
-- ถ้า error "Duplicate column" แสดงว่ามีอยู่แล้ว - ให้รันคำสั่งนี้แทน:
ALTER TABLE sso_user 
MODIFY COLUMN status ENUM('pending', 'active', 'inactive') DEFAULT 'pending' COMMENT 'สถานะ (pending=รอยืนยัน, active=ใช้งานได้, inactive=ถูกระงับ)';

-- 3. เพิ่ม column approved_by (ถ้ายังไม่มี)
ALTER TABLE sso_user 
ADD COLUMN approved_by INT NULL COMMENT 'ID ของ admin ที่อนุมัติ' AFTER status;

-- 4. เพิ่ม column approved_at (ถ้ายังไม่มี)
ALTER TABLE sso_user 
ADD COLUMN approved_at DATETIME NULL COMMENT 'วันที่อนุมัติ' AFTER approved_by;

-- 5. เพิ่ม indexes (ถ้า error แสดงว่ามีอยู่แล้ว - ข้ามไปได้)
ALTER TABLE sso_user ADD INDEX idx_role (role);
ALTER TABLE sso_user ADD INDEX idx_status (status);
ALTER TABLE sso_user ADD INDEX idx_hospital_name (hospital_name);
