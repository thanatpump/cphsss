import { NextRequest, NextResponse } from 'next/server';
import { fetchAipnAudit, type AipnAuditMode } from '@/lib/aipn-audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year') || new Date().getFullYear());
    const mode = (searchParams.get('mode') || 'cases') as AipnAuditMode;
    const data = await fetchAipnAudit({
      year,
      mode,
      minRw: Number(searchParams.get('minRw') || 0) || undefined,
      hcode: searchParams.get('hcode') || undefined,
      page: Number(searchParams.get('page') || 1),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('aipn audit', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'โหลดไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
