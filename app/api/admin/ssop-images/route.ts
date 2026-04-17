import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

function toInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: NextRequest) {
  let db: Awaited<ReturnType<typeof getDB>> | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('admin_id');
    const page = toInt(searchParams.get('page'), 1, 1, 10000);
    const limit = toInt(searchParams.get('limit'), 20, 1, 100);
    const offset = (page - 1) * limit;

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ admin_id' },
        { status: 400 }
      );
    }

    db = await getDB();

    const [adminRows]: any[] = await db.query(
      `SELECT id, username, role, status
       FROM sso_user
       WHERE id = ?`,
      [adminId]
    );

    if (!Array.isArray(adminRows) || adminRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    const admin = adminRows[0];
    const isAllowed =
      admin.status === 'active' &&
      admin.role === 'admin_server' &&
      String(admin.username || '').toLowerCase() === 'adminserver';

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: 'หน้านี้อนุญาตเฉพาะบัญชี adminserver เท่านั้น' },
        { status: 403 }
      );
    }

    const [countRows]: any[] = await db.query(
      `SELECT COUNT(*) AS total
       FROM ssop_image`
    );
    const total = countRows?.[0]?.total ?? 0;

    const [rows]: any[] = await db.query(
      `SELECT
         hcode,
         cid,
         DATE_FORMAT(vstdate, '%Y-%m-%d') AS vstdate,
         vn,
         hn,
         authen,
         OCTET_LENGTH(image_file) AS image_bytes
       FROM ssop_image
       ORDER BY vstdate DESC, vn DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching ssop_image list:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงรายการตรวจสอบ',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    try {
      await db?.end();
    } catch {
      // ignore close errors
    }
  }
}

