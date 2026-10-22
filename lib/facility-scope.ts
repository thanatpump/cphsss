export type FacilityKind = 'hospital' | 'pcu';

const EXTRA_WIDE = new Set([13887, 13888, 14425, 23977, 24684, 25020, 43766]);

export function facilityNumber(code: unknown): number {
  const raw = String(code ?? '').trim();
  if (!raw) return NaN;
  const n = Number(raw.replace(/^0+/, '') || '0');
  return Number.isFinite(n) ? n : NaN;
}

/** Hmain/Hproc ชุดเต็มในสไลด์ SSOP และ AIPN */
export function isWideFacility(code: unknown): boolean {
  const n = facilityNumber(code);
  if (!Number.isFinite(n)) return false;
  if (n === 10702) return true;
  if (n >= 10970 && n <= 10983) return true;
  if (n >= 3929 && n <= 4093) return true;
  return EXTRA_WIDE.has(n);
}

/** ชุดสั้นในสไลด์ E-claim / โรคเรื้อรัง / วัคซีน / PP */
export function isShortFacility(code: unknown): boolean {
  const n = facilityNumber(code);
  if (!Number.isFinite(n)) return false;
  return n === 10702 || (n >= 10970 && n <= 10983);
}

export function facilityKind(name: string): FacilityKind {
  if (/โรงพยาบาลส่งเสริม|รพ\.?\s*สต|รพสต|สถานีอนามัย|ศูนย์สุขภาพชุมชน|หน่วยบริการปฐมภูมิ/i.test(name)) {
    return 'pcu';
  }
  return 'hospital';
}

export function inIcdRange(code: string, start: string, end: string): boolean {
  const value = code.replace(/\./g, '').toUpperCase();
  if (value.length < 4) return false;
  const head = value.slice(0, 4);
  return head >= start && head <= end;
}
