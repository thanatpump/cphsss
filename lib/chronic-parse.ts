import * as XLSX from 'xlsx';
import type { ChronicFileType } from '@/lib/chronic-types';

export interface ParsedAcdConfRow {
  ln: string;
  type: string;
  diseaseCode: string;
  caseId: string;
  pid: string;
  firstDate: string | null;
  serviceCount: number;
  serviceFrom: string | null;
  serviceTo: string | null;
  dxCount: number;
  dxLast: string | null;
  drugCount: number;
  drugLast: string | null;
  confirmed: string;
  confirmPeriod: string;
}

export interface ParsedAcdDetailRow {
  no: string;
  hcode: string;
  hproc: string;
  dttran: string | null;
  hn: string;
  pid: string;
  rid: string;
  invno: string;
  diseaseCode: string;
  caseId: string;
}

export interface ParsedChronicFile {
  fileName: string;
  fileType: ChronicFileType;
  hcode: string;
  period: string;
  batchKey: string;
  rowCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  confRows: ParsedAcdConfRow[];
  detailRows: ParsedAcdDetailRow[];
  skipped: boolean;
  skipReason?: string;
}

function detectFileType(fileName: string): ChronicFileType | null {
  const base = (fileName.split(/[/\\]/).pop() || fileName).toUpperCase();
  if (base.includes('ACDCONF')) return 'ACDCONF';
  if (base.includes('ACDDETAIL') || base.includes('ACD_DETAIL')) return 'ACDDETAIL';
  if (base.includes('ACDSUM')) return 'ACDSUM';
  return null;
}

function detectPeriod(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop() || fileName;
  const m = base.match(/(20\d{2})(0[1-9]|1[0-2])/);
  return m ? `${m[1]}${m[2]}` : '';
}

function detectHcode(fileName: string, fallback = ''): string {
  const base = fileName.split(/[/\\]/).pop() || fileName;
  const m = base.match(/^(\d{5})_/);
  return m ? m[1] : fallback;
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const y = Number(value.slice(0, 4));
  return y >= 1990 && y <= 2100;
}

function toDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    if (y < 1990 || y > 2100) return null;
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const day = text.slice(0, 10);
    return isValidIsoDate(day) ? day : null;
  }
  return null;
}

function toInt(value: unknown): number {
  const n = parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function trackDates(dates: Array<string | null>) {
  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  for (const day of dates) {
    if (!day) continue;
    if (!dateFrom || day < dateFrom) dateFrom = day;
    if (!dateTo || day > dateTo) dateTo = day;
  }
  return { dateFrom, dateTo };
}

function parseAcdConfSheet(rows: unknown[][]): ParsedAcdConfRow[] {
  const out: ParsedAcdConfRow[] = [];
  // แถว 0 = header หลัก, แถว 1 = sub-header, ข้อมูลเริ่มแถว 2
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] || [];
    const ln = String(r[0] ?? '').trim();
    const diseaseCode = String(r[2] ?? '').trim();
    const caseId = String(r[3] ?? '').trim();
    if (!ln && !diseaseCode && !caseId) continue;
    if (!diseaseCode && !caseId) continue;
    out.push({
      ln,
      type: String(r[1] ?? '').trim(),
      diseaseCode,
      caseId,
      pid: String(r[4] ?? '').trim(),
      firstDate: toDate(r[5]),
      serviceCount: toInt(r[6]),
      serviceFrom: toDate(r[7]),
      serviceTo: toDate(r[8]),
      dxCount: toInt(r[9]),
      dxLast: toDate(r[10]),
      drugCount: toInt(r[11]),
      drugLast: toDate(r[12]),
      confirmed: String(r[13] ?? '').trim(),
      confirmPeriod: String(r[14] ?? '').trim(),
    });
  }
  return out;
}

function parseAcdDetailSheet(rows: Record<string, unknown>[]): ParsedAcdDetailRow[] {
  const out: ParsedAcdDetailRow[] = [];
  for (const r of rows) {
    const keys = Object.keys(r);
    const lower = (name: string) => {
      const found = keys.find((k) => k.trim().toLowerCase() === name);
      return found ? r[found] : undefined;
    };
    const diseaseCode = String(lower('cd') ?? '').trim();
    const caseId = String(lower('casesid') ?? lower('caseid') ?? '').trim();
    const pid = String(lower('pid') ?? '').trim();
    if (!diseaseCode && !caseId && !pid) continue;
    out.push({
      no: String(lower('no') ?? '').trim(),
      hcode: String(lower('hcode') ?? '').trim(),
      hproc: String(lower('hproc') ?? '').trim(),
      dttran: toDate(lower('dttran')),
      hn: String(lower('hn') ?? '').trim(),
      pid,
      rid: String(lower('rid') ?? '').trim(),
      invno: String(lower('invno') ?? '').trim(),
      diseaseCode,
      caseId,
    });
  }
  return out;
}

export function parseChronicWorkbook(
  fileName: string,
  buffer: ArrayBuffer | Buffer
): ParsedChronicFile {
  const fileType = detectFileType(fileName);
  if (!fileType) {
    throw new Error('ไม่รู้จักชนิดไฟล์ — รองรับ ACDCONF / acddetail (SSOPACD)');
  }

  const period = detectPeriod(fileName);
  const hcodeFromName = detectHcode(fileName);
  const baseName = fileName.split(/[/\\]/).pop() || fileName;

  if (fileType === 'ACDSUM') {
    return {
      fileName: baseName,
      fileType,
      hcode: hcodeFromName,
      period,
      batchKey: `${hcodeFromName || 'NA'}_${period || 'NA'}_ACDSUM`,
      rowCount: 0,
      dateFrom: null,
      dateTo: null,
      confRows: [],
      detailRows: [],
      skipped: true,
      skipReason: 'ไฟล์สรุป PDF/SUM — ไม่บันทึกรายบรรทัด',
    };
  }

  if (!period) {
    throw new Error('อ่านงวดจากชื่อไฟล์ไม่ได้ เช่น 10702_ACDCONF_202609.xlsx');
  }

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('ไม่พบชีตในไฟล์');

  if (fileType === 'ACDCONF') {
    const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown[][];
    const confRows = parseAcdConfSheet(matrix);
    const hcode = hcodeFromName || '00000';
    const { dateFrom, dateTo } = trackDates(confRows.map((r) => r.firstDate));
    return {
      fileName: baseName,
      fileType,
      hcode,
      period,
      batchKey: `${hcode}_${period}_ACDCONF`,
      rowCount: confRows.length,
      dateFrom,
      dateTo,
      confRows,
      detailRows: [],
      skipped: false,
    };
  }

  const objects = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    defval: '',
    raw: false,
  }) as Record<string, unknown>[];
  const detailRows = parseAcdDetailSheet(objects);
  const hcode =
    hcodeFromName ||
    detailRows.find((r) => r.hcode)?.hcode ||
    '00000';
  const { dateFrom, dateTo } = trackDates(detailRows.map((r) => r.dttran));

  return {
    fileName: baseName,
    fileType,
    hcode,
    period,
    batchKey: `${hcode}_${period}_ACDDETAIL`,
    rowCount: detailRows.length,
    dateFrom,
    dateTo,
    confRows: [],
    detailRows,
    skipped: false,
  };
}
