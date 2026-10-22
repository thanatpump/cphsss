import { NextRequest, NextResponse } from 'next/server';
import { fetchChronicAudit } from '@/lib/chronic-audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const data = await fetchChronicAudit({
      year: Number(searchParams.get('year') || new Date().getFullYear()),
      hcode: searchParams.get('hcode') || undefined,
      page: Number(searchParams.get('page') || 1),
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('chronic audit', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'โหลดไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
