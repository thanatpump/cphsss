import { getDB } from '@/lib/database';
import { parseMonthValue } from '@/lib/data-match-authen';
import {
  BillRecord,
  FileType,
  ParsedFile,
  buildBillKey,
} from '@/lib/sogn-xml-parser';

export type DbTableType = 'sognstmm' | 'sognstmp' | 'signstmm' | 'signstms';

const FILE_TYPE_TO_TABLE: Partial<Record<FileType, DbTableType>> = {
  SOGNSTMM: 'sognstmm',
  SOGNSTMP: 'sognstmp',
  SIGNSTMM: 'signstmm',
  SIGNSTMS: 'signstms',
};

export interface StmDocOption {
  stmDoc: string;
  hproc: string;
  count: number;
}

export interface DbFetchResult {
  parsed: ParsedFile;
  matchedStmDoc: string;
  matchMode: 'exact' | 'fallback';
}

function getDocColumn(table: DbTableType): 'STMdoc' | 'stmno' {
  return table.startsWith('sogn') ? 'STMdoc' : 'stmno';
}

function rowToBill(row: Record<string, unknown>, table: DbTableType): BillRecord {
  const bill = {
    hn: String(row.hn ?? ''),
    an: String(row.an ?? ''),
    pid: String(row.pid ?? ''),
    name: String(row.name ?? ''),
    invno: String(row.invno ?? ''),
    rid: String(row.rid ?? ''),
    dateadm: String(row.dateadm ?? ''),
    datedsc: String(row.datedsc ?? ''),
    hcode: String(row.hcode ?? row.hmain ?? ''),
    hproc: String(row.hproc ?? ''),
    hmain: String(row.hmain ?? row.hcode ?? ''),
    hcare: String(row.hcare ?? row.hproc ?? ''),
    station: String(row.station ?? ''),
    dttran: String(row.dttran ?? ''),
    payplan: String(row.payplan ?? ''),
    bp: String(row.bp ?? ''),
    bf: String(row.bf ?? ''),
    care: String(row.care ?? ''),
    copay: String(row.copay ?? ''),
    total:
      table === 'sognstmm' || table === 'sognstmp'
        ? parseFloat(String(row.total ?? 0)) || 0
        : parseFloat(String(row.Reimb ?? row.due ?? 0)) || 0,
  };

  return {
    key: buildBillKey(bill),
    ...bill,
  };
}

function rowsToParsedFile(
  table: DbTableType,
  stmDoc: string,
  rows: Record<string, unknown>[]
): ParsedFile {
  const records = rows.map((row) => rowToBill(row, table));
  const billTotal = records.reduce((sum, bill) => sum + bill.total, 0);
  const firstRow = rows[0];

  return {
    fileName: `ฐานข้อมูล (${table})`,
    fileType: table === 'sognstmm'
      ? 'SOGNSTMM'
      : table === 'sognstmp'
        ? 'SOGNSTMP'
        : table === 'signstmm'
          ? 'SIGNSTMM'
          : 'SIGNSTMS',
    stmDoc,
    hcode: String(firstRow?.hmain ?? firstRow?.hcode ?? ''),
    hname: '',
    period: String(firstRow?.period ?? ''),
    headerCount: null,
    headerAmount: null,
    billCount: records.length,
    billTotal,
    bills: records,
  };
}

export function resolveDbTable(fileType: FileType, override?: string | null): DbTableType | null {
  if (override && ['sognstmm', 'sognstmp', 'signstmm', 'signstms'].includes(override)) {
    return override as DbTableType;
  }
  return FILE_TYPE_TO_TABLE[fileType] ?? null;
}

export function parseStmDocParts(stmDoc: string): { hproc: string; period: string } | null {
  const match = stmDoc.match(/^(\d{5})_.*_(\d{6})$/);
  if (!match) return null;
  return { hproc: match[1], period: match[2] };
}

async function queryRows(
  table: DbTableType,
  whereSql: string,
  params: Array<string | number>
): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  const [rows] = await db.query(
    `SELECT * FROM ${table} WHERE ${whereSql} ORDER BY id ASC`,
    params
  );
  return rows as Record<string, unknown>[];
}

export async function listAvailableStmDocs(
  table: DbTableType,
  options?: {
    hproc?: string | null;
    search?: string | null;
    limit?: number;
    orderBy?: 'stmDoc' | 'count';
    /** กรองตามรหัส รพ. หลักใน STMdoc เช่น 10702 → 10702_% */
    mainHospital?: string | null;
  }
): Promise<StmDocOption[]> {
  const db = await getDB();
  const docColumn = getDocColumn(table);
  const limit = options?.limit ?? 30;
  const orderBy = options?.orderBy === 'count' ? 'count DESC' : `${docColumn} DESC`;
  const params: Array<string | number> = [];
  const conditions: string[] = [];

  if (options?.mainHospital) {
    conditions.push(`${docColumn} LIKE ?`);
    params.push(`${options.mainHospital}_%`);
  } else if (options?.hproc) {
    conditions.push('hproc = ?');
    params.push(options.hproc);
  }
  if (options?.search) {
    conditions.push(`${docColumn} LIKE ?`);
    params.push(`%${options.search}%`);
  }

  let query = `SELECT ${docColumn} as stmDoc, MIN(hproc) as hproc, COUNT(*) as count FROM ${table}`;
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ` GROUP BY ${docColumn} ORDER BY ${orderBy} LIMIT ?`;
  params.push(limit);

  const [rows] = await db.query(query, params);
  return (rows as Array<{ stmDoc: string; hproc: string; count: number }>).map((row) => ({
    stmDoc: String(row.stmDoc ?? ''),
    hproc: String(row.hproc ?? ''),
    count: Number(row.count ?? 0),
  }));
}

export async function fetchReferenceFromDb(
  table: DbTableType,
  stmDoc: string,
  hproc?: string | null
): Promise<DbFetchResult | null> {
  const docColumn = getDocColumn(table);
  const stmParts = parseStmDocParts(stmDoc);
  const isMainHospitalScope = Boolean(hproc && stmParts && hproc === stmParts.hproc);

  const exactParams: string[] = [stmDoc];
  let exactWhere = `${docColumn} = ?`;
  if (hproc && !isMainHospitalScope) {
    exactWhere += ' AND hproc = ?';
    exactParams.push(hproc);
  }

  const exactRows = await queryRows(table, exactWhere, exactParams);
  if (exactRows.length > 0) {
    return {
      parsed: rowsToParsedFile(table, stmDoc, exactRows),
      matchedStmDoc: stmDoc,
      matchMode: 'exact',
    };
  }

  const parts = parseStmDocParts(stmDoc);
  if (parts) {
    const fallbackParams: string[] = [`%${parts.period}%`, parts.hproc];
    let fallbackWhere = `${docColumn} LIKE ? AND hproc = ?`;
    if (hproc && hproc !== parts.hproc) {
      fallbackWhere += ' AND hproc = ?';
      fallbackParams.push(hproc);
    }

    const fallbackRows = await queryRows(table, fallbackWhere, fallbackParams);
    if (fallbackRows.length > 0) {
      const matchedStmDoc = String(fallbackRows[0][docColumn] ?? stmDoc);
      return {
        parsed: rowsToParsedFile(table, matchedStmDoc, fallbackRows),
        matchedStmDoc,
        matchMode: 'fallback',
      };
    }
  }

  return null;
}

export async function countSognstmmByMonth(month: string): Promise<number> {
  const parsed = parseMonthValue(month);
  if (!parsed) return 0;

  const db = await getDB();
  const [rows] = await db.query(
    'SELECT COUNT(*) as cnt FROM sognstmm WHERE STMdoc LIKE ?',
    [`%_${parsed.yyyymm}`]
  );
  return Number((rows as Array<{ cnt: number }>)[0]?.cnt ?? 0);
}

export async function fetchSognstmmByMonth(month: string): Promise<DbFetchResult | null> {
  const parsed = parseMonthValue(month);
  if (!parsed) return null;

  const docColumn = getDocColumn('sognstmm');
  const rows = await queryRows('sognstmm', `${docColumn} LIKE ?`, [`%_${parsed.yyyymm}`]);
  if (rows.length === 0) return null;

  const uniqueStmDocs = [
    ...new Set(rows.map((row) => String(row[docColumn] ?? '')).filter(Boolean)),
  ];
  const matchedStmDoc =
    uniqueStmDocs.length === 1
      ? uniqueStmDocs[0]
      : `รอบ ${parsed.yyyymm} (${uniqueStmDocs.length} รอบ)`;

  return {
    parsed: rowsToParsedFile('sognstmm', matchedStmDoc, rows),
    matchedStmDoc,
    matchMode: 'exact',
  };
}
