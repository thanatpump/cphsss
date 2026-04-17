import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // ดึงข้อมูลผู้ใช้
    const [rows]: any[] = await db.query(
      `SELECT id, first_name, last_name, phone, citizen_id, birth_date, 
              hospital_name, position, username, password, role, status 
       FROM sso_user WHERE username = ?`,
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    const user = rows[0];

    // ตรวจสอบสถานะ - บังคับให้ยืนยันก่อน
    if (!user.status || user.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'บัญชีของคุณยังรอการยืนยันจากผู้ดูแลระบบ กรุณารอการอนุมัติ' },
        { status: 403 }
      );
    }

    if (user.status === 'inactive') {
      return NextResponse.json(
        { success: false, error: 'บัญชีนี้ถูกระงับการใช้งาน' },
        { status: 403 }
      );
    }

    // ตรวจสอบว่า status = 'active' เท่านั้น
    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'บัญชีของคุณยังไม่ได้รับการอนุมัติ กรุณารอการยืนยันจากผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    // ตรวจสอบ password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // ส่งข้อมูลผู้ใช้กลับไป (ไม่ส่ง password)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        citizen_id: user.citizen_id,
        birth_date: user.birth_date,
        hospital_name: user.hospital_name,
        position: user.position,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
