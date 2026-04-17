import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    const basePath = process.cwd();
    const folderPath = path.join(basePath, 'card-reader-desktop', 'SSO-CardReader-For-Users');
    const zipPath = path.join(basePath, 'card-reader-desktop', 'SSO-CardReader-For-Users.zip');

    // ตรวจสอบว่าโฟลเดอร์มีอยู่หรือไม่
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบโฟลเดอร์ SSO-CardReader-For-Users' },
        { status: 404 }
      );
    }

    // สร้างไฟล์ ZIP (ถ้ายังไม่มี หรือไฟล์เก่าเกิน 1 ชั่วโมง)
    let needCreateZip = true;
    if (fs.existsSync(zipPath)) {
      const stats = fs.statSync(zipPath);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      if (stats.mtimeMs > oneHourAgo) {
        needCreateZip = false;
      }
    }

    if (needCreateZip) {
      try {
        // ใช้ zip command (Mac/Linux) หรือ PowerShell (Windows)
        const isWindows = process.platform === 'win32';
        
        if (isWindows) {
          // Windows: ใช้ PowerShell
          const psCommand = `powershell -Command "Compress-Archive -Path '${folderPath}\\*' -DestinationPath '${zipPath}' -Force"`;
          await execAsync(psCommand);
        } else {
          // Mac/Linux: ใช้ zip command
          const zipCommand = `cd "${path.dirname(folderPath)}" && zip -r "${path.basename(zipPath)}" "${path.basename(folderPath)}" -x "*.DS_Store" "*/._*"`;
          await execAsync(zipCommand);
        }
      } catch (error) {
        console.error('Error creating ZIP:', error);
        // ถ้าสร้าง ZIP ไม่ได้ ให้ส่ง error
        return NextResponse.json(
          { success: false, error: 'ไม่สามารถสร้างไฟล์ ZIP ได้ - กรุณาใช้ create-zip.bat หรือ create-zip.sh แทน' },
          { status: 500 }
        );
      }
    }

    // ตรวจสอบว่าไฟล์ ZIP มีอยู่หรือไม่
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบไฟล์ ZIP - กรุณาใช้ create-zip.bat หรือ create-zip.sh สร้างไฟล์ก่อน' },
        { status: 404 }
      );
    }

    // อ่านไฟล์ ZIP
    const zipBuffer = fs.readFileSync(zipPath);
    const stats = fs.statSync(zipPath);

    // ส่งไฟล์กลับ
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="SSO-CardReader-For-Users.zip"`,
        'Content-Length': stats.size.toString(),
      },
    });

  } catch (error) {
    console.error('Error downloading ZIP:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' 
      },
      { status: 500 }
    );
  }
}
