import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

/**
 * Generate authen code จาก user_sks, date, time, citizen_id
 * รูปแบบ: [user_sks 5 หลัก][2 หลักท้ายของปี][เดือน 2 หลัก][วัน 2 หลัก][เวลา hhmmss]
 * 
 * ตัวอย่าง:
 * - user_sks: 12345 → 12345
 * - date: 12032025 (ddmmyyyy) → ปี 25, เดือน 03, วัน 12
 * - time: 11:30:21 → 113021
 * - authen = 12345250312113021
 */
function generateAuthenCode(user_sks: string, date: string, time: string): string {
  // ใช้เลขเต็ม 5 หลักของ user_sks (padStart เพื่อให้แน่ใจว่าเป็น 5 หลัก)
  const userSksFull = user_sks.padStart(5, '0').slice(0, 5);
  
  // แยก date (ddmmyyyy) เป็น วัน, เดือน, ปี
  const day = date.slice(0, 2);
  const month = date.slice(2, 4);
  const year = date.slice(6, 8); // 2 หลักท้ายของปี
  
  // แปลง time (HH:mm:ss) เป็น hhmmss
  const timeFormatted = time.replace(/:/g, '');
  
  // รวมกัน: user_sks(5) + year(2) + month(2) + day(2) + time(6) = 17 หลัก
  return `${userSksFull}${year}${month}${day}${timeFormatted}`;
}

/**
 * POST /api/authen-code
 * บันทึกข้อมูล authen_code
 */
export async function POST(request: NextRequest) {
  try {
    const { user_sks, date, time, citizen_id, officer_citizen_id, auth_type, vstdate, proof_image_path } =
      await request.json();

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!user_sks || !date || !time || !citizen_id) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน: ต้องมี user_sks, date, time, citizen_id' },
        { status: 400 }
      );
    }

    // ตรวจสอบรูปแบบ date (ต้องเป็น ddmmyyyy)
    if (!/^\d{8}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบวันที่ไม่ถูกต้อง: ต้องเป็น ddmmyyyy (เช่น 12032025)' },
        { status: 400 }
      );
    }

    // ตรวจสอบรูปแบบ time (ต้องเป็น HH:mm:ss)
    if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบเวลาไม่ถูกต้อง: ต้องเป็น HH:mm:ss (เช่น 11:30:21)' },
        { status: 400 }
      );
    }

    // ตรวจสอบ citizen_id (ต้องเป็น 13 หลัก)
    if (!/^\d{13}$/.test(citizen_id)) {
      return NextResponse.json(
        { success: false, error: 'เลขบัตรประชาชนไม่ถูกต้อง: ต้องเป็นตัวเลข 13 หลัก' },
        { status: 400 }
      );
    }

    // ตรวจสอบ officer_citizen_id (ถ้ามี ต้องเป็น 13 หลัก)
    if (officer_citizen_id && !/^\d{13}$/.test(officer_citizen_id)) {
      return NextResponse.json(
        { success: false, error: 'เลขบัตรประชาชนเจ้าหน้าที่ไม่ถูกต้อง: ต้องเป็นตัวเลข 13 หลัก' },
        { status: 400 }
      );
    }

    // ตรวจสอบ auth_type (ถ้ามี จำกัดให้เป็น 2 แบบของระบบเรา)
    if (auth_type && !['Auth_card', 'Auth_manual'].includes(String(auth_type))) {
      return NextResponse.json(
        { success: false, error: 'auth_type ไม่ถูกต้อง (ต้องเป็น Auth_card หรือ Auth_manual)' },
        { status: 400 }
      );
    }

    // ตรวจสอบ vstdate (ถ้ามี ต้องเป็น YYYY-MM-DD)
    if (vstdate && !/^\d{4}-\d{2}-\d{2}$/.test(String(vstdate))) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบ vstdate ไม่ถูกต้อง: ต้องเป็น YYYY-MM-DD (เช่น 2026-01-28)' },
        { status: 400 }
      );
    }

    // Generate authen code
    const authen = generateAuthenCode(user_sks, date, time);

    // บันทึกลงฐานข้อมูล
    const db = await getDB();
    try {
      // สร้าง table ถ้ายังไม่มี (ใช้ hcode เป็น field name แต่เก็บค่า user_sks)
      await db.query(`
        CREATE TABLE IF NOT EXISTS authen_code (
          id INT AUTO_INCREMENT PRIMARY KEY,
          hcode VARCHAR(20) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (user_sks - hcode 5 หลัก)',
          date VARCHAR(8) NOT NULL,
          time VARCHAR(8) NOT NULL,
          citizen_id VARCHAR(13) NOT NULL,
          officer_citizen_id VARCHAR(13) NULL COMMENT 'เลขบัตรประชาชนเจ้าหน้าที่ที่บันทึกข้อมูล',
          authen VARCHAR(20) NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          auth_type VARCHAR(20) NULL,
          vstdate DATE NULL,
          vn VARCHAR(15) NULL,
          hn VARCHAR(9) NULL,
          INDEX idx_authen (authen),
          INDEX idx_citizen_id (citizen_id),
          INDEX idx_hcode_date (hcode, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      // บันทึกข้อมูล (รองรับกรณี DB บางเครื่องยังไม่มีบาง column)
      const [cols]: any[] = await db.query(
        `SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'authen_code'
           AND COLUMN_NAME IN ('officer_citizen_id', 'auth_type', 'vstdate', 'proof_image_path')`
      );
      const colSet = new Set((Array.isArray(cols) ? cols : []).map((r: any) => r.COLUMN_NAME));

      const insertCols = ['hcode', 'date', 'time', 'citizen_id'];
      const insertVals: any[] = [user_sks, date, time, citizen_id];

      if (colSet.has('officer_citizen_id')) {
        insertCols.push('officer_citizen_id');
        insertVals.push(officer_citizen_id || null);
      }

      if (colSet.has('auth_type')) {
        insertCols.push('auth_type');
        insertVals.push(auth_type || null);
      }

      if (colSet.has('vstdate')) {
        insertCols.push('vstdate');
        insertVals.push(vstdate || null);
      }

      if (colSet.has('proof_image_path')) {
        insertCols.push('proof_image_path');
        insertVals.push(proof_image_path || null);
      }

      insertCols.push('authen');
      insertVals.push(authen);

      const placeholders = insertCols.map(() => '?').join(', ');
      await db.query(
        `INSERT INTO authen_code (${insertCols.join(', ')}) VALUES (${placeholders})`,
        insertVals
      );

      console.log('✅ บันทึก authen_code สำเร็จ:', {
        authen,
        hcode: user_sks,
        date,
        time,
        citizen_id,
        officer_citizen_id,
        auth_type,
        vstdate,
        proof_image_path,
      });

      return NextResponse.json({
        success: true,
        data: {
          authen,
          hcode: user_sks,
          date,
          time,
          citizen_id,
          officer_citizen_id: officer_citizen_id || null,
          auth_type: auth_type || null,
          vstdate: vstdate || null,
          proof_image_path: proof_image_path || null,
        },
        message: 'บันทึกข้อมูลสำเร็จ'
      });
    } catch (dbError: any) {
      console.error('❌ Database Error:', dbError);
      
      // ตรวจสอบว่าเป็น duplicate key error หรือไม่
      if (dbError.code === 'ER_DUP_ENTRY' || dbError.message?.includes('UNIQUE constraint')) {
        return NextResponse.json(
          { success: false, error: 'authen code นี้มีอยู่แล้วในระบบ' },
          { status: 409 }
        );
      }
      
      throw dbError;
    } finally {
      await db.end();
    }

  } catch (error) {
    console.error('❌ Authen Code Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/authen-code
 * ดึงข้อมูล authen_code (สำหรับดูข้อมูล)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const citizenId = searchParams.get('citizen_id');
    const userSks = searchParams.get('user_sks');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = await getDB();
    
    try {
      // สร้าง table ถ้ายังไม่มี (ใช้ hcode เป็น field name แต่เก็บค่า user_sks)
      await db.query(`
        CREATE TABLE IF NOT EXISTS authen_code (
          id INT AUTO_INCREMENT PRIMARY KEY,
          hcode VARCHAR(20) NOT NULL COMMENT 'ชื่อผู้ใช้งาน (user_sks - hcode 5 หลัก)',
          date VARCHAR(8) NOT NULL,
          time VARCHAR(8) NOT NULL,
          citizen_id VARCHAR(13) NOT NULL,
          officer_citizen_id VARCHAR(13) NULL COMMENT 'เลขบัตรประชาชนเจ้าหน้าที่ที่บันทึกข้อมูล',
          authen VARCHAR(20) NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          auth_type VARCHAR(20) NULL,
          vstdate DATE NULL,
          proof_image_path VARCHAR(500) NULL COMMENT 'Path ของรูปหลักฐาน (สำหรับกรณีกรอกเลขบัตรด้วยตนเอง)',
          vn VARCHAR(15) NULL,
          hn VARCHAR(9) NULL,
          INDEX idx_authen (authen),
          INDEX idx_citizen_id (citizen_id),
          INDEX idx_hcode_date (hcode, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      let query = 'SELECT * FROM authen_code WHERE 1=1';
      const params: any[] = [];

      if (citizenId) {
        query += ' AND citizen_id = ?';
        params.push(citizenId);
      }

      if (userSks) {
        query += ' AND hcode = ?';
        params.push(userSks);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.query(query, params);

      return NextResponse.json({
        success: true,
        data: rows,
        count: Array.isArray(rows) ? rows.length : 0
      });
    } finally {
      await db.end();
    }

  } catch (error) {
    console.error('❌ Error fetching authen_code:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
      },
      { status: 500 }
    );
  }
}
