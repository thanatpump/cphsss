import { NextRequest, NextResponse } from 'next/server';
import { fetchAuthenReport } from '@/lib/authen-report';
import { parseDateParam, validateDateRange } from '@/lib/auth-date-range';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = parseDateParam(searchParams.get('start'));
    const dateTo = parseDateParam(searchParams.get('end'));

    if (searchParams.get('start') && !dateFrom) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบวันที่เริ่มต้นไม่ถูกต้อง ใช้ YYYY-MM-DD' },
        { status: 400 }
      );
    }
    if (searchParams.get('end') && !dateTo) {
      return NextResponse.json(
        { success: false, error: 'รูปแบบวันที่สิ้นสุดไม่ถูกต้อง ใช้ YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const rangeError = validateDateRange(dateFrom, dateTo);
    if (rangeError) {
      return NextResponse.json({ success: false, error: rangeError }, { status: 400 });
    }

    const data = await fetchAuthenReport({ dateFrom, dateTo });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching authen report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงรายงานการยืนยันตัวตน',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
