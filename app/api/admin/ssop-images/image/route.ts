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
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return 'image/gif';
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return 'application/octet-stream';
}

export async function GET(request: NextRequest) {
  let db: Awaited<ReturnType<typeof getDB>> | undefined;
  try {
    const { searchParams } = new URL(request.url);
    const adminId = String(searchParams.get('admin_id') || '').trim();
    const hcode = String(searchParams.get('hcode') || '').trim();
    const cid = String(searchParams.get('cid') || '').trim();
    const vstdate = String(searchParams.get('vstdate') || '').trim();
    const vn = String(searchParams.get('vn') || '').trim();
    const hn = String(searchParams.get('hn') || '').trim();
    const authen = String(searchParams.get('authen') || '').trim();

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

    const [rows]: any[] = await db.query(
      `SELECT image_file
       FROM ssop_image
       WHERE hcode = ?
         AND cid = ?
         AND DATE_FORMAT(vstdate, '%Y-%m-%d') = ?
         AND vn = ?
         AND hn = ?
         AND authen = ?
       LIMIT 1`,
      [hcode, cid, vstdate, vn, hn, authen]
    );

    if (!Array.isArray(rows) || rows.length === 0 || !rows[0]?.image_file) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบรูปภาพที่ต้องการ' },
        { status: 404 }
      );
    }

    const imageBuffer = Buffer.from(rows[0].image_file);
    const contentType = detectImageContentType(imageBuffer);
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error fetching ssop_image blob:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงรูปภาพ',
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

