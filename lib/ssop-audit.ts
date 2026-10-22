import { getDB } from '@/lib/database';
import { ensureIcd10Codebook, formatIcdList, icdDescription } from '@/lib/codebook';
import { facilityKind, inIcdRange, isShortFacility, isWideFacility, type FacilityKind } from '@/lib/facility-scope';
import { hospitalName, loadHospitalDirectory } from '@/lib/hospital-names';

export type SsopAuditMode = 'cases' | 'allocate' | 'reject' | 'vaccine' | 'pp';

export interface SsopAuditCase {
  id: string;
  statement: string;
  hcode: string;
  hname: string;
  kind: FacilityKind;
  patient: string;
  hn: string;
  visitAt: string;
  amount: number;
  primaryCode: string;
  primaryDesc: string;
  secondary: string;
  late: 'Y' | 'N';
  sameDay: number;
  sameMonth: number;
  authen: 'Y' | 'N';
  reasons: string;
}

export interface SsopAuditFacility {
  hcode: string;
  name: string;
  kind: FacilityKind;
  count: number;
  amount: number;
}

interface Bill {
  id: string;
  statement: string;
  hcode: string;
  patient: string;
  hn: string;
  pid: string;
  bp: string;
  invno: string;
  visitAt: Date | null;
  issueAt: Date | null;
  amount: number;
}

interface Classified extends Bill {
  hname: string;
  kind: FacilityKind;
  primaryCode: string;
  secondaryCodes: string[];
  signature: string;
  authen: 'Y' | 'N';
  late: 'Y' | 'N';
  sameDay: number;
  sameMonth: number;
  reasons: string[];
}

const cache = new Map<number, { at: number; rows: Classified[] }>();

function ymd(value: Date | null): string {
  if (!value) return '';
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function monthKey(value: Date | null): string {
  return ymd(value).slice(0, 7);
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function rejectionReasons(row: {
  bp: string;
  codes: string[];
  late: 'Y' | 'N';
  authen: 'Y' | 'N';
  sameDay: number;
  sameMonth: number;
}): string[] {
  const reasons: string[] = [];
  const codes = row.codes.map((code) => code.toUpperCase()).filter(Boolean);
  const primary = codes[0] || '';
  if (row.late === 'Y') reasons.push('อายุเกิน 366 วัน');
  if (primary && row.sameDay > 1) reasons.push('ซ้ำโรคเดิมในวัน');
  const exempt = primary.startsWith('Z48') || primary.startsWith('Z501') || primary.startsWith('Z242');
  if (primary && !exempt && row.sameMonth > 4) reasons.push('ซ้ำเกิน 4 ครั้งในเดือน');
  if (row.bp.toUpperCase() === 'N') reasons.push('bp = N');
  const any = (match: (code: string) => boolean) => codes.some(match);
  if (any((code) => inIcdRange(code, 'Z300', 'Z392'))) reasons.push('Z300-Z392 วางแผนครอบครัว');
  if (any((code) => inIcdRange(code, 'Z540', 'Z549'))) reasons.push('Z540-Z549 การฟักฟื้น');
  if (any((code) => inIcdRange(code, 'K000', 'K039'))) reasons.push('K000-K039 ทันตกรรม');
  if (any((code) => inIcdRange(code, 'Z000', 'Z009'))) reasons.push('Z000-Z009 ตรวจสุขภาพ');
  if (any((code) => inIcdRange(code, 'Z020', 'Z029'))) reasons.push('Z020-Z029 ใบรับรองแพทย์');
  if (any((code) => inIcdRange(code, 'Z100', 'Z109'))) reasons.push('Z100-Z109 ตรวจสุขภาพโรงงาน');
  if (any((code) => inIcdRange(code, 'Z110', 'Z119'))) reasons.push('Z110-Z119 คัดกรองติดเชื้อ');
  if (any((code) => inIcdRange(code, 'Z120', 'Z129'))) reasons.push('Z120-Z129 คัดกรองเนื้องอก');
  if (any((code) => inIcdRange(code, 'Z130', 'Z139'))) reasons.push('Z130-Z139 คัดกรองเบาหวาน');
  if (any((code) => code.startsWith('Z251'))) reasons.push('Z251 วัคซีนไข้หวัดใหญ่');
  if (any((code) => code.startsWith('U119'))) reasons.push('U119 วัคซีนโควิด');
  if (row.authen === 'N') reasons.push('ไม่ Authen');
  return reasons;
}

function isVaccine(code: string) {
  const value = code.toUpperCase();
  return value.startsWith('Z23') || value.startsWith('Z24') || value.startsWith('Z25') || value.startsWith('U11');
}

function isPp(code: string) {
  return inIcdRange(code, 'Z000', 'Z009') || inIcdRange(code, 'Z020', 'Z029') || inIcdRange(code, 'Z100', 'Z109');
}

async function loadYear(year: number): Promise<Classified[]> {
  const hit = cache.get(year);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.rows;

  await ensureIcd10Codebook();
  const db = await getDB();
  try {
    const [billRows]: any[] = await db.query(
      `
      SELECT id, STMdoc, hproc, hcare, hn, pid, name, bp, invno, dttran, dateIssue, total, 'MM' AS src
      FROM sognstmm WHERE YEAR(dttran) = ?
      UNION ALL
      SELECT id, STMdoc, hproc, hcare, hn, pid, name, bp, invno, dttran, dateIssue, total, 'MP' AS src
      FROM sognstmp WHERE YEAR(dttran) = ?
      `,
      [year, year]
    );

    const [diagRows]: any[] = await db.query(
      `
      SELECT ref1, hn, cid, visit_at, icd_code, is_primary, seq
      FROM icd10_diag
      WHERE file_type = 'OPD'
      `
    );

    const [authRows]: any[] = await db.query(
      `
      SELECT citizen_id, hn, vstdate
      FROM authen_code
      WHERE vstdate IS NOT NULL AND YEAR(vstdate) = ?
      `,
      [year]
    );

    const names = await loadHospitalDirectory(db);
    const byRef = new Map<string, Array<{ code: string; primary: boolean; seq: number }>>();
    const byPerson = new Map<string, Array<{ code: string; primary: boolean; seq: number }>>();
    for (const row of diagRows || []) {
      const item = {
        code: String(row.icd_code || '').trim().toUpperCase(),
        primary: Number(row.is_primary) === 1 || Number(row.seq) === 1,
        seq: Number(row.seq || 0),
      };
      if (!item.code) continue;
      const ref = String(row.ref1 || '').trim();
      if (ref) {
        const list = byRef.get(ref) || [];
        list.push(item);
        byRef.set(ref, list);
      }
      const day = ymd(asDate(row.visit_at));
      const person = String(row.hn || row.cid || '').trim();
      if (person && day) {
        const key = `${person}|${day}`;
        const list = byPerson.get(key) || [];
        list.push(item);
        byPerson.set(key, list);
      }
    }

    const authen = new Set<string>();
    for (const row of authRows || []) {
      const pid = String(row.citizen_id || '').trim();
      const authHn = String(row.hn || '').trim();
      const day = ymd(asDate(row.vstdate));
      if (pid && day) authen.add(`${pid}|${day}`);
      if (authHn && day) authen.add(`hn:${authHn}|${day}`);
    }

    const bills: Classified[] = (billRows || []).map((row: any) => {
      const visitAt = asDate(row.dttran);
      const day = ymd(visitAt);
      const hcode = String(row.hproc || row.hcare || '').trim();
      const invno = String(row.invno || '').trim();
      const hn = String(row.hn || '').trim();
      const pid = String(row.pid || '').trim();
      const diags = (byRef.get(invno) || byPerson.get(`${hn}|${day}`) || byPerson.get(`${pid}|${day}`) || [])
        .slice()
        .sort((a, b) => a.seq - b.seq);
      const primary = diags.find((item) => item.primary) || diags[0];
      const secondary = diags.filter((item) => item !== primary).map((item) => item.code);
      const primaryCode = primary?.code || '';
      const signature = primaryCode ? [primaryCode, ...secondary.slice().sort()].join('+') : '';
      const issueAt = asDate(row.dateIssue);
      const late: 'Y' | 'N' =
        visitAt && issueAt && (issueAt.getTime() - visitAt.getTime()) / 86400000 > 366 ? 'Y' : 'N';
      return {
        id: `${row.src}-${row.id}`,
        statement: String(row.STMdoc || ''),
        hcode,
        hname: hospitalName(names, hcode, hcode),
        kind: facilityKind(hospitalName(names, hcode, hcode)),
        patient: String(row.name || ''),
        hn,
        pid,
        bp: String(row.bp || ''),
        invno,
        visitAt,
        issueAt,
        amount: Number(row.total || 0),
        primaryCode,
        secondaryCodes: secondary,
        signature,
        authen: (pid && day && authen.has(`${pid}|${day}`)) || (hn && day && authen.has(`hn:${hn}|${day}`)) ? 'Y' : 'N',
        late,
        sameDay: 1,
        sameMonth: 1,
        reasons: [],
      };
    });

    const dayCount = new Map<string, number>();
    const monthCount = new Map<string, number>();
    for (const row of bills) {
      if (!row.signature || !row.pid) continue;
      const day = `${row.pid}|${ymd(row.visitAt)}|${row.signature}`;
      const month = `${row.pid}|${monthKey(row.visitAt)}|${row.signature}`;
      dayCount.set(day, (dayCount.get(day) || 0) + 1);
      monthCount.set(month, (monthCount.get(month) || 0) + 1);
    }
    for (const row of bills) {
      if (row.signature && row.pid) {
        row.sameDay = dayCount.get(`${row.pid}|${ymd(row.visitAt)}|${row.signature}`) || 1;
        row.sameMonth = monthCount.get(`${row.pid}|${monthKey(row.visitAt)}|${row.signature}`) || 1;
      }
      row.reasons = rejectionReasons({
        bp: row.bp,
        codes: [row.primaryCode, ...row.secondaryCodes],
        late: row.late,
        authen: row.authen,
        sameDay: row.sameDay,
        sameMonth: row.sameMonth,
      });
    }

    cache.set(year, { at: Date.now(), rows: bills });
    return bills;
  } finally {
    await db.end();
  }
}

function toCase(row: Classified): SsopAuditCase {
  return {
    id: row.id,
    statement: row.statement,
    hcode: row.hcode,
    hname: row.hname,
    kind: row.kind,
    patient: row.patient,
    hn: row.hn,
    visitAt: ymd(row.visitAt),
    amount: row.amount,
    primaryCode: row.primaryCode,
    primaryDesc: icdDescription(row.primaryCode),
    secondary: formatIcdList(row.secondaryCodes),
    late: row.late,
    sameDay: row.sameDay,
    sameMonth: row.sameMonth,
    authen: row.authen,
    reasons: row.reasons.join(', '),
  };
}

function aggregate(rows: Classified[]): SsopAuditFacility[] {
  const map = new Map<string, SsopAuditFacility>();
  for (const row of rows) {
    const current = map.get(row.hcode) || {
      hcode: row.hcode,
      name: row.hname,
      kind: row.kind,
      count: 0,
      amount: 0,
    };
    current.count += 1;
    current.amount += row.amount;
    map.set(row.hcode, current);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount || b.count - a.count);
}

export async function fetchSsopAudit(options: {
  year: number;
  mode: SsopAuditMode;
  hcode?: string;
  page?: number;
}) {
  const rows = await loadYear(options.year);
  let filtered = rows.filter((row) => (options.mode === 'cases' ? true : isWideFacility(row.hcode)));
  if (options.mode === 'allocate') filtered = filtered.filter((row) => row.reasons.length === 0);
  if (options.mode === 'reject') filtered = filtered.filter((row) => row.reasons.length > 0);
  if (options.mode === 'vaccine') {
    filtered = rows.filter(
      (row) => isShortFacility(row.hcode) && [row.primaryCode, ...row.secondaryCodes].some(isVaccine)
    );
  }
  if (options.mode === 'pp') {
    filtered = rows.filter(
      (row) => isShortFacility(row.hcode) && [row.primaryCode, ...row.secondaryCodes].some(isPp)
    );
  }

  const facilities = aggregate(filtered);
  const cases = options.hcode ? filtered.filter((row) => row.hcode === options.hcode) : filtered;
  const page = Math.max(1, options.page || 1);
  const pageSize = 80;
  const start = (page - 1) * pageSize;

  return {
    year: options.year,
    mode: options.mode,
    total: filtered.length,
    amount: filtered.reduce((sum, row) => sum + row.amount, 0),
    page,
    pageSize,
    hospitals: facilities.filter((row) => row.kind === 'hospital'),
    pcus: facilities.filter((row) => row.kind === 'pcu'),
    cases: cases.slice(start, start + pageSize).map(toCase),
    caseTotal: cases.length,
  };
}
