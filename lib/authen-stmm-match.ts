import * as XLSX from 'xlsx';
import { getDB } from '@/lib/database';
import { parseMonthValue } from '@/lib/data-match-authen';

export interface AuthenStmmMatchRow {
  hcode: string;
  cid: string;
  vstdate: string;
  pid: string;
  startdate: string;
  vm: string;
  invoid: string;
  vmInvnoMatch: 'ตรง' | 'ไม่ตรง' | 'ไม่มี vm' | 'ไม่มี invoid';
  authen: string;
  authen_date: string;
  authen_time: string;
  hn_authen: string;
  hn_stmm: string;
  name_stmm: string;
  dttran: string;
  total: number;
  hmain: string;
  STMdoc: string;
}

export interface AuthenStmmMatchSummary {
  month: string | null;
  hcode: string | null;
  authenTotal: number;
  stmmTotal: number;
  joinedTotal: number;
  vmInvnoMatch: number;
  vmInvnoMismatch: number;
  onlyAuthen: number;
  onlyStmm: number;
}

function formatDate(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return text;
}

function formatDttran(value: unknown): string {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.replace('T', ' ').slice(0, 19);
  return text;
}

function vmInvnoStatus(vm: string | null | undefined, invoid: string | null | undefined): AuthenStmmMatchRow['vmInvnoMatch'] {
  const v = String(vm ?? '').trim();
  const i = String(invoid ?? '').trim();
  if (!v) return 'ไม่มี vm';
  if (!i) return 'ไม่มี invoid';
  return v === i ? 'ตรง' : 'ไม่ตรง';
}

function buildMonthFilter(
  aliasAuthen: string,
  aliasStmm: string,
  month: string | null | undefined,
  params: Array<string | number>
): string {
  const parsed = parseMonthValue(month);
  if (!parsed) return '';

  params.push(`${parsed.year}-${parsed.mm}-01`);
  params.push(`${parsed.year}-${parsed.mm}-31`);
  return ` AND ${aliasAuthen}.vstdate >= ? AND ${aliasAuthen}.vstdate <= ?
           AND DATE(${aliasStmm}.dttran) >= ? AND DATE(${aliasStmm}.dttran) <= ?`;
}

function buildHcodeFilter(alias: string, hcode: string | null | undefined, params: Array<string | number>): string {
  if (!hcode) return '';
  params.push(hcode);
  return ` AND ${alias}.hcode = ?`;
}

function buildStmmHcodeFilter(hcode: string | null | undefined, params: Array<string | number>): string {
  if (!hcode) return '';
  params.push(hcode);
  return ' AND s.hcare = ?';
}

export async function fetchAuthenStmmMatch(options?: {
  month?: string | null;
  hcode?: string | null;
}): Promise<{ summary: AuthenStmmMatchSummary; rows: AuthenStmmMatchRow[]; onlyAuthen: AuthenStmmMatchRow[]; onlyStmm: AuthenStmmMatchRow[] }> {
  const month = options?.month?.trim() || null;
  const hcode = options?.hcode?.trim() || null;
  const db = await getDB();

  try {
    const joinCondition = `
      ac.hcode = s.hcare
      AND ac.citizen_id = s.pid
      AND ac.vstdate = DATE(s.dttran)
    `;

    const joinedParams: Array<string | number> = [];
    let joinedWhere = ' WHERE ac.vstdate IS NOT NULL';
    if (hcode) {
      joinedWhere += buildHcodeFilter('ac', hcode, joinedParams);
      joinedWhere += buildStmmHcodeFilter(hcode, joinedParams);
    }
    if (month) {
      joinedWhere += buildMonthFilter('ac', 's', month, joinedParams);
      joinedParams.push(...joinedParams.slice(-2));
    }

    const [joinedRows]: any[] = await db.query(
      `
      SELECT
        ac.hcode,
        ac.citizen_id AS cid,
        DATE_FORMAT(ac.vstdate, '%Y-%m-%d') AS vstdate,
        s.pid,
        DATE_FORMAT(DATE(s.dttran), '%Y-%m-%d') AS startdate,
        ac.vn AS vm,
        s.invno AS invoid,
        ac.authen,
        ac.date AS authen_date,
        ac.time AS authen_time,
        ac.hn AS hn_authen,
        s.hn AS hn_stmm,
        s.name AS name_stmm,
        s.dttran,
        s.total,
        s.hmain,
        s.STMdoc
      FROM authen_code ac
      INNER JOIN sognstmm s ON ${joinCondition}
      ${joinedWhere}
      ORDER BY ac.vstdate DESC, ac.time DESC
      `,
      joinedParams
    );

    const rows: AuthenStmmMatchRow[] = (joinedRows || []).map((row: any) => ({
      hcode: String(row.hcode ?? ''),
      cid: String(row.cid ?? ''),
      vstdate: formatDate(row.vstdate),
      pid: String(row.pid ?? ''),
      startdate: formatDate(row.startdate),
      vm: String(row.vm ?? ''),
      invoid: String(row.invoid ?? ''),
      vmInvnoMatch: vmInvnoStatus(row.vm, row.invoid),
      authen: String(row.authen ?? ''),
      authen_date: String(row.authen_date ?? ''),
      authen_time: String(row.authen_time ?? ''),
      hn_authen: String(row.hn_authen ?? ''),
      hn_stmm: String(row.hn_stmm ?? ''),
      name_stmm: String(row.name_stmm ?? ''),
      dttran: formatDttran(row.dttran),
      total: Number(row.total ?? 0),
      hmain: String(row.hmain ?? ''),
      STMdoc: String(row.STMdoc ?? ''),
    }));

    const onlyAuthenParams: Array<string | number> = [];
    let onlyAuthenWhere = ' WHERE ac.vstdate IS NOT NULL';
    if (hcode) onlyAuthenWhere += buildHcodeFilter('ac', hcode, onlyAuthenParams);
    if (month) {
      const parsed = parseMonthValue(month);
      if (parsed) {
        onlyAuthenParams.push(`${parsed.year}-${parsed.mm}-01`, `${parsed.year}-${parsed.mm}-31`);
        onlyAuthenWhere += ' AND ac.vstdate >= ? AND ac.vstdate <= ?';
      }
    }
    const [onlyAuthenRows]: any[] = await db.query(
      `
      SELECT
        ac.hcode,
        ac.citizen_id AS cid,
        DATE_FORMAT(ac.vstdate, '%Y-%m-%d') AS vstdate,
        ac.vn AS vm,
        ac.authen,
        ac.date AS authen_date,
        ac.time AS authen_time,
        ac.hn AS hn_authen
      FROM authen_code ac
      LEFT JOIN sognstmm s ON ${joinCondition}
      ${onlyAuthenWhere} AND s.id IS NULL
      ORDER BY ac.vstdate DESC, ac.time DESC
      LIMIT 50000
      `,
      onlyAuthenParams
    );

    const onlyAuthen: AuthenStmmMatchRow[] = (onlyAuthenRows || []).map((row: any) => ({
      hcode: String(row.hcode ?? ''),
      cid: String(row.cid ?? ''),
      vstdate: formatDate(row.vstdate),
      pid: '',
      startdate: '',
      vm: String(row.vm ?? ''),
      invoid: '',
      vmInvnoMatch: 'ไม่มี invoid',
      authen: String(row.authen ?? ''),
      authen_date: String(row.authen_date ?? ''),
      authen_time: String(row.authen_time ?? ''),
      hn_authen: String(row.hn_authen ?? ''),
      hn_stmm: '',
      name_stmm: '',
      dttran: '',
      total: 0,
      hmain: '',
      STMdoc: '',
    }));

    const onlyStmmParams: Array<string | number> = [];
    let onlyStmmWhere = ' WHERE s.dttran IS NOT NULL AND s.pid IS NOT NULL AND s.pid != ""';
    if (hcode) onlyStmmWhere += buildStmmHcodeFilter(hcode, onlyStmmParams);
    if (month) {
      const parsed = parseMonthValue(month);
      if (parsed) {
        onlyStmmParams.push(`${parsed.year}-${parsed.mm}-01`, `${parsed.year}-${parsed.mm}-31`);
        onlyStmmWhere += ' AND DATE(s.dttran) >= ? AND DATE(s.dttran) <= ?';
      }
    }
    const [onlyStmmRows]: any[] = await db.query(
      `
      SELECT
        s.hcare AS hcode,
        s.pid,
        DATE_FORMAT(DATE(s.dttran), '%Y-%m-%d') AS startdate,
        s.invno AS invoid,
        s.hn AS hn_stmm,
        s.name AS name_stmm,
        s.dttran,
        s.total,
        s.hmain,
        s.STMdoc
      FROM sognstmm s
      LEFT JOIN authen_code ac ON ${joinCondition}
      ${onlyStmmWhere} AND ac.id IS NULL
      ORDER BY s.dttran DESC
      LIMIT 50000
      `,
      onlyStmmParams
    );

    const onlyStmm: AuthenStmmMatchRow[] = (onlyStmmRows || []).map((row: any) => ({
      hcode: String(row.hcode ?? ''),
      cid: '',
      vstdate: formatDate(row.startdate),
      pid: String(row.pid ?? ''),
      startdate: formatDate(row.startdate),
      vm: '',
      invoid: String(row.invoid ?? ''),
      vmInvnoMatch: 'ไม่มี vm',
      authen: '',
      authen_date: '',
      authen_time: '',
      hn_authen: '',
      hn_stmm: String(row.hn_stmm ?? ''),
      name_stmm: String(row.name_stmm ?? ''),
      dttran: formatDttran(row.dttran),
      total: Number(row.total ?? 0),
      hmain: String(row.hmain ?? ''),
      STMdoc: String(row.STMdoc ?? ''),
    }));

    const authenCountParams: Array<string | number> = [];
    let authenCountWhere = ' WHERE vstdate IS NOT NULL';
    if (hcode) authenCountWhere += buildHcodeFilter('authen_code', hcode, authenCountParams);
    if (month) {
      const parsed = parseMonthValue(month);
      if (parsed) {
        authenCountParams.push(`${parsed.year}-${parsed.mm}-01`, `${parsed.year}-${parsed.mm}-31`);
        authenCountWhere += ' AND vstdate >= ? AND vstdate <= ?';
      }
    }
    const [authenCountRows]: any[] = await db.query(
      `SELECT COUNT(*) AS cnt FROM authen_code ${authenCountWhere}`,
      authenCountParams
    );

    const stmmCountParams: Array<string | number> = [];
    let stmmCountWhere = ' WHERE dttran IS NOT NULL';
    if (hcode) {
      stmmCountWhere += ' AND hcare = ?';
      stmmCountParams.push(hcode);
    }
    if (month) {
      const parsed = parseMonthValue(month);
      if (parsed) {
        stmmCountParams.push(`${parsed.year}-${parsed.mm}-01`, `${parsed.year}-${parsed.mm}-31`);
        stmmCountWhere += ' AND DATE(dttran) >= ? AND DATE(dttran) <= ?';
      }
    }
    const [stmmCountRows]: any[] = await db.query(
      `SELECT COUNT(*) AS cnt FROM sognstmm ${stmmCountWhere}`,
      stmmCountParams
    );

    const vmInvnoMatch = rows.filter((row) => row.vmInvnoMatch === 'ตรง').length;
    const vmInvnoMismatch = rows.filter((row) => row.vmInvnoMatch === 'ไม่ตรง').length;

    return {
      summary: {
        month,
        hcode,
        authenTotal: Number(authenCountRows[0]?.cnt ?? 0),
        stmmTotal: Number(stmmCountRows[0]?.cnt ?? 0),
        joinedTotal: rows.length,
        vmInvnoMatch,
        vmInvnoMismatch,
        onlyAuthen: onlyAuthen.length,
        onlyStmm: onlyStmm.length,
      },
      rows,
      onlyAuthen,
      onlyStmm,
    };
  } finally {
    await db.end();
  }
}

function rowToExcel(row: AuthenStmmMatchRow) {
  return {
    hcode: row.hcode,
    cid: row.cid,
    vstdate: row.vstdate,
    pid: row.pid,
    startdate: row.startdate,
    vm: row.vm,
    invoid: row.invoid,
    'vm=invoid': row.vmInvnoMatch,
    authen: row.authen,
    authen_date: row.authen_date,
    authen_time: row.authen_time,
    hn_authen: row.hn_authen,
    hn_stmm: row.hn_stmm,
    name_stmm: row.name_stmm,
    dttran: row.dttran,
    total: row.total,
    hmain: row.hmain,
    STMdoc: row.STMdoc,
  };
}

export function buildAuthenStmmWorkbook(data: {
  summary: AuthenStmmMatchSummary;
  rows: AuthenStmmMatchRow[];
  onlyAuthen: AuthenStmmMatchRow[];
  onlyStmm: AuthenStmmMatchRow[];
}) {
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet([
    { รายการ: 'เดือน', ค่า: data.summary.month || 'ทั้งหมด' },
    { รายการ: 'hcode', ค่า: data.summary.hcode || 'ทั้งหมด' },
    { รายการ: 'authen_code ทั้งหมด', ค่า: data.summary.authenTotal },
    { รายการ: 'sognstmm ทั้งหมด', ค่า: data.summary.stmmTotal },
    { รายการ: 'จับคู่ได้ (hcode+cid+vstdate)', ค่า: data.summary.joinedTotal },
    { รายการ: 'vm = invno (ตรง)', ค่า: data.summary.vmInvnoMatch },
    { รายการ: 'vm != invno (ไม่ตรง)', ค่า: data.summary.vmInvnoMismatch },
    { รายการ: 'มีใน authen ไม่มีใน stmm', ค่า: data.summary.onlyAuthen },
    { รายการ: 'มีใน stmm ไม่มีใน authen', ค่า: data.summary.onlyStmm },
    { รายการ: 'หมายเหตุ', ค่า: 'จับคู่ authen_code.hcode+citizen_id+vstdate กับ sognstmm.hcare+pid+DATE(dttran); เทียบ vn กับ invno' },
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'สรุป');

  const matchedSheet = XLSX.utils.json_to_sheet(data.rows.map(rowToExcel));
  XLSX.utils.book_append_sheet(wb, matchedSheet, 'จับคู่แล้ว');

  const mismatchRows = data.rows.filter((row) => row.vmInvnoMatch === 'ไม่ตรง');
  const mismatchSheet = XLSX.utils.json_to_sheet(mismatchRows.map(rowToExcel));
  XLSX.utils.book_append_sheet(wb, mismatchSheet, 'vm ไม่ตรง invno');

  const onlyAuthenSheet = XLSX.utils.json_to_sheet(data.onlyAuthen.map(rowToExcel));
  XLSX.utils.book_append_sheet(wb, onlyAuthenSheet, 'มี authen ไม่มี stmm');

  const onlyStmmSheet = XLSX.utils.json_to_sheet(data.onlyStmm.map(rowToExcel));
  XLSX.utils.book_append_sheet(wb, onlyStmmSheet, 'มี stmm ไม่มี authen');

  return wb;
}

export function buildAuthenStmmFilename(options?: { month?: string | null; hcode?: string | null }) {
  const month = options?.month || 'all';
  const hcode = options?.hcode || 'all';
  return `authen-stmm-match_${month}_${hcode}.xlsx`;
}

export async function exportAuthenStmmExcelBuffer(options?: {
  month?: string | null;
  hcode?: string | null;
}) {
  const data = await fetchAuthenStmmMatch(options);
  const wb = buildAuthenStmmWorkbook(data);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return {
    buffer,
    filename: buildAuthenStmmFilename(options),
    summary: data.summary,
  };
}
