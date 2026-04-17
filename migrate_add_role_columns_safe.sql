-- Migration Script: เพิ่ม column role, status, approved_by, approved_at ในตาราง sso_user
-- Script นี้ตรวจสอบ column ก่อนเพิ่ม (ปลอดภัยกว่า)

-- ตรวจสอบและเพิ่ม column role (ถ้ายังไม่มี)
SET @dbname = DATABASE();
SET @tablename = 'sso_user';
SET @columnname = 'role';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT "Column role already exists" AS message;',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' ENUM(\'user\', \'admin_rps\', \'admin_server\') DEFAULT \'user\' COMMENT \'บทบาท\' AFTER password;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ตรวจสอบและเพิ่ม column status (ถ้ายังไม่มี หรือเปลี่ยน enum ถ้ามีอยู่แล้ว)
SET @columnname = 'status';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  -- ถ้ามีอยู่แล้ว ให้เปลี่ยน enum
  CONCAT('ALTER TABLE ', @tablename, ' MODIFY COLUMN ', @columnname, ' ENUM(\'pending\', \'active\', \'inactive\') DEFAULT \'pending\' COMMENT \'สถานะ (pending=รอยืนยัน, active=ใช้งานได้, inactive=ถูกระงับ)\';'),
  -- ถ้ายังไม่มี ให้เพิ่ม
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' ENUM(\'pending\', \'active\', \'inactive\') DEFAULT \'pending\' COMMENT \'สถานะ (pending=รอยืนยัน, active=ใช้งานได้, inactive=ถูกระงับ)\' AFTER role;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ตรวจสอบและเพิ่ม column approved_by (ถ้ายังไม่มี)
SET @columnname = 'approved_by';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT "Column approved_by already exists" AS message;',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL COMMENT \'ID ของ admin ที่อนุมัติ\' AFTER status;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ตรวจสอบและเพิ่ม column approved_at (ถ้ายังไม่มี)
SET @columnname = 'approved_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT "Column approved_at already exists" AS message;',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DATETIME NULL COMMENT \'วันที่อนุมัติ\' AFTER approved_by;')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- เพิ่ม indexes (ถ้ายังไม่มี)
-- หมายเหตุ: ถ้า index มีอยู่แล้วจะ error แต่ไม่เป็นไร
ALTER TABLE sso_user ADD INDEX idx_role (role);
ALTER TABLE sso_user ADD INDEX idx_status (status);
ALTER TABLE sso_user ADD INDEX idx_hospital_name (hospital_name);
