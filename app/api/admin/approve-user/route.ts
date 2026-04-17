import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

// POST: อนุมัติ user (เปลี่ยน status จาก pending เป็น active)
export async function POST(request: NextRequest) {
  try {
    const { user_id, admin_id } = await request.json();

    if (!user_id || !admin_id) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // ตรวจสอบว่า admin มีสิทธิ์ (ต้องเป็น admin_server หรือ admin_rps)
    const [adminRows]: any[] = await db.query(
      'SELECT role, hospital_name FROM sso_user WHERE id = ? AND status = "active"',
      [admin_id]
    );

    if (adminRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล admin' },
        { status: 401 }
      );
    }

    const admin = adminRows[0];

    // admin_server ยืนยันได้ทุกคน, admin_rps ยืนยันได้เฉพาะรพสตเดียวกัน
    if (admin.role === 'admin_server') {
      // admin เซิฟยืนยันได้ทุกคน
    } else if (admin.role === 'admin_rps' && admin.hospital_name) {
      // admin_rps ต้องตรวจสอบว่า user ที่จะยืนยันอยู่ในรพสตเดียวกัน
      const [userRows]: any[] = await db.query(
        'SELECT hospital_name FROM sso_user WHERE id = ?',
        [user_id]
      );

      if (userRows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'ไม่พบข้อมูล user' },
          { status: 404 }
        );
      }

      if (userRows[0].hospital_name !== admin.hospital_name) {
        return NextResponse.json(
          { success: false, error: 'คุณสามารถยืนยันได้เฉพาะ user ในรพสตของคุณเท่านั้น' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์อนุมัติ' },
        { status: 403 }
      );
    }

    // ตรวจสอบว่า column approved_by มีอยู่หรือไม่
    const [columnCheck]: any[] = await db.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'sso_user' 
       AND COLUMN_NAME = 'approved_by'`
    );
    const hasApprovedBy = columnCheck[0]?.count > 0;

    // อนุมัติ user
    if (hasApprovedBy) {
      await db.query(
        `UPDATE sso_user 
         SET status = 'active', approved_by = ?, approved_at = NOW() 
         WHERE id = ?`,
        [admin_id, user_id]
      );
    } else {
      // ถ้ายังไม่มี column approved_by ให้อัปเดตแค่ status
      await db.query(
        `UPDATE sso_user 
         SET status = 'active' 
         WHERE id = ?`,
        [user_id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'อนุมัติผู้ใช้สำเร็จ'
    });

  } catch (error) {
    console.error('Error approving user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการอนุมัติ',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
