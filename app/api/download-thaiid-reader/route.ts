import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Path ไปยังไฟล์ ThaiIDCardReader.exe
    const filePath = path.join(
      process.cwd(),
      'card-reader-desktop',
      'SSO-CardReader-For-Users',
      'ThaiIDCardReader',
      'ThaiIDCardReader.exe'
    );

    // ตรวจสอบว่าไฟล์มีอยู่หรือไม่
    try {
      await fs.access(filePath);
    } catch (error) {
      return NextResponse.json(
        { error: 'ไม่พบไฟล์ ThaiIDCardReader.exe' },
        { status: 404 }
      );
    }

    // อ่านไฟล์
    const fileBuffer = await fs.readFile(filePath);
    const fileStats = await fs.stat(filePath);

    // ส่งไฟล์กลับไปพร้อม headers ที่เหมาะสม
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/x-msdownload',
        'Content-Disposition': 'attachment; filename="ThaiIDCardReader.exe"',
        'Content-Length': fileStats.size.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading ThaiIDCardReader.exe:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' },
      { status: 500 }
    );
  }
}
