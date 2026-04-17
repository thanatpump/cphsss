-- เพิ่ม column approved_by และ approved_at (ถ้ายังไม่มี)
-- รันทีละคำสั่ง ถ้า error "Duplicate column" แสดงว่ามีอยู่แล้ว - ข้ามไปได้

-- เพิ่ม column approved_by
ALTER TABLE sso_user 
ADD COLUMN approved_by INT NULL COMMENT 'ID ของ admin ที่อนุมัติ' AFTER status;

-- เพิ่ม column approved_at
ALTER TABLE sso_user 
ADD COLUMN approved_at DATETIME NULL COMMENT 'วันที่อนุมัติ' AFTER approved_by;
