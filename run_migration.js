const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '209.15.118.35',
  user: 'root',
  password: '@pydKN2512',
  database: 'sso',
  port: 3306,
};

async function runMigration() {
  let conn;
  try {
    console.log('🔄 กำลังเชื่อมต่อ database...');
    conn = await mysql.createConnection(DB_CONFIG);
    console.log('✅ เชื่อมต่อ database สำเร็จ\n');

    // 1. เพิ่ม column approved_by (ถ้ายังไม่มี)
    console.log('📝 1. กำลังเพิ่ม column approved_by...');
    try {
      await conn.query(`
        ALTER TABLE sso_user 
        ADD COLUMN approved_by INT NULL COMMENT 'ID ของ admin ที่อนุมัติ' AFTER status
      `);
      console.log('   ✅ เพิ่ม column approved_by สำเร็จ');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠️  column approved_by มีอยู่แล้ว - ข้าม');
      } else {
        throw err;
      }
    }

    // 2. เพิ่ม column approved_at (ถ้ายังไม่มี)
    console.log('📝 2. กำลังเพิ่ม column approved_at...');
    try {
      await conn.query(`
        ALTER TABLE sso_user 
        ADD COLUMN approved_at DATETIME NULL COMMENT 'วันที่อนุมัติ' AFTER approved_by
      `);
      console.log('   ✅ เพิ่ม column approved_at สำเร็จ');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠️  column approved_at มีอยู่แล้ว - ข้าม');
      } else {
        throw err;
      }
    }

    // 3. ตรวจสอบ enum ปัจจุบันของ status
    console.log('\n📋 3. กำลังตรวจสอบ enum ของ status...');
    const [statusInfo] = await conn.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'sso_user' 
        AND COLUMN_NAME = 'status'
    `);
    console.log(`   📊 enum ปัจจุบัน: ${statusInfo[0].COLUMN_TYPE}`);

    // 4. แก้ไข enum ของ status ให้รองรับ 'pending'
    console.log('📝 4. กำลังแก้ไข enum ของ status...');
    try {
      await conn.query(`
        ALTER TABLE sso_user 
        MODIFY COLUMN status ENUM('pending', 'active', 'inactive') DEFAULT 'pending' 
        COMMENT 'สถานะ (pending=รอยืนยัน, active=ใช้งานได้, inactive=ถูกระงับ)'
      `);
      console.log('   ✅ แก้ไข enum ของ status สำเร็จ');
    } catch (err) {
      if (err.message.includes('Duplicate') || err.message.includes('already exists')) {
        console.log('   ⚠️  enum ของ status ถูกต้องแล้ว - ข้าม');
      } else {
        throw err;
      }
    }

    // 5. อัพเดท user ที่ status เป็น NULL หรือ '' ให้เป็น 'pending'
    console.log('📝 5. กำลังอัพเดท user ที่ status เป็น NULL หรือ empty...');
    const [updateResult] = await conn.query(`
      UPDATE sso_user 
      SET status = 'pending' 
      WHERE status IS NULL OR status = '' OR status NOT IN ('pending', 'active', 'inactive')
    `);
    console.log(`   ✅ อัพเดท ${updateResult.affectedRows} records`);

    // 6. เพิ่ม INDEX สำหรับ approved_by (ถ้ายังไม่มี)
    console.log('📝 6. กำลังเพิ่ม INDEX สำหรับ approved_by...');
    try {
      await conn.query(`
        CREATE INDEX idx_approved_by ON sso_user(approved_by)
      `);
      console.log('   ✅ เพิ่ม INDEX สำเร็จ');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  INDEX มีอยู่แล้ว - ข้าม');
      } else {
        throw err;
      }
    }

    // 7. เพิ่ม FOREIGN KEY สำหรับ approved_by (ถ้ายังไม่มี)
    console.log('📝 7. กำลังเพิ่ม FOREIGN KEY สำหรับ approved_by...');
    try {
      await conn.query(`
        ALTER TABLE sso_user 
        ADD CONSTRAINT fk_approved_by 
        FOREIGN KEY (approved_by) REFERENCES sso_user(id) 
        ON DELETE SET NULL
      `);
      console.log('   ✅ เพิ่ม FOREIGN KEY สำเร็จ');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠️  FOREIGN KEY มีอยู่แล้ว - ข้าม');
      } else {
        console.log(`   ⚠️  ไม่สามารถเพิ่ม FOREIGN KEY: ${err.message} - ข้าม`);
      }
    }

    // 8. ตรวจสอบผลลัพธ์
    console.log('\n📊 8. ตรวจสอบโครงสร้างตาราง sso_user:');
    const [columns] = await conn.query('DESCRIBE sso_user');
    columns.forEach((col) => {
      if (['status', 'approved_by', 'approved_at'].includes(col.Field)) {
        console.log(`   - ${col.Field}: ${col.Type} (Default: ${col.Default})`);
      }
    });

    // 9. แสดงสรุปข้อมูล user
    console.log('\n📊 9. สรุปข้อมูล user:');
    const [users] = await conn.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM sso_user
      GROUP BY status
    `);
    users.forEach((row) => {
      console.log(`   - ${row.status || 'NULL'}: ${row.count} users`);
    });

    console.log('\n✅ Migration เสร็จสมบูรณ์!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
      console.log('\n🔌 ปิดการเชื่อมต่อ database');
    }
  }
}

runMigration();
