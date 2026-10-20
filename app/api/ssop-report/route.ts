import { NextRequest, NextResponse } from 'next/server';
import { fetchSsopReport } from '@/lib/ssop-report';

export async function GET(request: NextRequest) {
  try {
    const yearParam = request.nextUrl.searchParams.get('year');
    const year = yearParam ? Number(yearParam) : undefined;
    if (yearParam && (!Number.isFinite(year) || Number(year) < 2000)) {
      return NextResponse.json({ success: false, error: 'ปีไม่ถูกต้อง' }, { status: 400 });
    }

    const data = await fetchSsopReport(year);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching SSOP report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงรายงานบริการประกันสังคม',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
