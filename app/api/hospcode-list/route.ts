import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  let db: Awaited<ReturnType<typeof getDB>> | undefined;
  try {
    db = await getDB();
    const [data] = await db.query(
      'SELECT id, hospcode_5_digit, name, amp_name, amppart, chwpart, hospital_type_id FROM hospcode ORDER BY CAST(hospcode_5_digit AS UNSIGNED)'
    );
    return NextResponse.json({ data });
  } catch (error) {
    console.error('hospcode-list error:', error);
    return NextResponse.json(
      {
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  } finally {
    try {
      await db?.end();
    } catch {
      // ignore close errors
    }
  }
} 