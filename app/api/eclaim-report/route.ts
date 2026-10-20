import { NextRequest, NextResponse } from 'next/server';
import { fetchEclaimReport } from '@/lib/eclaim-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const yearParam = request.nextUrl.searchParams.get('year');
    const year = yearParam ? Number(yearParam) : undefined;
    if (yearParam && (!Number.isFinite(year) || Number(year) < 2000)) {
      return NextResponse.json({ success: false, error: 'ปีไม่ถูกต้อง' }, { status: 400 });
    }

    const data = await fetchEclaimReport(year);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching E-claim report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงรายงาน E-claim',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
