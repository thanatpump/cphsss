import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_sks = searchParams.get('user_sks');
    if (!user_sks) return NextResponse.json({ hosname: '' });
    const db = await getDB();
    const [rows]: any[] = await db.query('SELECT hosname FROM login_sks WHERE user_sks = ?', [user_sks]);
    return NextResponse.json({ hosname: rows[0]?.hosname || '' });
  } catch (error) {
    return NextResponse.json({ hosname: '' });
  }
} 