import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

// POST: เปลี่ยน role ของ user (เฉพาะ admin_server)
export async function POST(request: NextRequest) {
  try {
    const { user_id, new_role, admin_id } = await request.json();

    if (!user_id || !new_role || !admin_id) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    if (!['user', 'admin_rps', 'admin_server'].includes(new_role)) {
      return NextResponse.json(
        { success: false, error: 'Role ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // ตรวจสอบว่า admin มีสิทธิ์ (ต้องเป็น admin_server)
    const [adminRows]: any[] = await db.query(
      'SELECT role FROM sso_user WHERE id = ? AND status = "active"',
      [admin_id]
    );

    if (adminRows.length === 0 || adminRows[0].role !== 'admin_server') {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เปลี่ยน role' },
        { status: 403 }
      );
    }

    // เปลี่ยน role
    await db.query(
      'UPDATE sso_user SET role = ? WHERE id = ?',
      [new_role, user_id]
    );

    return NextResponse.json({
      success: true,
      message: 'เปลี่ยน role สำเร็จ'
    });

  } catch (error) {
    console.error('Error changing role:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการเปลี่ยน role',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
