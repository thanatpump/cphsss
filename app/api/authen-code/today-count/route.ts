import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

/**
 * GET /api/authen-code/today-count
 * นับจำนวนคนที่มาใช้บริการในวันนี้ (กรองด้วย hcode/user_sks)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userSks = searchParams.get('user_sks');

    if (!userSks) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ user_sks' },
        { status: 400 }
      );
    }

    // แปลงวันที่วันนี้เป็นรูปแบบ ddmmyyyy
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear());
    const todayDate = `${day}${month}${year}`; // ddmmyyyy

    const db = await getDB();
    
    try {
      // สร้าง table ถ้ายังไม่มี
      await db.query(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // นับจำนวนคนที่มาใช้บริการในวันนี้ (นับ unique citizen_id)
      const [rows]: any[] = await db.query(
        `SELECT COUNT(DISTINCT citizen_id) as count 
         FROM authen_code 
         WHERE hcode = ? AND date = ?`,
        [userSks, todayDate]
      );

      const count = rows[0]?.count || 0;

      return NextResponse.json({
        success: true,
        count: count,
        date: todayDate,
        user_sks: userSks
      });
    } finally {
      await db.end();
    }

  } catch (error) {
    console.error('❌ Error counting today usage:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนับจำนวน' 
      },
      { status: 500 }
    );
  }
}
