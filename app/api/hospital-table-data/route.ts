import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_sks = searchParams.get('user_sks');
    if (!user_sks) return NextResponse.json({ signstmm: [], signstms: [], sognstmm: [], sognstmp: [] });
    
    const db = await getDB();
    const hproc = user_sks;
    // ดึงข้อมูลจากแต่ละตาราง (จำกัด 10 รายการล่าสุด)
    const [signstmmRows]: any[] = await db.query('SELECT * FROM signstmm WHERE hproc = ? ORDER BY id DESC LIMIT 10', [hproc]);
    const [signstmsRows]: any[] = await db.query('SELECT * FROM signstms WHERE hproc = ? ORDER BY id DESC LIMIT 10', [hproc]);
    const [sognstmmRows]: any[] = await db.query('SELECT * FROM sognstmm WHERE hproc = ? ORDER BY id DESC LIMIT 10', [hproc]);
    const [sognstmpRows]: any[] = await db.query('SELECT * FROM sognstmp WHERE hproc = ? ORDER BY id DESC LIMIT 10', [hproc]);
    
    return NextResponse.json({
      signstmm: signstmmRows || [],
      signstms: signstmsRows || [],
      sognstmm: sognstmmRows || [],
      sognstmp: sognstmpRows || []
    });
  } catch (error) {
    console.error('Error fetching hospital table data:', error);
    return NextResponse.json({ signstmm: [], signstms: [], sognstmm: [], sognstmp: [] });
  }
} 