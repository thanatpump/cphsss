import type { Icd10FileType } from '@/lib/icd10-types';

export interface ParsedIcd10Visit {
  clinic: string;
  clinic2: string;
  hcode: string;
  ref1: string;
  ref2: string;
  hn: string;
  visitNo: string;
  cid: string;
  visitAt: string | null;
  codes: string[];
}

export interface ParsedIcd10File {
  fileName: string;
  fileType: Icd10FileType;
  hcode: string;
  period: string;
  batchKey: string;
  visitCount: number;
  diagCount: number;
  visits: ParsedIcd10Visit[];
  dateFrom: string | null;
  dateTo: string | null;
}

function detectFileType(fileName: string): Icd10FileType | null {
  const base = fileName.split(/[/\\]/).pop() || fileName;
  if (/^OPD/i.test(base) || /_OPD/i.test(base)) return 'OPD';
  if (/^IPD/i.test(base) || /_IPD/i.test(base)) return 'IPD';
  return null;
}

/** OPD202609 → 202609, IPD6909 → 202609 (พ.ศ.ย่อ 69 = ค.ศ. 2026) */
export function detectPeriod(fileName: string, fileType: Icd10FileType): string {
  const base = (fileName.split(/[/\\]/).pop() || fileName).replace(/\.[^.]+$/, '');
  const full = base.match(/(20\d{2})(0[1-9]|1[0-2])/);
  if (full) return `${full[1]}${full[2]}`;

  if (fileType === 'IPD') {
    // IPD6909 = พ.ศ.ย่อ 69 + เดือน 09 → ค.ศ. 2026-09
    const short = base.match(/(\d{2})(0[1-9]|1[0-2])$/);
    if (short) {
      const yy = Number(short[1]);
      const mm = short[2];
      const ceYear = yy + 1957;
      return `${ceYear}${mm}`;
    }
  }

  const opd = base.match(/OPD(\d{6})/i);
  if (opd) return opd[1];

  return '';
}

function normalizeDateTime(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  // 2026-08-03T10:49:52 → MySQL datetime
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return value.replace('T', ' ').slice(0, 19);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 19);
  return null;
}

function parseOpdLine(parts: string[]): ParsedIcd10Visit | null {
  if (parts.length < 8) return null;
  const codes = parts.slice(7).map((c) => c.trim()).filter(Boolean);
  if (!codes.length) return null;
  return {
    clinic: parts[0]?.trim() || '',
    clinic2: parts[1]?.trim() || '',
    hcode: parts[2]?.trim() || '',
    ref1: parts[3]?.trim() || '',
    ref2: '',
    hn: '',
    visitNo: parts[4]?.trim() || '',
    cid: parts[6]?.trim() || '',
    visitAt: normalizeDateTime(parts[5] || ''),
    codes,
  };
}

function parseIpdLine(parts: string[]): ParsedIcd10Visit | null {
  if (parts.length < 8) return null;
  const codes = parts.slice(7).map((c) => c.trim()).filter(Boolean);
  if (!codes.length) return null;
  return {
    clinic: parts[1]?.trim() || '',
    clinic2: parts[2]?.trim() || '',
    hcode: parts[3]?.trim() || '',
    ref1: parts[0]?.trim() || '',
    ref2: '',
    hn: parts[4]?.trim() || '',
    visitNo: parts[5]?.trim() || '',
    cid: parts[6]?.trim() || '',
    visitAt: null,
    codes,
  };
}

export function parseIcd10TextFile(fileName: string, content: string): ParsedIcd10File {
  const fileType = detectFileType(fileName);
  if (!fileType) {
    throw new Error('ไม่รู้จักชนิดไฟล์ — ต้องขึ้นต้นด้วย OPD หรือ IPD เช่น OPD202609.TXT');
  }

  const period = detectPeriod(fileName, fileType);
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  const visits: ParsedIcd10Visit[] = [];
  let hcode = '';
  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  let diagCount = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split('|');
    const visit = fileType === 'OPD' ? parseOpdLine(parts) : parseIpdLine(parts);
    if (!visit) continue;
    if (!hcode && visit.hcode) hcode = visit.hcode;
    visits.push(visit);
    diagCount += visit.codes.length;
    if (visit.visitAt) {
      const day = visit.visitAt.slice(0, 10);
      if (!dateFrom || day < dateFrom) dateFrom = day;
      if (!dateTo || day > dateTo) dateTo = day;
    }
  }

  if (!period) {
    throw new Error('อ่านงวด (period) จากชื่อไฟล์ไม่ได้ เช่น OPD202609.TXT หรือ IPD6909.TXT');
  }
  if (!hcode) {
    throw new Error('ไม่พบรหัสหน่วยบริการ (hcode) ในไฟล์');
  }
  if (!visits.length) {
    throw new Error('ไม่พบรายการวินิจฉัยในไฟล์');
  }

  return {
    fileName: fileName.split(/[/\\]/).pop() || fileName,
    fileType,
    hcode,
    period,
    batchKey: `${hcode}_${period}_${fileType}`,
    visitCount: visits.length,
    diagCount,
    visits,
    dateFrom,
    dateTo,
  };
}
