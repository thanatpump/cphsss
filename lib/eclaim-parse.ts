import * as XLSX from 'xlsx';
import type { EclaimFileType } from '@/lib/eclaim-types';

export interface ParsedEclaimStmRow {
  seq: string;
  rep: string;
  hmain: string;
  hcode: string;
  hsend: string;
  htype: string;
  hn: string;
  an: string;
  pid: string;
  patientName: string;
  dateAdm: string | null;
  dateDsc: string | null;
  projcode: string;
  drg: string;
  rw: number;
  adjrw: number;
  selfPay: number;
  ratePay: number;
  claimAmt: number;
  actAmt: number;
  receiveTotal: number;
  seqNo: string;
}

export interface ParsedEclaimPayRow {
  hmainCode: string;
  hmainName: string;
  htreatCode: string;
  htreatName: string;
  hrecordCode: string;
  hrecordName: string;
  payFrom: string;
  amount: number;
  remark: string;
}

export interface ParsedEclaimSummaryRow {
  periodRep: string;
  hmain: string;
  hcode: string;
  hsend: string;
  repNo: string;
  totalCases: number;
  passCases: number;
  failCases: number;
  claimAmt: number;
  actAmt: number;
  receiveTotal: number;
}

export interface ParsedEclaimFile {
  fileName: string;
  fileType: EclaimFileType;
  hcode: string;
  period: string;
  docNo: string;
  batchKey: string;
  skipped: boolean;
  skipReason?: string;
  stmRows: ParsedEclaimStmRow[];
  payRows: ParsedEclaimPayRow[];
  summaryRows: ParsedEclaimSummaryRow[];
  rowCount: number;
  amount: number;
}

function detectFileType(fileName: string): EclaimFileType {
  const base = (fileName.split(/[/\\]/).pop() || fileName).toUpperCase();
  if (/\.(JPG|JPEG|PNG|GIF|PDF)$/i.test(fileName)) return 'IMG';
  if (base.startsWith('STM_') || base.includes('_STM_') || /^STM_/i.test(base)) return 'STM';
  if (base.includes('พึงรับ') || base.includes('PAY') || base.includes('SSS')) {
    if (base.startsWith('STM')) return 'STM';
    if (/\.XLS/i.test(fileName) && !base.startsWith('STM')) return 'PAY';
  }
  if (/รายงาน/.test(fileName) || /พึงรับ/.test(fileName)) return 'PAY';
  if (/\.XLS/i.test(fileName) && /SSS\d{6}/i.test(base)) {
    return base.startsWith('STM') ? 'STM' : 'PAY';
  }
  return 'UNKNOWN';
}

function detectMeta(fileName: string) {
  const text = fileName.split(/[/\\]/).pop() || fileName;
  const sss = text.match(/(\d{5})_SSS(\d{6})_(\d+)/i);
  if (sss) {
    return {
      hcode: sss[1],
      period: sss[2],
      docNo: `${sss[1]}_SSS${sss[2]}_${sss[3]}`,
    };
  }
  const periodMatch = text.match(/(20\d{2})(0[1-9]|1[0-2])/);
  const hcode = text.match(/(\d{5})/)?.[1] || '';
  const period = periodMatch ? `${periodMatch[1]}${periodMatch[2]}` : '';
  return {
    hcode,
    period,
    docNo: hcode && period ? `${hcode}_SSS${period}_01` : '',
  };
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const text = String(value ?? '')
    .replace(/,/g, '')
    .trim();
  if (!text) return 0;
  const n = parseFloat(text);
  return Number.isFinite(n) ? n : 0;
}

function parseThaiDateTime(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  // 16/10/2025 15:00 or 16/10/2569
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  let year = Number(m[3]);
  if (year > 2400) year -= 543;
  if (year < 1990 || year > 2100) return null;
  const mm = m[2].padStart(2, '0');
  const dd = m[1].padStart(2, '0');
  const hh = (m[4] || '00').padStart(2, '0');
  const mi = (m[5] || '00').padStart(2, '0');
  return `${year}-${mm}-${dd} ${hh}:${mi}:00`;
}

function splitCodeName(value: string) {
  const text = String(value || '').trim();
  const m = text.match(/^(\d{5})\s*:\s*(.+)$/);
  if (m) return { code: m[1], name: m[2].trim() };
  return { code: '', name: text };
}

function findHeaderRow(rows: unknown[][], keywords: string[]) {
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const joined = rows[i].map((c) => String(c || '').trim()).join('|');
    if (keywords.every((k) => joined.includes(k))) return i;
  }
  return -1;
}

function extractDocMeta(rows: unknown[][]) {
  for (const row of rows.slice(0, 12)) {
    const text = row.map((c) => String(c || '')).join(' ');
    const doc = text.match(/เลขที่เอกสาร\s*([A-Za-z0-9_]+)/);
    const hosp = text.match(/โรงพยาบาล\s*(\d{5})/);
    if (doc || hosp) {
      return {
        docNo: doc?.[1] || '',
        hcode: hosp?.[1] || '',
      };
    }
  }
  return { docNo: '', hcode: '' };
}

function parseStmWorkbook(fileName: string, wb: XLSX.WorkBook): ParsedEclaimFile {
  const metaFromName = detectMeta(fileName);
  const sheetName =
    wb.SheetNames.find((n) => /statement/i.test(n)) ||
    wb.SheetNames.find((n) => /stm|รายการ/i.test(n)) ||
    wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];
  const sheetMeta = extractDocMeta(rows);
  const hcode = metaFromName.hcode || sheetMeta.hcode;
  const docNo = metaFromName.docNo || sheetMeta.docNo || `${hcode}_SSS${metaFromName.period}_01`;
  const period = metaFromName.period;
  const batchKey = `${docNo}_STM`;

  const headerIdx = findHeaderRow(rows, ['REP', 'HCODE', 'HN']);
  if (headerIdx < 0) throw new Error('ไม่พบหัวตารางรายการ STM (REP/HCODE/HN)');

  const stmRows: ParsedEclaimStmRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const seq = String(r[0] ?? '').trim();
    const rep = String(r[1] ?? '').trim();
    const pid = String(r[8] ?? '').trim();
    if (!/^\d+$/.test(seq) && !rep) continue;
    if (!rep && !pid) continue;
    // ข้ามแถวหัวข้อย่อย
    if (!rep || !/^\d+$/.test(rep.replace(/\D/g, '')) && rep.length < 3) {
      if (!/^\d+$/.test(seq)) continue;
    }
    if (!rep) continue;

    stmRows.push({
      seq,
      rep,
      hmain: String(r[2] ?? '').trim(),
      hcode: String(r[3] ?? '').trim(),
      hsend: String(r[4] ?? '').trim(),
      htype: String(r[5] ?? '').trim(),
      hn: String(r[6] ?? '').trim(),
      an: String(r[7] ?? '').trim(),
      pid,
      patientName: String(r[9] ?? '').trim(),
      dateAdm: parseThaiDateTime(r[10]),
      dateDsc: parseThaiDateTime(r[11]),
      projcode: String(r[12] ?? '').trim(),
      drg: String(r[13] ?? '').trim(),
      rw: parseMoney(r[14]),
      adjrw: parseMoney(r[15]),
      selfPay: parseMoney(r[16]),
      ratePay: parseMoney(r[17]),
      claimAmt: parseMoney(r[18]),
      actAmt: parseMoney(r[19]),
      receiveTotal: parseMoney(r[46] ?? r[20]),
      seqNo: String(r[47] ?? '').trim(),
    });
  }

  // summary sheet (optional)
  const summaryRows: ParsedEclaimSummaryRow[] = [];
  const summarySheet = wb.SheetNames.find((n) => /summary/i.test(n));
  if (summarySheet) {
    const srows = XLSX.utils.sheet_to_json(wb.Sheets[summarySheet], {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown[][];
    for (const r of srows) {
      const periodRep = String(r[0] ?? '').trim();
      const hmain = String(r[1] ?? '').trim();
      const hcodeRow = String(r[2] ?? '').trim();
      if (!/^\d{6,}$/.test(periodRep) || !/^\d{5}$/.test(hmain)) continue;
      summaryRows.push({
        periodRep,
        hmain,
        hcode: hcodeRow,
        hsend: String(r[3] ?? '').trim(),
        repNo: String(r[4] ?? '').trim() || periodRep,
        totalCases: Math.trunc(parseMoney(r[5])),
        passCases: Math.trunc(parseMoney(r[6])),
        failCases: Math.trunc(parseMoney(r[7])),
        claimAmt: parseMoney(r[8]),
        actAmt: parseMoney(r[9]),
        receiveTotal: parseMoney(r[16]),
      });
    }
  }

  const amount = stmRows.reduce((sum, row) => sum + row.receiveTotal, 0);
  return {
    fileName: fileName.split(/[/\\]/).pop() || fileName,
    fileType: 'STM',
    hcode,
    period,
    docNo,
    batchKey,
    skipped: false,
    stmRows,
    payRows: [],
    summaryRows,
    rowCount: stmRows.length,
    amount,
  };
}

function parsePayWorkbook(fileName: string, wb: XLSX.WorkBook): ParsedEclaimFile {
  const metaFromName = detectMeta(fileName);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];
  const sheetMeta = extractDocMeta(rows);
  const hcode = metaFromName.hcode || sheetMeta.hcode;
  const docNo = metaFromName.docNo || sheetMeta.docNo || `${hcode}_SSS${metaFromName.period}_01`;
  const period = metaFromName.period;
  const batchKey = `${docNo}_PAY`;

  const headerIdx = findHeaderRow(rows, ['สถานพยาบาลหลัก', 'จำน']);
  if (headerIdx < 0) {
    // fallback: แถวที่มีคำว่า สถานพยาบาล
    const alt = findHeaderRow(rows, ['สถานพยาบาลหลัก']);
    if (alt < 0) throw new Error('ไม่พบหัวตารางรายงานพึงรับ-พึงจ่าย');
  }
  const start = headerIdx >= 0 ? headerIdx + 1 : 9;

  const payRows: ParsedEclaimPayRow[] = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i] || [];
    const main = String(r[0] ?? '').trim();
    const treat = String(r[1] ?? '').trim();
    if (!main || !main.includes(':')) continue;
    if (main.includes('รวม') || main.includes('สรุป')) continue;
    const hmain = splitCodeName(main);
    const htreat = splitCodeName(treat);
    const hrecord = splitCodeName(String(r[2] ?? ''));
    payRows.push({
      hmainCode: hmain.code,
      hmainName: hmain.name,
      htreatCode: htreat.code,
      htreatName: htreat.name,
      hrecordCode: hrecord.code,
      hrecordName: hrecord.name,
      payFrom: String(r[3] ?? '').trim(),
      amount: parseMoney(r[4]),
      remark: String(r[5] ?? '').trim(),
    });
  }

  const amount = payRows.reduce((sum, row) => sum + row.amount, 0);
  return {
    fileName: fileName.split(/[/\\]/).pop() || fileName,
    fileType: 'PAY',
    hcode,
    period,
    docNo,
    batchKey,
    skipped: false,
    stmRows: [],
    payRows,
    summaryRows: [],
    rowCount: payRows.length,
    amount,
  };
}

export function parseEclaimWorkbook(fileName: string, buffer: ArrayBuffer | Buffer): ParsedEclaimFile {
  const fileType = detectFileType(fileName);
  const baseName = fileName.split(/[/\\]/).pop() || fileName;
  const meta = detectMeta(fileName);

  if (fileType === 'IMG') {
    return {
      fileName: baseName,
      fileType,
      hcode: meta.hcode,
      period: meta.period,
      docNo: meta.docNo,
      batchKey: `${meta.docNo || 'NA'}_IMG`,
      skipped: true,
      skipReason: 'ไฟล์รูปภาพ — ไม่บันทึกลงฐานข้อมูล',
      stmRows: [],
      payRows: [],
      summaryRows: [],
      rowCount: 0,
      amount: 0,
    };
  }

  if (fileType === 'UNKNOWN') {
    throw new Error('ไม่รู้จักชนิดไฟล์ — รองรับ STM_*.xls และรายงานพึงรับพึงจ่าย_*.xls');
  }

  if (!meta.period) {
    throw new Error('อ่านงวดจากชื่อไฟล์ไม่ได้ เช่น STM_10702_SSS202609_01.xls');
  }

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  if (fileType === 'STM') return parseStmWorkbook(fileName, wb);
  return parsePayWorkbook(fileName, wb);
}
