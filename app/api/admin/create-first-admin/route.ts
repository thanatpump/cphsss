import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';
import bcrypt from 'bcrypt';

// POST: สร้าง admin เซิฟคนแรก (ใช้ได้เฉพาะเมื่อยังไม่มี admin_server)
export async function POST(request: NextRequest) {
  try {
    const { 
      username, 
      password, 
      first_name = 'Admin',
      last_name = 'System',
      phone = '0000000000',
      citizen_id = '0000000000000',
      birth_date = '2000-01-01',
      hospital_name = 'System',
      position = 'System Administrator'
    } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอก username และ password' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // ตรวจสอบว่ามี admin_server อยู่แล้วหรือไม่
    // ตรวจสอบว่า column role มีอยู่หรือไม่ก่อน
    let existingAdminRows: any[] = [];
    try {
      const result: any = await db.query(
        'SELECT id FROM sso_user WHERE role = "admin_server"'
      );
      existingAdminRows = Array.isArray(result[0]) ? result[0] : [];
    } catch (err: any) {
      // ถ้า column role ยังไม่มี ให้ข้ามการตรวจสอบ (จะสร้าง admin คนแรกได้)
      if (err.code === 'ER_BAD_FIELD_ERROR' && err.sqlMessage?.includes('role')) {
        console.log('Column role ยังไม่มีในตาราง - จะสร้าง admin คนแรก');
        existingAdminRows = [];
      } else {
        throw err;
      }
    }

    if (existingAdminRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'มี Admin เซิฟอยู่แล้ว ไม่สามารถสร้างใหม่ได้' },
        { status: 403 }
      );
    }

    // ตรวจสอบว่า username ซ้ำหรือไม่
    const [usernameRows]: any[] = await db.query(
      'SELECT id FROM sso_user WHERE username = ?',
      [username]
    );
    if (usernameRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // สร้าง admin เซิฟ (status = active, role = admin_server, approved_by = NULL เพราะเป็นคนแรก)
    await db.query(
      `INSERT INTO sso_user
       (first_name, last_name, phone, citizen_id, birth_date, hospital_name, position, username, password, role, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin_server', 'active')`,
      [first_name, last_name, phone, citizen_id, birth_date, hospital_name, position, username, hashedPassword]
    );

    return NextResponse.json({
      success: true,
      message: 'สร้าง Admin เซิฟสำเร็จ! กรุณาเข้าสู่ระบบด้วย username และ password ที่ตั้งไว้'
    });

  } catch (error) {
    console.error('Error creating first admin:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการสร้าง Admin',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
