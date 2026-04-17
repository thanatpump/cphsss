import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_sks = searchParams.get('user_sks');
    
    const db = await getDB();
    
    // ถ้าไม่มี user_sks ให้แสดงข้อมูลทั้งหมด (สำหรับ admin)
    if (!user_sks) {
    const [signstmmRows]: any[] = await db.query('SELECT COUNT(*) as count FROM signstmm');
    const [signstmsRows]: any[] = await db.query('SELECT COUNT(*) as count FROM signstms');
    const [sognstmmRows]: any[] = await db.query('SELECT COUNT(*) as count FROM sognstmm');
    const [sognstmpRows]: any[] = await db.query('SELECT COUNT(*) as count FROM sognstmp');
      
      const signstmm = signstmmRows[0]?.count || 0;
      const signstms = signstmsRows[0]?.count || 0;
      const sognstmm = sognstmmRows[0]?.count || 0;
      const sognstmp = sognstmpRows[0]?.count || 0;
      
      const total = signstmm + signstms + sognstmm + sognstmp;
      
      return NextResponse.json({
        signstmm,
        signstms,
        sognstmm,
        sognstmp,
        total
      });
    }
    
    // ใช้ user_sks เทียบกับ hproc
    const hproc = user_sks;
    
    // นับจำนวนข้อมูลในแต่ละตารางตาม hproc
    const [signstmmRows]: any[] = await db.query('SELECT COUNT(*) as count FROM signstmm WHERE hproc = ?', [hproc]);
    const [signstmsRows]: any[] = await db.query('SELECT COUNT(*) as count FROM signstms WHERE hproc = ?', [hproc]);
    const [sognstmmRows]: any[] = await db.query('SELECT COUNT(*) as count FROM sognstmm WHERE hproc = ?', [hproc]);
    const [sognstmpRows]: any[] = await db.query('SELECT COUNT(*) as count FROM sognstmp WHERE hproc = ?', [hproc]);
    
    const signstmm = signstmmRows[0]?.count || 0;
    const signstms = signstmsRows[0]?.count || 0;
    const sognstmm = sognstmmRows[0]?.count || 0;
    const sognstmp = sognstmpRows[0]?.count || 0;
    
    const total = signstmm + signstms + sognstmm + sognstmp;
    
    return NextResponse.json({
      signstmm,
      signstms,
      sognstmm,
      sognstmp,
      total
    });
    
  } catch (error) {
    console.error('Error fetching database info:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ' 
    }, { status: 500 });
  }
} 