import { NextRequest, NextResponse } from 'next/server';
import { fetchAipnReport } from '@/lib/aipn-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const yearParam = request.nextUrl.searchParams.get('year');
    const year = yearParam ? Number(yearParam) : undefined;
    if (yearParam && (!Number.isFinite(year) || Number(year) < 2000)) {
      return NextResponse.json({ success: false, error: 'ปีไม่ถูกต้อง' }, { status: 400 });
    }

    const data = await fetchAipnReport(year);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching AIPN report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงรายงาน AIPN',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
