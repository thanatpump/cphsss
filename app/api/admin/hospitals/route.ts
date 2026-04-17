import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

// GET: ดึงรายชื่อ รพสต จาก sso_user (สำหรับ admin_server เห็นทั้งหมด, admin_rps เห็นเฉพาะของตัวเอง)
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

    if (admin.role === 'admin_server') {
      // admin เซิฟเห็น รพสตทั้งหมด
      query = `SELECT DISTINCT hospital_name 
               FROM sso_user 
               WHERE hospital_name IS NOT NULL AND hospital_name != ''
               ORDER BY hospital_name ASC`;
    } else if (admin.role === 'admin_rps' && admin.hospital_name) {
      // admin_rps เห็นเฉพาะ รพสตของตัวเอง
      query = `SELECT DISTINCT hospital_name 
               FROM sso_user 
               WHERE hospital_name = ? AND hospital_name IS NOT NULL AND hospital_name != ''
               ORDER BY hospital_name ASC`;
      params = [admin.hospital_name];
    } else {
      return NextResponse.json(
        { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const [rows]: any[] = await db.query(query, params);
    const hospitals = rows.map((row: any) => row.hospital_name);

    return NextResponse.json({
      success: true,
      hospitals
    });

  } catch (error) {
    console.error('Error fetching hospitals:', error);
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
