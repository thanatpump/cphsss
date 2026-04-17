import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { 
      first_name, 
      last_name, 
      phone, 
      citizen_id, 
      birth_date, 
      hospital_name, 
      position, 
      username, 
      password 
    } = await request.json();

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!first_name || !last_name || !phone || !citizen_id || !birth_date || 
        !hospital_name || !position || !username || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // ตรวจสอบความยาวรหัสบัตรประชาชน
    if (citizen_id.length !== 13) {
      return NextResponse.json(
        { success: false, error: 'รหัสบัตรประชาชนต้องมี 13 หลัก' },
        { status: 400 }
      );
    }

    // ตรวจสอบความยาว username
    if (username.length < 3) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร' },
        { status: 400 }
      );
    }

    // ตรวจสอบความยาว password
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    const db = await getDB();

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

    // ตรวจสอบว่ารหัสบัตรประชาชนซ้ำหรือไม่
    const [citizenRows]: any[] = await db.query(
      'SELECT id FROM sso_user WHERE citizen_id = ?',
      [citizen_id]
    );
    if (citizenRows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว' },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // บันทึกข้อมูล (status = 'pending' ต้องรอ admin เซิฟยืนยัน, role = 'user' เป็น default)
    const [result]: any[] = await db.query(
      `INSERT INTO sso_user
       (first_name, last_name, phone, citizen_id, birth_date, hospital_name, position, username, password, role, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'pending')`,
      [first_name, last_name, phone, citizen_id, birth_date, hospital_name, position, username, hashedPassword]
    );

    // Debug: ตรวจสอบข้อมูลที่บันทึก
    const [insertedUser]: any[] = await db.query(
      'SELECT id, username, role, status FROM sso_user WHERE id = ?',
      [result.insertId]
    );
    console.log('User registered:', insertedUser[0]);

    return NextResponse.json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ'
    });

  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
