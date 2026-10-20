import { getDB } from '@/lib/database';
import { parseDateParam } from '@/lib/auth-date-range';
import { WITH_CARD_AUTH_TYPES } from '@/lib/authen-auth-stats';
import { hospitalName, loadHospitalDirectory } from '@/lib/hospital-names';
import type { AuthenFacilityRow, AuthenMonthRow, AuthenNamedCount, AuthenReportData } from '@/lib/authen-types';

const MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function buildDateWhere(alias: string, dateFrom: string | null, dateTo: string | null) {
  const params: string[] = [];
  let where = ` WHERE ${alias}.hcode IS NOT NULL AND ${alias}.hcode != ''`;
  if (dateFrom) {
    where += ` AND ${alias}.vstdate >= ?`;
    params.push(dateFrom);
  }
  if (dateTo) {
    where += ` AND ${alias}.vstdate <= ?`;
    params.push(dateTo);
  }
  return { where, params };
}

function toNamedCounts(rows: Array<{ name: string; count: number }>, total: number): AuthenNamedCount[] {
  return rows.map((row) => ({
    name: row.name,
    count: row.count,
    percent: total > 0 ? (row.count / total) * 100 : 0,
  }));
}

export async function fetchAuthenReport(options?: {
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<AuthenReportData> {
  const dateFrom = parseDateParam(options?.dateFrom ?? null);
  const dateTo = parseDateParam(options?.dateTo ?? null);
  const { where, params } = buildDateWhere('ac', dateFrom, dateTo);
  const withCardPlaceholders = WITH_CARD_AUTH_TYPES.map(() => '?').join(', ');

  const db = await getDB();
  try {
    const [kpiRows]: any[] = await db.query(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN ac.auth_type IN (${withCardPlaceholders}) THEN 1 ELSE 0 END) AS with_card,
        COUNT(DISTINCT ac.hcode) AS facilities,
        MAX(ac.created_at) AS updated_at
      FROM authen_code ac
      ${where}
      `,
      [...WITH_CARD_AUTH_TYPES, ...params]
    );

    const total = Number(kpiRows?.[0]?.total ?? 0);
    const withCard = Number(kpiRows?.[0]?.with_card ?? 0);
    const noCard = Math.max(0, total - withCard);
    const facilities = Number(kpiRows?.[0]?.facilities ?? 0);
    const updatedAt = kpiRows?.[0]?.updated_at
      ? new Date(kpiRows[0].updated_at).toISOString()
      : null;

    const [typeRows]: any[] = await db.query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(ac.auth_type), ''), 'ไม่ระบุ') AS name,
        COUNT(*) AS count
      FROM authen_code ac
      ${where}
      GROUP BY COALESCE(NULLIF(TRIM(ac.auth_type), ''), 'ไม่ระบุ')
      ORDER BY count DESC
      `,
      params
    );

    const [facilityRows]: any[] = await db.query(
      `
      SELECT
        ac.hcode,
        COUNT(*) AS total,
        SUM(CASE WHEN ac.auth_type IN (${withCardPlaceholders}) THEN 1 ELSE 0 END) AS with_card
      FROM authen_code ac
      ${where}
      GROUP BY ac.hcode
      ORDER BY total DESC
      `,
      [...WITH_CARD_AUTH_TYPES, ...params]
    );

    const hospitalMap = await loadHospitalDirectory(db);

    const byFacility: AuthenFacilityRow[] = (facilityRows || []).map((row: any) => {
      const hcode = String(row.hcode ?? '').trim();
      const rowTotal = Number(row.total ?? 0);
      const rowWith = Number(row.with_card ?? 0);
      const rowNo = Math.max(0, rowTotal - rowWith);
      return {
        hcode,
        name: hospitalName(hospitalMap, hcode, hcode),
        total: rowTotal,
        withCard: rowWith,
        noCard: rowNo,
        withCardPercent: rowTotal > 0 ? (rowWith / rowTotal) * 100 : 0,
      };
    });

    const [monthRows]: any[] = await db.query(
      `
      SELECT
        DATE_FORMAT(ac.vstdate, '%Y-%m') AS month_key,
        COUNT(*) AS total,
        SUM(CASE WHEN ac.auth_type IN (${withCardPlaceholders}) THEN 1 ELSE 0 END) AS with_card
      FROM authen_code ac
      ${where}
        AND ac.vstdate IS NOT NULL
      GROUP BY DATE_FORMAT(ac.vstdate, '%Y-%m')
      ORDER BY month_key ASC
      `,
      [...WITH_CARD_AUTH_TYPES, ...params]
    );

    const byMonth: AuthenMonthRow[] = (monthRows || []).map((row: any) => {
      const month = String(row.month_key ?? '');
      const [y, m] = month.split('-');
      const monthIdx = Math.max(0, Number(m || 1) - 1);
      const beYear = Number(y || 0) + 543;
      const rowTotal = Number(row.total ?? 0);
      const rowWith = Number(row.with_card ?? 0);
      return {
        month,
        label: `${MONTH_LABELS[monthIdx]} ${beYear}`,
        total: rowTotal,
        withCard: rowWith,
        noCard: Math.max(0, rowTotal - rowWith),
      };
    });

    const byAuthType = toNamedCounts(
      (typeRows || []).map((row: any) => ({
        name: String(row.name ?? 'ไม่ระบุ'),
        count: Number(row.count ?? 0),
      })),
      total
    );

    return {
      dateFrom,
      dateTo,
      kpis: {
        total,
        withCard,
        noCard,
        facilities,
        withCardPercent: total > 0 ? (withCard / total) * 100 : 0,
      },
      byAuthType,
      byFacility,
      byMonth,
      updatedAt,
    };
  } finally {
    await db.end();
  }
}
