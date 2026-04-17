import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

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

    // สร้างชื่อไฟล์ใหม่ (timestamp + random + extension)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const originalExtension = path.extname(file.name) || '.jpg';
    const newFileName = `${timestamp}_${random}${originalExtension}`;

    // สร้าง directory ถ้ายังไม่มี
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proof');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // บันทึกไฟล์
    const filePath = path.join(uploadDir, newFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    // สร้าง path สำหรับเก็บใน database (relative path จาก public)
    const dbPath = `/uploads/proof/${newFileName}`;

    console.log('✅ อัพโหลดรูปหลักฐานสำเร็จ:', dbPath);

    return NextResponse.json({
      success: true,
      data: {
        path: dbPath,
        fileName: newFileName,
        originalName: file.name,
        size: file.size,
      },
      message: 'อัพโหลดรูปหลักฐานสำเร็จ',
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
  }
}
