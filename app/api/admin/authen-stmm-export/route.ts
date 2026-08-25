import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenStmmAccess } from '@/lib/authen-stmm-access';
import { exportAuthenStmmExcelBuffer } from '@/lib/authen-stmm-match';
import { parseMonthValue } from '@/lib/data-match-authen';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const userSks = searchParams.get('user_sks');
    const requestedHcode = searchParams.get('hcode');
    const month = searchParams.get('month')?.trim() || null;

    if (month && !parseMonthValue(month)) {
      return NextResponse.json({ success: false, error: 'รูปแบบเดือนไม่ถูกต้อง ใช้ YYYY-MM' }, { status: 400 });
    }

    const accessResult = await resolveAuthenStmmAccess({ userId, userSks, requestedHcode });
    if ('error' in accessResult) {
      return NextResponse.json({ success: false, error: accessResult.error }, { status: accessResult.status });
    }

    const { access } = accessResult;
    const { buffer, filename, summary } = await exportAuthenStmmExcelBuffer({
      month,
      hcode: access.hcode,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Match-Summary': JSON.stringify(summary),
      },
    });
  } catch (error) {
    console.error('Error exporting authen-stmm excel:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการ export Excel',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
