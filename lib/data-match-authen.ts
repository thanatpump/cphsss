import { getDB } from '@/lib/database';
import { BillRecord } from '@/lib/sogn-xml-parser';

export const AUTHEN_PREFIX_LENGTH = 5;

export interface AuthenRecord {
  authen: string;
  authenHcare: string;
  authenInvNo: string;
  citizen_id: string;
  hcode: string;
  date: string;
  time: string;
  vn: string | null;
  hn: string | null;
}

export function normalizeHcare(hcare: string): string {
  return hcare.trim().padStart(AUTHEN_PREFIX_LENGTH, '0').slice(0, AUTHEN_PREFIX_LENGTH);
}

export function authenInvNo(authen: string): string {
  return authen.length > AUTHEN_PREFIX_LENGTH
    ? authen.slice(AUTHEN_PREFIX_LENGTH)
    : authen;
}

export function authenHcare(authen: string): string {
  return authen.length > AUTHEN_PREFIX_LENGTH
    ? normalizeHcare(authen.slice(0, AUTHEN_PREFIX_LENGTH))
    : normalizeHcare(authen);
}

export function buildMatchKey(hcare: string, invno: string): string {
  return `${normalizeHcare(hcare)}|${invno.trim()}`;
}

function toAuthenRecord(row: Record<string, unknown>): AuthenRecord {
  const authen = String(row.authen ?? '');
  return {
    authen,
    authenHcare: authenHcare(authen),
    authenInvNo: authenInvNo(authen),
    citizen_id: String(row.citizen_id ?? ''),
    hcode: String(row.hcode ?? ''),
    date: String(row.date ?? ''),
    time: String(row.time ?? ''),
    vn: row.vn != null ? String(row.vn) : null,
    hn: row.hn != null ? String(row.hn) : null,
  };
}

export interface MatchTableRow {
  invno: string;
  hcare: string;
  hmain: string;
  station: string;
  hn: string;
  pid: string;
  name: string;
  dttran: string;
  payplan: string;
  bp: string;
  bf: string;
  care: string;
  rid: string;
  copay: string;
  total: number;
  status: 'matched' | 'not_found' | 'no_invno';
  authen: AuthenRecord | null;
}

export interface HcareGroup {
  hcare: string;
  hosname: string;
  hmain: string;
  rowCount: number;
  matchedCount: number;
  notFoundCount: number;
  totalAmount: number;
  rows: MatchTableRow[];
}

export interface AuthenMatchResult {
  referenceFile: string;
  compareFile: string;
  summary: {
    xmlCount: number;
    authenMatchedCount: number;
    onlyInXmlCount: number;
    uniqueInvNoCount: number;
    duplicateInvNoCount: number;
    xmlTotal: number;
    hcareCount: number;
  };
  byHcare: HcareGroup[];
  matched: Array<{
    invno: string;
    xml: BillRecord;
    authen: AuthenRecord;
  }>;
  onlyInXml: BillRecord[];
  duplicateInvNos: string[];
}

function billToTableRow(bill: BillRecord, authen: AuthenRecord | null): MatchTableRow {
  const invno = bill.invno.trim();
  let status: MatchTableRow['status'] = 'no_invno';
  if (invno) {
    status = authen ? 'matched' : 'not_found';
  }

  return {
    invno,
    hcare: bill.hcare || bill.hproc || '-',
    hmain: bill.hmain || bill.hcode || '-',
    station: bill.station || '-',
    hn: bill.hn,
    pid: bill.pid,
    name: bill.name,
    dttran: bill.dttran,
    payplan: bill.payplan,
    bp: bill.bp,
    bf: bill.bf,
    care: bill.care,
    rid: bill.rid,
    copay: bill.copay,
    total: bill.total,
    status,
    authen,
  };
}

function buildHcareGroups(rows: MatchTableRow[]): HcareGroup[] {
  const groupMap = new Map<string, MatchTableRow[]>();

  for (const row of rows) {
    const key = row.hcare || '-';
    const list = groupMap.get(key) ?? [];
    list.push(row);
    groupMap.set(key, list);
  }

  return [...groupMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'th'))
    .map(([hcare, groupRows]) => ({
      hcare,
      hosname: '',
      hmain: groupRows[0]?.hmain || '-',
      rowCount: groupRows.length,
      matchedCount: groupRows.filter((row) => row.status === 'matched').length,
      notFoundCount: groupRows.filter((row) => row.status !== 'matched').length,
      totalAmount: groupRows.reduce((sum, row) => sum + row.total, 0),
      rows: groupRows,
    }));
}

export function parseMonthValue(month: string | null | undefined): { year: string; mm: string; yyyymm: string } | null {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, mm] = month.split('-');
  return { year, mm, yyyymm: `${year}${mm}` };
}

function appendMonthFilter(
  query: string,
  params: string[],
  month: string | null | undefined
): string {
  const parsed = parseMonthValue(month);
  if (!parsed) return query;

  params.push(parsed.yyyymm, parsed.mm, parsed.year);
  return `${query} AND (
    LEFT(date, 6) = ?
    OR (SUBSTRING(date, 3, 2) = ? AND RIGHT(date, 4) = ?)
  )`;
}

export function filterBillsByMonth(bills: BillRecord[], month: string | null | undefined): BillRecord[] {
  const parsed = parseMonthValue(month);
  if (!parsed) return bills;

  const year = Number(parsed.year);
  const monthIndex = Number(parsed.mm) - 1;

  return bills.filter((bill) => {
    if (!bill.dttran) return false;
    const date = new Date(bill.dttran);
    if (Number.isNaN(date.getTime())) return false;
    return date.getFullYear() === year && date.getMonth() === monthIndex;
  });
}

export async function enrichHcareWithNames(groups: HcareGroup[]): Promise<HcareGroup[]> {
  const codes = [
    ...new Set(
      groups
        .map((group) => normalizeHcare(group.hcare))
        .filter((code) => code && code !== '-')
    ),
  ];

  if (codes.length === 0) return groups;

  const db = await getDB();
  const placeholders = codes.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT user_sks, hosname FROM login_sks WHERE user_sks IN (${placeholders})`,
    codes
  );

  const nameMap = new Map<string, string>();
  for (const row of rows as Array<{ user_sks: string; hosname: string }>) {
    nameMap.set(normalizeHcare(row.user_sks), String(row.hosname ?? '').trim());
  }

  return groups.map((group) => ({
    ...group,
    hosname: nameMap.get(normalizeHcare(group.hcare)) || '',
  }));
}

export async function fetchAuthenByInvNos(
  invNos: string[],
  hcode?: string | null,
  month?: string | null
): Promise<AuthenRecord[]> {
  const unique = [...new Set(invNos.map((v) => v.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const db = await getDB();
  const results: AuthenRecord[] = [];
  const batchSize = 500;

  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const placeholders = batch.map(() => '?').join(',');
    let query = `
      SELECT authen, citizen_id, hcode, date, time, vn, hn
      FROM authen_code
      WHERE SUBSTRING(authen, ${AUTHEN_PREFIX_LENGTH + 1}) IN (${placeholders})
    `;
    const params: string[] = [...batch];

    if (hcode) {
      query += ' AND hcode = ?';
      params.push(hcode);
    }

    query = appendMonthFilter(query, params, month);

    const [rows] = await db.query(query, params);
    for (const row of rows as Array<Record<string, unknown>>) {
      results.push(toAuthenRecord(row));
    }
  }

  return results;
}

export async function countAuthenInDb(
  hcode?: string | null,
  month?: string | null
): Promise<number> {
  const db = await getDB();
  const params: string[] = [];
  let query = 'SELECT COUNT(*) as cnt FROM authen_code WHERE 1=1';

  if (hcode) {
    query += ' AND hcode = ?';
    params.push(hcode);
  }

  query = appendMonthFilter(query, params, month);

  const [rows] = await db.query(query, params);
  return Number((rows as Array<{ cnt: number }>)[0]?.cnt ?? 0);
}

export function matchInvNoWithAuthen(
  xmlBills: BillRecord[],
  authenRows: AuthenRecord[],
  compareFileName: string
): AuthenMatchResult {
  const authenMap = new Map<string, AuthenRecord>();
  for (const row of authenRows) {
    const key = buildMatchKey(row.authenHcare, row.authenInvNo);
    if (!authenMap.has(key)) {
      authenMap.set(key, row);
    }
  }
  const invNoCount = new Map<string, number>();

  for (const bill of xmlBills) {
    const invno = bill.invno.trim();
    if (!invno) continue;
    invNoCount.set(invno, (invNoCount.get(invno) ?? 0) + 1);
  }

  const duplicateInvNos = [...invNoCount.entries()]
    .filter(([, count]) => count > 1)
    .map(([invno]) => invno);

  const matched: AuthenMatchResult['matched'] = [];
  const onlyInXml: BillRecord[] = [];
  const matchedInvNos = new Set<string>();
  const tableRows: MatchTableRow[] = [];

  for (const bill of xmlBills) {
    const invno = bill.invno.trim();
    const billHcare = bill.hcare || bill.hproc || '';
    const authen = invno
      ? authenMap.get(buildMatchKey(billHcare, invno)) ?? null
      : null;
    tableRows.push(billToTableRow(bill, authen));

    if (!invno) {
      onlyInXml.push(bill);
      continue;
    }

    if (authen) {
      matched.push({ invno, xml: bill, authen });
      matchedInvNos.add(buildMatchKey(billHcare, invno));
    } else {
      onlyInXml.push(bill);
    }
  }

  const byHcare = buildHcareGroups(tableRows);
  const xmlTotal = xmlBills.reduce((sum, bill) => sum + bill.total, 0);

  return {
    referenceFile: 'ฐานข้อมูล (authen_code)',
    compareFile: compareFileName,
    summary: {
      xmlCount: xmlBills.length,
      authenMatchedCount: matchedInvNos.size,
      onlyInXmlCount: onlyInXml.length,
      uniqueInvNoCount: invNoCount.size,
      duplicateInvNoCount: duplicateInvNos.length,
      xmlTotal,
      hcareCount: byHcare.length,
    },
    byHcare,
    matched,
    onlyInXml,
    duplicateInvNos,
  };
}
