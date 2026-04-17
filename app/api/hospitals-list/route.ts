import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    
    // ดึงรายชื่อ รพสต จาก login_sks โดยเลือกเฉพาะ hosname ที่ไม่ซ้ำ
    const [rows]: any[] = await db.query(
      'SELECT DISTINCT hosname FROM login_sks WHERE hosname IS NOT NULL AND hosname != "" ORDER BY hosname ASC'
    );
    
    const hospitals = rows.map((row: any) => row.hosname);
    
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
