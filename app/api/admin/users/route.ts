import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

// GET: ดึงรายการ user ทั้งหมด (สำหรับ admin เซิฟ) หรือ user ใน รพสตเดียวกัน (สำหรับ admin_rps)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('admin_id');
    const adminRole = searchParams.get('admin_role');
    const adminHospital = searchParams.get('admin_hospital');

    if (!adminId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล admin' },
        { status: 401 }
      );
    }

    const db = await getDB();

    // ตรวจสอบว่า admin มีสิทธิ์
    const [adminRows]: any[] = await db.query(
      'SELECT role, hospital_name FROM sso_user WHERE id = ? AND status = "active"',
      [adminId]
    );

    if (adminRows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูล admin' },
        { status: 401 }
      );
    }

    const admin = adminRows[0];

    let query = '';
    let params: any[] = [];

    // ตรวจสอบว่า column approved_by และ approved_at มีอยู่หรือไม่
    const [columnCheckBy]: any[] = await db.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'sso_user' 
       AND COLUMN_NAME = 'approved_by'`
    );
    const hasApprovedBy = columnCheckBy[0]?.count > 0;

    const [columnCheckAt]: any[] = await db.query(
      `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'sso_user' 
       AND COLUMN_NAME = 'approved_at'`
    );
    const hasApprovedAt = columnCheckAt[0]?.count > 0;

    // สร้าง SELECT fields ตาม column ที่มี
    let selectFields = `id, first_name, last_name, phone, citizen_id, birth_date, 
         hospital_name, position, username, role, status`;
    
    if (hasApprovedBy) {
      selectFields += `, approved_by`;
    }
    if (hasApprovedAt) {
      selectFields += `, approved_at`;
    }
    
    selectFields += `, created_at`;

    if (admin.role === 'admin_server') {
      // admin เซิฟเห็นทุกคน
      query = `SELECT ${selectFields} 
               FROM sso_user 
               ORDER BY created_at DESC`;
    } else if (admin.role === 'admin_rps' && admin.hospital_name) {
      // admin_rps เห็นเฉพาะ รพสตเดียวกัน
      query = `SELECT ${selectFields} 
               FROM sso_user 
               WHERE hospital_name = ?
               ORDER BY created_at DESC`;
      params = [admin.hospital_name];
    } else {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const [rows]: any[] = await db.query(query, params);

    // Debug: log ข้อมูล user ที่ได้
    console.log('Users fetched:', rows.length);
    console.log('Sample user:', rows[0]);
    console.log('Users with pending status:', rows.filter((u: any) => u.status === 'pending').length);

    return NextResponse.json({
      success: true,
      users: rows
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        detail: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
