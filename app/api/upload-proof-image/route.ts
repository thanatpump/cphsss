import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getDB } from '@/lib/database';

export async function POST(request: NextRequest) {
  let db: Awaited<ReturnType<typeof getDB>> | undefined;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userSks = String(formData.get('user_sks') || '').trim();
    const citizenId = String(formData.get('citizen_id') || '').trim();
    const vstdate = String(formData.get('vstdate') || '').trim();

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

    // แปลง user_sks เป็น hcode 5 หลัก
    const normalizedHcode = /^\d+$/.test(userSks) ? userSks.padStart(5, '0').slice(0, 5) : null;
    const normalizedCid = citizenId && /^\d{13}$/.test(citizenId) ? citizenId : null;
    const normalizedVstdate = /^\d{4}-\d{2}-\d{2}$/.test(vstdate) ? vstdate : null;

    await db.query(
      `INSERT INTO ssop_image (hcode, cid, vstdate, vn, hn, authen, image_file)
       VALUES (?, ?, ?, NULL, NULL, NULL, ?)`,
      [normalizedHcode, normalizedCid, normalizedVstdate, buffer]
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
