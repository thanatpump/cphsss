import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenStmmAccess } from '@/lib/authen-stmm-access';
import {
  AuthenStmmRowCategory,
  fetchAuthenStmmComparison,
  fetchAuthenStmmDashboardSummary,
  fetchAuthenStmmDetailRows,
  fetchAuthenStmmFacilityBreakdown,
} from '@/lib/authen-stmm-dashboard';
import { parseMonthValue } from '@/lib/data-match-authen';

function parseCategory(value: string | null): AuthenStmmRowCategory {
  if (value === 'mismatch' || value === 'only-authen' || value === 'only-stmm') return value;
  return 'matched';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userSks = searchParams.get('user_sks');
    const requestedHcode = searchParams.get('hcode');
    const month = searchParams.get('month')?.trim() || null;
    const mode = searchParams.get('mode') || 'summary';
    const category = parseCategory(searchParams.get('category'));
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '50');

    if (month && !parseMonthValue(month)) {
      return NextResponse.json({ success: false, error: 'รูปแบบเดือนไม่ถูกต้อง ใช้ YYYY-MM' }, { status: 400 });
    }

    const accessResult = await resolveAuthenStmmAccess({ userId, userSks, requestedHcode });
    if ('error' in accessResult) {
      return NextResponse.json({ success: false, error: accessResult.error }, { status: accessResult.status });
    }

    const { access } = accessResult;

    if (mode === 'facilities') {
      if (!access.isAdmin) {
        return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์ดูข้อมูลทุกสถานบริการ' }, { status: 403 });
      }

      const facilities = await fetchAuthenStmmFacilityBreakdown({ month });
      return NextResponse.json({ success: true, month, facilities });
    }

    if (mode === 'compare') {
      const comparison = await fetchAuthenStmmComparison({
        month,
        selfHcode: access.hcode,
      });

      return NextResponse.json({
        success: true,
        month,
        self_hcode: access.hcode,
        comparison,
      });
    }

    if (mode === 'rows') {
      const result = await fetchAuthenStmmDetailRows({
        hcode: access.hcode,
        month,
        category,
        page,
        limit,
      });

      return NextResponse.json({
        success: true,
        month,
        hcode: access.hcode,
        category,
        ...result,
      });
    }

    const summary = await fetchAuthenStmmDashboardSummary({
      hcode: access.hcode,
      month,
      facilityName: access.hospitalName,
    });

    return NextResponse.json({
      success: true,
      access: {
        isAdmin: access.isAdmin,
        hcode: access.hcode,
        facilityName: access.hospitalName,
      },
      summary,
    });
  } catch (error) {
    console.error('Error in authen-stmm-match API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
