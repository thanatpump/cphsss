import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

type RateBucket = { count: number; resetAtMs: number };

// เก็บใน memory ของ process (เหมาะกับ aaPanel / instance เดียว)
const apiBuckets = new Map<string, RateBucket>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  const xrip = req.headers.get('x-real-ip');
  if (xrip) return xrip.trim();
  return 'unknown';
}

export function middleware(req: NextRequest) {
  // ป้องกันยิง API ถี่ๆ แบบง่าย: 120 req / 60s ต่อ IP
  if (!req.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const ip = getClientIp(req);
  const now = Date.now();
  const windowMs = 60 * 1000;
  const limit = 120;
  const key = ip;

  const bucket = apiBuckets.get(key);
  if (!bucket || now >= bucket.resetAtMs) {
    apiBuckets.set(key, { count: 1, resetAtMs: now + windowMs });
    return NextResponse.next();
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAtMs - now) / 1000));
    return NextResponse.json(
      { success: false, error: 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};

