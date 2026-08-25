import { getDB } from '@/lib/database';
import { parseMonthValue } from '@/lib/data-match-authen';

export type AuthenStmmRowCategory = 'matched' | 'mismatch' | 'only-authen' | 'only-stmm';

export interface AuthenStmmDashboardSummary {
  month: string | null;
  hcode: string | null;
  facilityName: string | null;
  authenTotal: number;
  stmmTotal: number;
  joinedTotal: number;
  vmInvnoMatch: number;
  vmInvnoMismatch: number;
  onlyAuthen: number;
  onlyStmm: number;
}

export interface AuthenStmmFacilityRow {
  hcode: string;
  facility_name: string;
  authen_total: number;
  stmm_total: number;
  joined_total: number;
  vm_match: number;
  vm_mismatch: number;
  only_authen: number;
  only_stmm: number;
}

export interface AuthenStmmDetailRow {
  hcode: string;
  cid: string;
  vstdate: string;
  pid: string;
  startdate: string;
  vm: string;
  invoid: string;
  vm_status: 'ตรง' | 'ไม่ตรง' | 'ไม่มี vm' | 'ไม่มี invoid';
  authen: string;
  authen_date: string;
  authen_time: string;
  hn_authen: string;
  hn_stmm: string;
  name_stmm: string;
  dttran: string;
  total: number;
}

export type AuthenStmmCompareMetric =
  | 'joined_total'
  | 'vm_match'
  | 'match_rate'
  | 'only_authen'
  | 'only_stmm';

export interface AuthenStmmComparePoint {
  hcode: string;
  label: string;
  is_self: boolean;
  joined_total: number;
  vm_match: number;
  vm_mismatch: number;
  match_rate: number;
  only_authen: number;
  only_stmm: number;
}

export interface AuthenStmmCompareData {
  self_hcode: string | null;
  self: AuthenStmmComparePoint | null;
  others_avg: {
    joined_total: number;
    vm_match: number;
    vm_mismatch: number;
    match_rate: number;
    only_authen: number;
    only_stmm: number;
  };
  bars: AuthenStmmComparePoint[];
  total_facilities: number;
}

function avgMetric(points: AuthenStmmComparePoint[], key: Exclude<AuthenStmmCompareMetric, 'match_rate'>) {
  if (points.length === 0) return 0;
  const sum = points.reduce((total, point) => total + point[key], 0);
  return Math.round((sum / points.length) * 10) / 10;
}

export function buildAuthenStmmComparison(
  facilities: AuthenStmmFacilityRow[],
  selfHcode: string | null,
  limit = 20
): AuthenStmmCompareData {
  const points: AuthenStmmComparePoint[] = facilities
    .filter((facility) => facility.joined_total > 0 || facility.authen_total > 0 || facility.stmm_total > 0)
    .map((facility) => ({
      hcode: facility.hcode,
      label: facility.hcode === selfHcode ? `ของฉัน (${facility.hcode})` : facility.hcode,
      is_self: facility.hcode === selfHcode,
      joined_total: facility.joined_total,
      vm_match: facility.vm_match,
      vm_mismatch: facility.vm_mismatch,
      match_rate:
        facility.joined_total > 0
          ? Math.round((facility.vm_match / facility.joined_total) * 1000) / 10
          : 0,
      only_authen: facility.only_authen,
      only_stmm: facility.only_stmm,
    }))
    .sort((a, b) => b.joined_total - a.joined_total);

  const self = points.find((point) => point.is_self) || null;
  const others = points.filter((point) => !point.is_self);

  let bars = points.slice(0, limit);
  if (self && !bars.some((bar) => bar.is_self)) {
    bars = [...bars, self].sort((a, b) => b.joined_total - a.joined_total);
  }

  const othersMatchRate =
    others.length > 0
      ? Math.round(
          (others.reduce((sum, point) => sum + point.match_rate, 0) / others.length) * 10
        ) / 10
      : 0;

  return {
    self_hcode: selfHcode,
    self,
    others_avg: {
      joined_total: avgMetric(others, 'joined_total'),
      vm_match: avgMetric(others, 'vm_match'),
      vm_mismatch: avgMetric(others, 'vm_mismatch'),
      match_rate: othersMatchRate,
      only_authen: avgMetric(others, 'only_authen'),
      only_stmm: avgMetric(others, 'only_stmm'),
    },
    bars,
    total_facilities: points.length,
  };
}

export async function fetchAuthenStmmComparison(options: {
  month?: string | null;
  selfHcode?: string | null;
  limit?: number;
}): Promise<AuthenStmmCompareData> {
  const facilities = await fetchAuthenStmmFacilityBreakdown({ month: options.month });
  return buildAuthenStmmComparison(facilities, options.selfHcode || null, options.limit ?? 20);
}

const JOIN_CONDITION = `
  ac.hcode = s.hcare
  AND ac.citizen_id = s.pid
  AND ac.vstdate = DATE(s.dttran)
`;

function appendMonthAuthen(month: string | null | undefined, params: Array<string | number>, alias = 'ac') {
  const parsed = parseMonthValue(month);
  if (!parsed) return '';
  params.push(`${parsed.year}-${parsed.mm}-01`, `${parsed.year}-${parsed.mm}-31`);
  return ` AND ${alias}.vstdate >= ? AND ${alias}.vstdate <= ?`;
}

function appendMonthStmm(month: string | null | undefined, params: Array<string | number>) {
  const parsed = parseMonthValue(month);
  if (!parsed) return '';
  params.push(`${parsed.year}-${parsed.mm}-01`, `${parsed.year}-${parsed.mm}-31`);
  return ' AND DATE(s.dttran) >= ? AND DATE(s.dttran) <= ?';
}

function appendHcodeAuthen(hcode: string | null | undefined, params: Array<string | number>, alias = 'ac') {
  if (!hcode) return '';
  params.push(hcode);
  return ` AND ${alias}.hcode = ?`;
}

function appendHcodeStmm(hcode: string | null | undefined, params: Array<string | number>) {
  if (!hcode) return '';
  params.push(hcode);
  return ' AND s.hcare = ?';
}

async function createMatchKeysTempTable(
  db: Awaited<ReturnType<typeof getDB>>,
  options: { hcode?: string | null; month?: string | null }
) {
  const params: Array<string | number> = [];
  let where = ' WHERE ac.vstdate IS NOT NULL';
  where += appendHcodeAuthen(options.hcode, params, 'ac');
  where += appendHcodeStmm(options.hcode, params);
  where += appendMonthAuthen(options.month, params, 'ac');
  if (options.month) {
    where += appendMonthStmm(options.month, params);
  }

  await db.query('DROP TEMPORARY TABLE IF EXISTS tmp_authen_stmm_keys');
  await db.query(`
    CREATE TEMPORARY TABLE tmp_authen_stmm_keys (
      hcode VARCHAR(20) NOT NULL,
      pid VARCHAR(20) NOT NULL,
      vdate DATE NOT NULL,
      PRIMARY KEY (hcode, pid, vdate)
    ) ENGINE=MEMORY
  `);
  await db.query(
    `
    INSERT INTO tmp_authen_stmm_keys (hcode, pid, vdate)
    SELECT DISTINCT ac.hcode, s.pid, ac.vstdate
    FROM authen_code ac
    INNER JOIN sognstmm s ON ${JOIN_CONDITION}
    ${where}
    `,
    params
  );
}

export async function fetchAuthenStmmDashboardSummary(options: {
  hcode?: string | null;
  month?: string | null;
  facilityName?: string | null;
}): Promise<AuthenStmmDashboardSummary> {
  const db = await getDB();
  try {
    await createMatchKeysTempTable(db, options);

    const joinedParams: Array<string | number> = [];
    let joinedWhere = ' WHERE ac.vstdate IS NOT NULL';
    joinedWhere += appendHcodeAuthen(options.hcode, joinedParams, 'ac');
    joinedWhere += appendHcodeStmm(options.hcode, joinedParams);
    joinedWhere += appendMonthAuthen(options.month, joinedParams, 'ac');
    if (options.month) joinedWhere += appendMonthStmm(options.month, joinedParams);

    const [joinedRows]: any[] = await db.query(
      `
      SELECT
        COUNT(*) AS joined_total,
        SUM(CASE WHEN ac.vn = s.invno THEN 1 ELSE 0 END) AS vm_match,
        SUM(CASE WHEN ac.vn IS NOT NULL AND s.invno IS NOT NULL AND ac.vn != s.invno THEN 1 ELSE 0 END) AS vm_mismatch
      FROM authen_code ac
      INNER JOIN sognstmm s ON ${JOIN_CONDITION}
      ${joinedWhere}
      `,
      joinedParams
    );

    const onlyAuthenParams: Array<string | number> = [];
    let onlyAuthenWhere = ' WHERE ac.vstdate IS NOT NULL';
    onlyAuthenWhere += appendHcodeAuthen(options.hcode, onlyAuthenParams, 'ac');
    onlyAuthenWhere += appendMonthAuthen(options.month, onlyAuthenParams, 'ac');

    const [onlyAuthenRows]: any[] = await db.query(
      `
      SELECT COUNT(*) AS cnt
      FROM authen_code ac
      LEFT JOIN tmp_authen_stmm_keys mk
        ON ac.hcode = mk.hcode AND ac.citizen_id = mk.pid AND ac.vstdate = mk.vdate
      ${onlyAuthenWhere} AND mk.hcode IS NULL
      `,
      onlyAuthenParams
    );

    const onlyStmmParams: Array<string | number> = [];
    let onlyStmmWhere = ' WHERE s.dttran IS NOT NULL AND s.pid IS NOT NULL AND s.pid != ""';
    onlyStmmWhere += appendHcodeStmm(options.hcode, onlyStmmParams);
    onlyStmmWhere += appendMonthStmm(options.month, onlyStmmParams);

    const [onlyStmmRows]: any[] = await db.query(
      `
      SELECT COUNT(*) AS cnt
      FROM sognstmm s
      LEFT JOIN tmp_authen_stmm_keys mk
        ON s.hcare = mk.hcode AND s.pid = mk.pid AND DATE(s.dttran) = mk.vdate
      ${onlyStmmWhere} AND mk.hcode IS NULL
      `,
      onlyStmmParams
    );

    const authenCountParams: Array<string | number> = [];
    let authenCountWhere = ' WHERE vstdate IS NOT NULL';
    authenCountWhere += appendHcodeAuthen(options.hcode, authenCountParams, 'authen_code');
    authenCountWhere += appendMonthAuthen(options.month, authenCountParams, 'authen_code');
    const [authenCountRows]: any[] = await db.query(
      `SELECT COUNT(*) AS cnt FROM authen_code ${authenCountWhere}`,
      authenCountParams
    );

    const stmmCountParams: Array<string | number> = [];
    let stmmCountWhere = ' WHERE dttran IS NOT NULL';
    if (options.hcode) {
      stmmCountWhere += ' AND hcare = ?';
      stmmCountParams.push(options.hcode);
    }
    if (options.month) {
      const parsed = parseMonthValue(options.month);
      if (parsed) {
        stmmCountParams.push(`${parsed.year}-${parsed.mm}-01`, `${parsed.year}-${parsed.mm}-31`);
        stmmCountWhere += ' AND DATE(dttran) >= ? AND DATE(dttran) <= ?';
      }
    }
    const [stmmCountRows]: any[] = await db.query(
      `SELECT COUNT(*) AS cnt FROM sognstmm ${stmmCountWhere}`,
      stmmCountParams
    );

    return {
      month: options.month || null,
      hcode: options.hcode || null,
      facilityName: options.facilityName || null,
      authenTotal: Number(authenCountRows[0]?.cnt ?? 0),
      stmmTotal: Number(stmmCountRows[0]?.cnt ?? 0),
      joinedTotal: Number(joinedRows[0]?.joined_total ?? 0),
      vmInvnoMatch: Number(joinedRows[0]?.vm_match ?? 0),
      vmInvnoMismatch: Number(joinedRows[0]?.vm_mismatch ?? 0),
      onlyAuthen: Number(onlyAuthenRows[0]?.cnt ?? 0),
      onlyStmm: Number(onlyStmmRows[0]?.cnt ?? 0),
    };
  } finally {
    try {
      await db.query('DROP TEMPORARY TABLE IF EXISTS tmp_authen_stmm_keys');
    } catch {
      // ignore
    }
    await db.end();
  }
}

export async function fetchAuthenStmmFacilityBreakdown(options: {
  month?: string | null;
}): Promise<AuthenStmmFacilityRow[]> {
  const db = await getDB();
  try {
    await createMatchKeysTempTable(db, { month: options.month });

    const joinedParams: Array<string | number> = [];
    let joinedWhere = ' WHERE ac.vstdate IS NOT NULL';
    joinedWhere += appendMonthAuthen(options.month, joinedParams, 'ac');
    if (options.month) joinedWhere += appendMonthStmm(options.month, joinedParams);

    const [joinedRows]: any[] = await db.query(
      `
      SELECT
        ac.hcode,
        COALESCE(ls.hosname, ac.hcode) AS facility_name,
        COUNT(*) AS joined_total,
        SUM(CASE WHEN ac.vn = s.invno THEN 1 ELSE 0 END) AS vm_match,
        SUM(CASE WHEN ac.vn IS NOT NULL AND s.invno IS NOT NULL AND ac.vn != s.invno THEN 1 ELSE 0 END) AS vm_mismatch
      FROM authen_code ac
      INNER JOIN sognstmm s ON ${JOIN_CONDITION}
      LEFT JOIN login_sks ls ON ls.user_sks = ac.hcode
      ${joinedWhere}
      GROUP BY ac.hcode, ls.hosname
      `,
      joinedParams
    );

    const authenParams: Array<string | number> = [];
    let authenWhere = ' WHERE vstdate IS NOT NULL';
    authenWhere += appendMonthAuthen(options.month, authenParams, 'authen_code');
    const [authenRows]: any[] = await db.query(
      `SELECT hcode, COUNT(*) AS authen_total FROM authen_code ${authenWhere} GROUP BY hcode`,
      authenParams
    );

    const stmmParams: Array<string | number> = [];
    let stmmWhere = ' WHERE dttran IS NOT NULL';
    stmmWhere += appendMonthStmm(options.month, stmmParams);
    const [stmmRows]: any[] = await db.query(
      `SELECT hcare AS hcode, COUNT(*) AS stmm_total FROM sognstmm ${stmmWhere} GROUP BY hcare`,
      stmmParams
    );

    const onlyAuthenParams: Array<string | number> = [];
    let onlyAuthenWhere = ' WHERE ac.vstdate IS NOT NULL';
    onlyAuthenWhere += appendMonthAuthen(options.month, onlyAuthenParams, 'ac');
    const [onlyAuthenRows]: any[] = await db.query(
      `
      SELECT ac.hcode, COUNT(*) AS only_authen
      FROM authen_code ac
      LEFT JOIN tmp_authen_stmm_keys mk
        ON ac.hcode = mk.hcode AND ac.citizen_id = mk.pid AND ac.vstdate = mk.vdate
      ${onlyAuthenWhere} AND mk.hcode IS NULL
      GROUP BY ac.hcode
      `,
      onlyAuthenParams
    );

    const onlyStmmParams: Array<string | number> = [];
    let onlyStmmWhere = ' WHERE s.dttran IS NOT NULL AND s.pid IS NOT NULL AND s.pid != ""';
    onlyStmmWhere += appendMonthStmm(options.month, onlyStmmParams);
    const [onlyStmmRows]: any[] = await db.query(
      `
      SELECT s.hcare AS hcode, COUNT(*) AS only_stmm
      FROM sognstmm s
      LEFT JOIN tmp_authen_stmm_keys mk
        ON s.hcare = mk.hcode AND s.pid = mk.pid AND DATE(s.dttran) = mk.vdate
      ${onlyStmmWhere} AND mk.hcode IS NULL
      GROUP BY s.hcare
      `,
      onlyStmmParams
    );

    const [nameRows]: any[] = await db.query('SELECT user_sks, hosname FROM login_sks');
    const nameMap = new Map<string, string>(
      (nameRows || []).map((row: any) => [String(row.user_sks), String(row.hosname ?? '')])
    );

    const map = new Map<string, AuthenStmmFacilityRow>();

    const ensure = (hcode: string, facilityName?: string) => {
      if (!map.has(hcode)) {
        map.set(hcode, {
          hcode,
          facility_name: facilityName || nameMap.get(hcode) || hcode,
          authen_total: 0,
          stmm_total: 0,
          joined_total: 0,
          vm_match: 0,
          vm_mismatch: 0,
          only_authen: 0,
          only_stmm: 0,
        });
      }
      return map.get(hcode)!;
    };

    for (const row of authenRows || []) ensure(String(row.hcode)).authen_total = Number(row.authen_total ?? 0);
    for (const row of stmmRows || []) ensure(String(row.hcode)).stmm_total = Number(row.stmm_total ?? 0);
    for (const row of joinedRows || []) {
      const item = ensure(String(row.hcode), String(row.facility_name ?? ''));
      item.joined_total = Number(row.joined_total ?? 0);
      item.vm_match = Number(row.vm_match ?? 0);
      item.vm_mismatch = Number(row.vm_mismatch ?? 0);
      item.facility_name = String(row.facility_name ?? item.facility_name);
    }
    for (const row of onlyAuthenRows || []) ensure(String(row.hcode)).only_authen = Number(row.only_authen ?? 0);
    for (const row of onlyStmmRows || []) ensure(String(row.hcode)).only_stmm = Number(row.only_stmm ?? 0);

    return [...map.values()].sort((a, b) => a.facility_name.localeCompare(b.facility_name, 'th'));
  } finally {
    try {
      await db.query('DROP TEMPORARY TABLE IF EXISTS tmp_authen_stmm_keys');
    } catch {
      // ignore
    }
    await db.end();
  }
}

function mapDetailRow(row: any, category: AuthenStmmRowCategory): AuthenStmmDetailRow {
  if (category === 'only-authen') {
    return {
      hcode: String(row.hcode ?? ''),
      cid: String(row.cid ?? ''),
      vstdate: String(row.vstdate ?? ''),
      pid: '',
      startdate: '',
      vm: String(row.vm ?? ''),
      invoid: '',
      vm_status: 'ไม่มี invoid',
      authen: String(row.authen ?? ''),
      authen_date: String(row.authen_date ?? ''),
      authen_time: String(row.authen_time ?? ''),
      hn_authen: String(row.hn_authen ?? ''),
      hn_stmm: '',
      name_stmm: '',
      dttran: '',
      total: 0,
    };
  }

  if (category === 'only-stmm') {
    return {
      hcode: String(row.hcode ?? ''),
      cid: '',
      vstdate: String(row.startdate ?? ''),
      pid: String(row.pid ?? ''),
      startdate: String(row.startdate ?? ''),
      vm: '',
      invoid: String(row.invoid ?? ''),
      vm_status: 'ไม่มี vm',
      authen: '',
      authen_date: '',
      authen_time: '',
      hn_authen: '',
      hn_stmm: String(row.hn_stmm ?? ''),
      name_stmm: String(row.name_stmm ?? ''),
      dttran: String(row.dttran ?? ''),
      total: Number(row.total ?? 0),
    };
  }

  const vm = String(row.vm ?? '');
  const invoid = String(row.invoid ?? '');
  let vm_status: AuthenStmmDetailRow['vm_status'] = 'ไม่มี vm';
  if (vm && invoid) vm_status = vm === invoid ? 'ตรง' : 'ไม่ตรง';

  return {
    hcode: String(row.hcode ?? ''),
    cid: String(row.cid ?? ''),
    vstdate: String(row.vstdate ?? ''),
    pid: String(row.pid ?? ''),
    startdate: String(row.startdate ?? ''),
    vm,
    invoid,
    vm_status,
    authen: String(row.authen ?? ''),
    authen_date: String(row.authen_date ?? ''),
    authen_time: String(row.authen_time ?? ''),
    hn_authen: String(row.hn_authen ?? ''),
    hn_stmm: String(row.hn_stmm ?? ''),
    name_stmm: String(row.name_stmm ?? ''),
    dttran: String(row.dttran ?? ''),
    total: Number(row.total ?? 0),
  };
}

export async function fetchAuthenStmmDetailRows(options: {
  hcode?: string | null;
  month?: string | null;
  category: AuthenStmmRowCategory;
  page?: number;
  limit?: number;
}): Promise<{ rows: AuthenStmmDetailRow[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(200, Math.max(10, options.limit || 50));
  const offset = (page - 1) * limit;
  const db = await getDB();

  try {
    await createMatchKeysTempTable(db, options);

    const params: Array<string | number> = [];
    let sql = '';
    let countSql = '';

    if (options.category === 'matched' || options.category === 'mismatch') {
      let where = ' WHERE ac.vstdate IS NOT NULL';
      where += appendHcodeAuthen(options.hcode, params, 'ac');
      where += appendHcodeStmm(options.hcode, params);
      where += appendMonthAuthen(options.month, params, 'ac');
      if (options.month) where += appendMonthStmm(options.month, params);
      if (options.category === 'matched') where += ' AND ac.vn = s.invno';
      if (options.category === 'mismatch') {
        where += ' AND ac.vn IS NOT NULL AND s.invno IS NOT NULL AND ac.vn != s.invno';
      }

      countSql = `
        SELECT COUNT(*) AS cnt
        FROM authen_code ac
        INNER JOIN sognstmm s ON ${JOIN_CONDITION}
        ${where}
      `;
      sql = `
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
          DATE_FORMAT(s.dttran, '%Y-%m-%d %H:%i:%s') AS dttran,
          s.total
        FROM authen_code ac
        INNER JOIN sognstmm s ON ${JOIN_CONDITION}
        ${where}
        ORDER BY ac.vstdate DESC, ac.time DESC
        LIMIT ? OFFSET ?
      `;
    } else if (options.category === 'only-authen') {
      let where = ' WHERE ac.vstdate IS NOT NULL';
      where += appendHcodeAuthen(options.hcode, params, 'ac');
      where += appendMonthAuthen(options.month, params, 'ac');

      countSql = `
        SELECT COUNT(*) AS cnt
        FROM authen_code ac
        LEFT JOIN tmp_authen_stmm_keys mk
          ON ac.hcode = mk.hcode AND ac.citizen_id = mk.pid AND ac.vstdate = mk.vdate
        ${where} AND mk.hcode IS NULL
      `;
      sql = `
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
        LEFT JOIN tmp_authen_stmm_keys mk
          ON ac.hcode = mk.hcode AND ac.citizen_id = mk.pid AND ac.vstdate = mk.vdate
        ${where} AND mk.hcode IS NULL
        ORDER BY ac.vstdate DESC, ac.time DESC
        LIMIT ? OFFSET ?
      `;
    } else {
      let where = ' WHERE s.dttran IS NOT NULL AND s.pid IS NOT NULL AND s.pid != ""';
      where += appendHcodeStmm(options.hcode, params);
      where += appendMonthStmm(options.month, params);

      countSql = `
        SELECT COUNT(*) AS cnt
        FROM sognstmm s
        LEFT JOIN tmp_authen_stmm_keys mk
          ON s.hcare = mk.hcode AND s.pid = mk.pid AND DATE(s.dttran) = mk.vdate
        ${where} AND mk.hcode IS NULL
      `;
      sql = `
        SELECT
          s.hcare AS hcode,
          s.pid,
          DATE_FORMAT(DATE(s.dttran), '%Y-%m-%d') AS startdate,
          s.invno AS invoid,
          s.hn AS hn_stmm,
          s.name AS name_stmm,
          DATE_FORMAT(s.dttran, '%Y-%m-%d %H:%i:%s') AS dttran,
          s.total
        FROM sognstmm s
        LEFT JOIN tmp_authen_stmm_keys mk
          ON s.hcare = mk.hcode AND s.pid = mk.pid AND DATE(s.dttran) = mk.vdate
        ${where} AND mk.hcode IS NULL
        ORDER BY s.dttran DESC
        LIMIT ? OFFSET ?
      `;
    }

    const [countRows]: any[] = await db.query(countSql, params);
    const total = Number(countRows[0]?.cnt ?? 0);
    const [dataRows]: any[] = await db.query(sql, [...params, limit, offset]);

    return {
      rows: (dataRows || []).map((row: any) => mapDetailRow(row, options.category)),
      total,
      page,
      limit,
    };
  } finally {
    try {
      await db.query('DROP TEMPORARY TABLE IF EXISTS tmp_authen_stmm_keys');
    } catch {
      // ignore
    }
    await db.end();
  }
}
