import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenStmmAccess } from '@/lib/authen-stmm-access';
import { fetchAuthVerificationStats, fetchAuthVerificationStatsByFacility } from '@/lib/authen-auth-stats';
import { parseDateParam, validateDateRange } from '@/lib/auth-date-range';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userSks = searchParams.get('user_sks');
    const requestedHcode = searchParams.get('hcode');
    const mode = searchParams.get('mode')?.trim() || 'summary';
    const dateFrom = parseDateParam(searchParams.get('start'));
    const dateTo = parseDateParam(searchParams.get('end'));

    if (searchParams.get('start') && !dateFrom) {
      return NextResponse.json({ success: false, error: 'รูปแบบวันที่เริ่มต้นไม่ถูกต้อง ใช้ YYYY-MM-DD' }, { status: 400 });
    }
    if (searchParams.get('end') && !dateTo) {
      return NextResponse.json({ success: false, error: 'รูปแบบวันที่สิ้นสุดไม่ถูกต้อง ใช้ YYYY-MM-DD' }, { status: 400 });
    }

    const rangeError = validateDateRange(dateFrom, dateTo);
    if (rangeError) {
      return NextResponse.json({ success: false, error: rangeError }, { status: 400 });
    }

    if (mode === 'facilities') {
      const facilities = await fetchAuthVerificationStatsByFacility({ dateFrom, dateTo });
      return NextResponse.json({
        success: true,
        dateFrom,
        dateTo,
        facilities,
      });
    }

    const accessResult = await resolveAuthenStmmAccess({ userId, userSks, requestedHcode });
    if ('error' in accessResult) {
      return NextResponse.json({ success: false, error: accessResult.error }, { status: accessResult.status });
    }

    const { access } = accessResult;
    const stats = await fetchAuthVerificationStats({
      hcode: access.hcode,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      success: true,
      access: {
        isAdmin: access.isAdmin,
        hcode: access.hcode,
        facilityName: access.hospitalName,
      },
      stats,
    });
  } catch (error) {
    console.error('Error fetching auth verification stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงสถิติการยืนยันตัวตน',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
