-- Migration Script: เพิ่ม column role, status, approved_by, approved_at ในตาราง sso_user
-- รัน script นี้ถ้าตาราง sso_user ถูกสร้างแล้วแต่ยังไม่มี column เหล่านี้
-- หมายเหตุ: ถ้า column มีอยู่แล้ว script จะ error แต่ไม่เป็นไร (ข้ามไปได้)

-- เพิ่ม column role
ALTER TABLE sso_user 
ADD COLUMN role ENUM('user', 'admin_rps', 'admin_server') DEFAULT 'user' COMMENT 'บทบาท' AFTER password;

-- เพิ่ม column status (เปลี่ยนจาก active/inactive เป็น pending/active/inactive)
ALTER TABLE sso_user 
ADD COLUMN status ENUM('pending', 'active', 'inactive') DEFAULT 'pending' COMMENT 'สถานะ (pending=รอยืนยัน, active=ใช้งานได้, inactive=ถูกระงับ)' AFTER role;

-- เพิ่ม column approved_by
ALTER TABLE sso_user 
ADD COLUMN approved_by INT NULL COMMENT 'ID ของ admin ที่อนุมัติ' AFTER status;

-- เพิ่ม column approved_at
ALTER TABLE sso_user 
ADD COLUMN approved_at DATETIME NULL COMMENT 'วันที่อนุมัติ' AFTER approved_by;

-- เพิ่ม indexes (ถ้า error แสดงว่ามีอยู่แล้ว - ข้ามไปได้)
ALTER TABLE sso_user ADD INDEX idx_role (role);
ALTER TABLE sso_user ADD INDEX idx_status (status);
ALTER TABLE sso_user ADD INDEX idx_hospital_name (hospital_name);

-- เพิ่ม foreign key (ถ้ายังไม่มี)
-- หมายเหตุ: ถ้า error แสดงว่ามีอยู่แล้ว - ข้ามไปได้
-- ALTER TABLE sso_user 
-- ADD CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES sso_user(id) ON DELETE SET NULL;

-- อัปเดต user ที่มีอยู่แล้วให้เป็น status = 'active' (ถ้าต้องการ)
-- UPDATE sso_user SET status = 'active' WHERE status IS NULL OR status = '';
