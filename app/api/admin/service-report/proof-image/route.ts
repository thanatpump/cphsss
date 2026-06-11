import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

function detectImageContentType(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  return 'application/octet-stream';
}

export async function GET(request: NextRequest) {
  let db: Awaited<ReturnType<typeof getDB>> | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || searchParams.get('admin_id');
    const authen = String(searchParams.get('authen') || '').trim();
    const cid = String(searchParams.get('cid') || '').trim();

    if (!userId || !authen || !cid) {
      return NextResponse.json(
        { success: false, error: 'ต้องระบุ user_id, authen, cid' },
        { status: 400 }
      );
    }

    db = await getDB();

    const [userRows]: any[] = await db.query(
      'SELECT role, hospital_name FROM sso_user WHERE id = ? AND status = "active"',
      [userId]
    );

    if (userRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 401 }
      );
    }

    const currentUser = userRows[0];
    const allowedRoles = ['admin_server', 'admin_rps', 'user'];
    if (!allowedRoles.includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const [accessRows]: any[] = await db.query(
      `SELECT COALESCE(u.hospital_name, ls.hosname) AS hospital_name
       FROM authen_code ac
       LEFT JOIN sso_user u ON ac.hcode = u.username
       LEFT JOIN login_sks ls ON ac.hcode = ls.user_sks
       WHERE ac.authen = ? AND ac.citizen_id = ?
       LIMIT 1`,
      [authen, cid]
    );

    if (!accessRows.length) {
      return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลการให้บริการ' }, { status: 404 });
    }

    const recordHospital = accessRows[0].hospital_name;
    if (
      currentUser.role !== 'admin_server' &&
      currentUser.hospital_name &&
      recordHospital !== currentUser.hospital_name
    ) {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์ดูรูปนี้' }, { status: 403 });
    }

    const [rows]: any[] = await db.query(
      `SELECT image_file FROM ssop_image WHERE authen = ? AND cid = ? LIMIT 1`,
      [authen, cid]
    );

    if (!rows?.[0]?.image_file) {
      return NextResponse.json({ success: false, error: 'ไม่พบรูปหลักฐาน' }, { status: 404 });
    }

    const imageBuffer = Buffer.from(rows[0].image_file);
    const contentType = detectImageContentType(imageBuffer);

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=120',
      },
    });
  } catch (error) {
    console.error('Error fetching proof image:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการดึงรูปภาพ' },
      { status: 500 }
    );
  } finally {
    try {
      await db?.end();
    } catch {
      // ignore
    }
  }
}
