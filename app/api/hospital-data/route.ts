import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_sks = searchParams.get('user_sks');
    if (!user_sks) return NextResponse.json({ signstmm: 0, signstms: 0, sognstmm: 0, sognstmp: 0 });
    
    const db = await getDB();
    
    // ดึง hoscode จาก login_sks (คอลัมน์จริงใน DB)
    const [loginRows]: any[] = await db.query('SELECT hoscode FROM login_sks WHERE user_sks = ?', [user_sks]);
    if (!loginRows.length) return NextResponse.json({ signstmm: 0, signstms: 0, sognstmm: 0, sognstmp: 0 });
    
    const hoscodeRaw = String(loginRows[0].hoscode || '').trim();

    // hproc ในตารางข้อมูลหลักเป็นรหัส 5 หลัก
    // แต่ใน login_sks.hoscode บางแถวเป็น 9 หลัก (เช่น 001097400)
    const hproc = /^\d+$/.test(hoscodeRaw)
      ? hoscodeRaw.length > 5
        ? String(Math.floor(Number(hoscodeRaw) / 100)).padStart(5, '0')
        : hoscodeRaw.padStart(5, '0')
      : hoscodeRaw;
    
    // นับจำนวนข้อมูลในแต่ละตาราง (ใช้ hproc)
    const [signstmmRows]: any[] = await db.query('SELECT COUNT(*) as count FROM signstmm WHERE hproc = ?', [hproc]);
    const [signstmsRows]: any[] = await db.query('SELECT COUNT(*) as count FROM signstms WHERE hproc = ?', [hproc]);
    const [sognstmmRows]: any[] = await db.query('SELECT COUNT(*) as count FROM sognstmm WHERE hproc = ?', [hproc]);
    const [sognstmpRows]: any[] = await db.query('SELECT COUNT(*) as count FROM sognstmp WHERE hproc = ?', [hproc]);
    
    return NextResponse.json({
      signstmm: signstmmRows[0]?.count || 0,
      signstms: signstmsRows[0]?.count || 0,
      sognstmm: sognstmmRows[0]?.count || 0,
      sognstmp: sognstmpRows[0]?.count || 0
    });
  } catch (error) {
    console.error('Error fetching hospital data:', error);
    return NextResponse.json({ signstmm: 0, signstms: 0, sognstmm: 0, sognstmp: 0 });
  }
} 