import { NextRequest, NextResponse } from 'next/server';
import {
  countAuthenInDb,
  enrichHcareWithNames,
  fetchAuthenByInvNos,
  matchInvNoWithAuthen,
  parseMonthValue,
} from '@/lib/data-match-authen';
import {
  DataMatchSource,
  countSognByMonth,
  fetchSognByMonth,
} from '@/lib/data-match-db';

function parseSource(value: string | null | undefined): DataMatchSource {
  if (value === 'sognstmm' || value === 'sognstmp' || value === 'all') {
    return value;
  }
  return 'all';
}

function sourceLabel(source: DataMatchSource): string {
  if (source === 'sognstmm') return 'SOGNSTMM (ผู้ป่วยนอก)';
  if (source === 'sognstmp') return 'SOGNSTMP (ผู้ป่วยนอกพิเศษ)';
  return 'SOGNSTMM + SOGNSTMP';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month')?.trim() || null;
    const source = parseSource(searchParams.get('source'));

    if (!month) {
      return NextResponse.json(
        { error: 'ต้องระบุ month (YYYY-MM)' },
        { status: 400 }
      );
    }

    if (!parseMonthValue(month)) {
      return NextResponse.json(
        { error: 'รูปแบบเดือนไม่ถูกต้อง ใช้ YYYY-MM' },
        { status: 400 }
      );
    }

    const [authenTotal, sognCounts] = await Promise.all([
      countAuthenInDb(null, month),
      countSognByMonth(month, source),
    ]);

    return NextResponse.json({
      success: true,
      month,
      source,
      authenTotal,
      sognstmmTotal: sognCounts.sognstmm,
      sognstmpTotal: sognCounts.sognstmp,
      sognTotal: sognCounts.total,
    });
  } catch (error) {
    console.error('Error in data-match GET:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const month = String(body.month || '').trim();
    const source = parseSource(body.source);

    if (!month) {
      return NextResponse.json(
        { error: 'กรุณาเลือกเดือน' },
        { status: 400 }
      );
    }

    if (!parseMonthValue(month)) {
      return NextResponse.json(
        { error: 'รูปแบบเดือนไม่ถูกต้อง ใช้ YYYY-MM' },
        { status: 400 }
      );
    }

    const dbResult = await fetchSognByMonth(month, source);
    if (!dbResult || dbResult.parsed.billCount === 0) {
      return NextResponse.json(
        {
          error: `ไม่พบข้อมูล ${sourceLabel(source)} สำหรับเดือน ${month}`,
        },
        { status: 400 }
      );
    }

    const compareParsed = dbResult.parsed;
    const bills = compareParsed.bills;

    const invNos = bills
      .map((bill) => bill.invno.trim())
      .filter(Boolean);

    if (invNos.length === 0) {
      return NextResponse.json(
        { error: 'ไม่พบเลข InvNo ในข้อมูลที่เลือก' },
        { status: 400 }
      );
    }

    const authenRows = await fetchAuthenByInvNos(invNos, null, month);
    const result = matchInvNoWithAuthen(
      bills,
      authenRows,
      compareParsed.fileName
    );
    result.byHcare = await enrichHcareWithNames(result.byHcare);

    return NextResponse.json({
      success: true,
      reference: {
        source: 'database',
        dbTable: 'authen_code',
        matchField: 'authen',
        fileName: 'ฐานข้อมูล (authen_code)',
        recordCount: authenRows.length,
        totalInDb: await countAuthenInDb(null, month),
        month,
      },
      compare: {
        source: 'database',
        dbTable: source === 'all' ? 'sognstmm+sognstmp' : source,
        sourceLabel: sourceLabel(source),
        fileName: compareParsed.fileName,
        fileType: compareParsed.fileType,
        stmDoc: dbResult.matchedStmDoc,
        matchMode: dbResult.matchMode,
        billCount: compareParsed.billCount,
        billTotal: compareParsed.billTotal,
        uniqueInvNoCount: result.summary.uniqueInvNoCount,
        month,
        matchSource: source,
      },
      result,
    });
  } catch (error) {
    console.error('Error matching data:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการชนข้อมูล' },
      { status: 500 }
    );
  }
}
