import { NextRequest, NextResponse } from 'next/server';
import { fetchEclaimAudit } from '@/lib/eclaim-audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = (searchParams.get('mode') || 'allocate') as 'category' | 'allocate' | 'reject';
    const data = await fetchEclaimAudit({
      year: Number(searchParams.get('year') || new Date().getFullYear()),
      mode,
      hcode: searchParams.get('hcode') || undefined,
      page: Number(searchParams.get('page') || 1),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('eclaim audit', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'โหลดไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
