import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getDB } from '@/lib/database';

function mapToHcode5(rawHoscode: string): string {
  const value = String(rawHoscode || '').trim();
  if (!/^\d+$/.test(value)) return '';
  if (value.length > 5) {
    return String(Math.floor(Number(value) / 100)).padStart(5, '0').slice(0, 5);
  }
  return value.padStart(5, '0').slice(0, 5);
}

function generateVnTimestamp(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

export async function POST(request: NextRequest) {
  let db: Awaited<ReturnType<typeof getDB>> | undefined;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userSks = String(formData.get('user_sks') || '').trim();
    const citizenId = String(formData.get('citizen_id') || '').trim();
    const vstdate = String(formData.get('vstdate') || '').trim();
    const vn = String(formData.get('vn') || '').trim();
    const hn = String(formData.get('hn') || '').trim();
    const authen = String(formData.get('authen') || '').trim();

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบไฟล์ที่อัพโหลด' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าเป็นไฟล์รูปภาพหรือไม่
    const validImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      'image/tiff',
      'image/x-icon',
    ];

    // ตรวจสอบจาก MIME type หรือ extension
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const fileExtension = path.extname(fileName).toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.tif', '.ico'];

    const isValidImage =
      validImageTypes.includes(fileType) ||
      validExtensions.includes(fileExtension) ||
      fileType.startsWith('image/');

    if (!isValidImage) {
      return NextResponse.json(
        { success: false, error: 'ไฟล์ที่อัพโหลดต้องเป็นไฟล์รูปภาพเท่านั้น' },
        { status: 400 }
      );
    }

    // จำกัดขนาดไฟล์ 5 MB
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, error: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5 MB)' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    db = await getDB();

    // แปลง user_sks -> hoscode ใน login_sks -> hcode 5 หลัก
    let normalizedHcode = '';
    const [loginRows]: any[] = await db.query(
      'SELECT hoscode FROM login_sks WHERE user_sks = ? LIMIT 1',
      [userSks]
    );
    if (Array.isArray(loginRows) && loginRows.length > 0) {
      normalizedHcode = mapToHcode5(String(loginRows[0]?.hoscode || ''));
    }
    // fallback กรณีไม่เจอใน login_sks
    if (!normalizedHcode) {
      normalizedHcode = mapToHcode5(userSks);
    }

    const normalizedCid = citizenId && /^\d{13}$/.test(citizenId) ? citizenId : '';
    const normalizedVstdate = /^\d{4}-\d{2}-\d{2}$/.test(vstdate)
      ? vstdate
      : new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());
    const normalizedVn = vn || generateVnTimestamp();
    const normalizedHn = hn || '';
    const normalizedAuthen = authen || `${normalizedHcode}${normalizedVn}`;

    await db.query(
      `INSERT INTO ssop_image (hcode, cid, vstdate, vn, hn, authen, image_file)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [normalizedHcode, normalizedCid, normalizedVstdate, normalizedVn, normalizedHn, normalizedAuthen, buffer]
    );

    const proofRef = `ssop_image_blob:${Date.now()}`;
    console.log('✅ อัพโหลดรูปหลักฐานลง ssop_image สำเร็จ:', {
      hcode: normalizedHcode,
      cid: normalizedCid,
      vstdate: normalizedVstdate,
      size: file.size,
    });

    return NextResponse.json({
      success: true,
      data: {
        path: proofRef,
        fileName: path.basename(file.name),
        originalName: file.name,
        size: file.size,
      },
      message: 'อัพโหลดรูปหลักฐานสำเร็จ (เก็บลงฐานข้อมูล)',
    });
  } catch (error) {
    console.error('❌ Error uploading proof image:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัพโหลดรูปหลักฐาน',
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
