import type { PoolConnection, Connection } from 'mysql2/promise';

export type DbConn = PoolConnection | Connection;

export interface HospitalInfo {
  name: string;
  ampName: string;
}

function normalizeHcode(value: unknown): string {
  return String(value ?? '').trim();
}

/**
 * ดึงชื่อสถานบริการ (+ อำเภอถ้ามี) จากหลายตาราง
 * ลำดับความสำคัญ: login_sks → sso_user → hospcode
 */
export async function loadHospitalDirectory(db: DbConn): Promise<Map<string, HospitalInfo>> {
  const map = new Map<string, HospitalInfo>();

  const setIfEmpty = (hcode: string, name: string, ampName = '') => {
    const code = normalizeHcode(hcode);
    const cleanName = String(name ?? '').trim();
    const cleanAmp = String(ampName ?? '').trim();
    if (!code || !cleanName) return;
    const prev = map.get(code);
    if (!prev) {
      map.set(code, { name: cleanName, ampName: cleanAmp });
      return;
    }
    if (!prev.ampName && cleanAmp) {
      map.set(code, { name: prev.name, ampName: cleanAmp });
    }
  };

  try {
    const [loginRows]: any[] = await db.query(
      'SELECT user_sks AS hcode, hosname AS name FROM login_sks WHERE user_sks IS NOT NULL AND user_sks != \'\''
    );
    for (const row of loginRows || []) {
      setIfEmpty(row.hcode, row.name);
    }
  } catch {
    // table may be missing on some envs
  }

  try {
    const [userRows]: any[] = await db.query(
      `
      SELECT username AS hcode, hospital_name AS name
      FROM sso_user
      WHERE status = 'active'
        AND username IS NOT NULL AND username != ''
        AND hospital_name IS NOT NULL AND hospital_name != ''
      `
    );
    for (const row of userRows || []) {
      setIfEmpty(row.hcode, row.name);
    }
  } catch {
    // ignore
  }

  try {
    const [hospRows]: any[] = await db.query(
      `
      SELECT hospcode_5_digit AS hcode, name, amp_name
      FROM hospcode
      WHERE hospcode_5_digit IS NOT NULL AND hospcode_5_digit != ''
        AND name IS NOT NULL AND name != ''
      `
    );
    for (const row of hospRows || []) {
      setIfEmpty(row.hcode, row.name, row.amp_name);
    }
  } catch {
    // ignore
  }

  return map;
}

export function hospitalName(map: Map<string, HospitalInfo>, hcode: unknown, fallback = ''): string {
  const code = normalizeHcode(hcode);
  if (!code) return fallback;
  return map.get(code)?.name || fallback || code;
}

export function hospitalLabel(map: Map<string, HospitalInfo>, hcode: unknown): string {
  const code = normalizeHcode(hcode);
  if (!code) return '-';
  const name = map.get(code)?.name;
  return name ? `${code} ${name}` : code;
}

export function hospitalAmp(map: Map<string, HospitalInfo>, hcode: unknown): string {
  const code = normalizeHcode(hcode);
  if (!code) return '';
  return map.get(code)?.ampName || '';
}
