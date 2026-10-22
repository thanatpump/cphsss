import { NextRequest, NextResponse } from 'next/server';
import { fetchSsopAudit, type SsopAuditMode } from '@/lib/ssop-audit';

const MODES = new Set(['cases', 'allocate', 'reject', 'vaccine', 'pp']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get('year') || new Date().getFullYear());
    const mode = (searchParams.get('mode') || 'cases') as SsopAuditMode;
    if (!MODES.has(mode)) {
      return NextResponse.json({ success: false, error: 'โหมดไม่ถูกต้อง' }, { status: 400 });
    }
    const data = await fetchSsopAudit({
      year,
      mode,
      hcode: searchParams.get('hcode') || undefined,
      page: Number(searchParams.get('page') || 1),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('ssop audit', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'โหลดไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
