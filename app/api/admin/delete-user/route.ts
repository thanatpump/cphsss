import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

// DELETE: ลบ user (admin_rps ลบได้เฉพาะ รพสตเดียวกัน, admin_server ลบได้ทุกคน)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const admin_id = searchParams.get('admin_id');

    if (!user_id || !admin_id) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // ตรวจสอบว่า admin มีสิทธิ์
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

    // ตรวจสอบสิทธิ์การลบ
    if (admin.role === 'admin_server') {
      // admin เซิฟลบได้ทุกคน
    } else if (admin.role === 'admin_rps' && admin.hospital_name) {
      // admin_rps ลบได้เฉพาะ รพสตเดียวกัน
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
          { success: false, error: 'ไม่มีสิทธิ์ลบ user จาก รพสตอื่น' },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์ลบ' },
        { status: 403 }
      );
    }

    // ลบ user (หรือเปลี่ยน status เป็น inactive)
    await db.query(
      'UPDATE sso_user SET status = "inactive" WHERE id = ?',
      [user_id]
    );

    return NextResponse.json({
      success: true,
      message: 'ลบผู้ใช้สำเร็จ'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการลบ',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
