import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

type RateBucket = { count: number; resetAtMs: number };
const loginRateBuckets = new Map<string, RateBucket>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  const xrip = req.headers.get('x-real-ip');
  if (xrip) return xrip.trim();
  return 'unknown';
}

function rateLimitLogin(req: NextRequest, username: string) {
  // คุม brute-force แบบเบาๆ: 10 ครั้ง / 5 นาที ต่อ IP+username
  const key = `${getClientIp(req)}|${String(username || '').trim()}`;
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const limit = 10;

  const bucket = loginRateBuckets.get(key);
  if (!bucket || now >= bucket.resetAtMs) {
    loginRateBuckets.set(key, { count: 1, resetAtMs: now + windowMs });
    return { allowed: true as const };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAtMs - now) / 1000));
    return { allowed: false as const, retryAfterSec };
  }
  return { allowed: true as const };
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }, { status: 400 });
    }

    const rl = rateLimitLogin(request, username);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'มีการพยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }
    const db = await getDB();
    console.log('Login attempt:', String(username || ''));
    const [rows]: any[] = await db.query(
      'SELECT hoscode FROM login_sks WHERE user_sks = ? AND password_sks = ?',
      [username, password]
    );
    console.log('Login result count:', Array.isArray(rows) ? rows.length : 0);
    if (rows.length === 1) {
      return NextResponse.json({ success: true, hospcode: rows[0].hoscode });
    } else {
      return NextResponse.json({ success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 