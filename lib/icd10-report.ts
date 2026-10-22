import { ensureIcd10Codebook, icdDescription } from '@/lib/codebook';
import { getDB } from '@/lib/database';
import { ensureIcd10Tables } from '@/lib/icd10-import';
import {
  THAI_MONTHS_SHORT,
  type Icd10NamedCount,
  type Icd10ReportData,
} from '@/lib/icd10-types';

function toNamedCounts(rows: Array<{ name: string; count: number; description?: string }>): Icd10NamedCount[] {
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  return rows
    .map((row) => ({
      ...row,
      percent: Math.round((row.count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}

function periodYear(period: string) {
  const y = Number(String(period).slice(0, 4));
  return Number.isFinite(y) && y > 2000 ? y : null;
}

export async function fetchIcd10Report(year?: number): Promise<Icd10ReportData> {
  await ensureIcd10Codebook();
  await ensureIcd10Tables();
  const db = await getDB();
  try {
    const [periodRows]: any[] = await db.query(
      `SELECT DISTINCT period FROM icd10_diag WHERE period IS NOT NULL AND period != '' ORDER BY period DESC`
    );
    const yearSet = new Set<number>();
    for (const row of periodRows || []) {
      const y = periodYear(String(row.period || ''));
      if (y != null) yearSet.add(y);
    }
    const years: number[] = Array.from(yearSet).sort((a, b) => b - a);

    const selectedYear: number =
      year && years.includes(year) ? year : years[0] ?? new Date().getFullYear();
    const periodPrefix = String(selectedYear);

    const [kpiRows]: any[] = await db.query(
      `
      SELECT
        COUNT(DISTINCT visit_key) AS visits,
        COUNT(DISTINCT CASE WHEN file_type = 'OPD' THEN visit_key END) AS opd_visits,
        COUNT(DISTINCT CASE WHEN file_type = 'IPD' THEN visit_key END) AS ipd_visits,
        COUNT(*) AS diag_count,
        COUNT(DISTINCT icd_code) AS unique_codes,
        MAX(created_at) AS updated_at
      FROM icd10_diag
      WHERE period LIKE ?
      `,
      [`${periodPrefix}%`]
    );
    const kpi = kpiRows?.[0] || {};

    const [typeRows]: any[] = await db.query(
      `
      SELECT file_type AS name, COUNT(DISTINCT visit_key) AS count
      FROM icd10_diag
      WHERE period LIKE ?
      GROUP BY file_type
      `,
      [`${periodPrefix}%`]
    );

    const [monthRows]: any[] = await db.query(
      `
      SELECT
        MONTH(visit_at) AS month,
        file_type,
        COUNT(DISTINCT visit_key) AS visits
      FROM icd10_diag
      WHERE period LIKE ? AND visit_at IS NOT NULL
      GROUP BY MONTH(visit_at), file_type
      `,
      [`${periodPrefix}%`]
    );

    const monthMap = new Map<number, { opd: number; ipd: number }>();
    for (let m = 1; m <= 12; m++) monthMap.set(m, { opd: 0, ipd: 0 });
    for (const row of monthRows || []) {
      const month = Number(row.month);
      if (!monthMap.has(month)) continue;
      const bucket = monthMap.get(month)!;
      if (String(row.file_type) === 'IPD') bucket.ipd += Number(row.visits || 0);
      else bucket.opd += Number(row.visits || 0);
    }

    // IPD มักไม่มี visit_at — เติมจาก period (YYYYMM)
    const [ipdPeriodRows]: any[] = await db.query(
      `
      SELECT period, COUNT(DISTINCT visit_key) AS visits
      FROM icd10_diag
      WHERE period LIKE ? AND file_type = 'IPD'
      GROUP BY period
      `,
      [`${periodPrefix}%`]
    );
    for (const row of ipdPeriodRows || []) {
      const period = String(row.period || '');
      const month = Number(period.slice(4, 6));
      if (!monthMap.has(month)) continue;
      const bucket = monthMap.get(month)!;
      if (bucket.ipd === 0) bucket.ipd = Number(row.visits || 0);
    }

    async function topCodes(fileType?: 'OPD' | 'IPD', limit = 20) {
      const params: Array<string | number> = [`${periodPrefix}%`];
      let typeSql = '';
      if (fileType) {
        typeSql = ' AND file_type = ?';
        params.push(fileType);
      }
      params.push(limit);
      const [rows]: any[] = await db.query(
        `
        SELECT icd_code AS name, COUNT(*) AS count
        FROM icd10_diag
        WHERE period LIKE ? ${typeSql}
        GROUP BY icd_code
        ORDER BY count DESC
        LIMIT ?
        `,
        params
      );
      return toNamedCounts(
        (rows || []).map((row: any) => {
          const code = String(row.name || '');
          return {
            name: code,
            count: Number(row.count || 0),
            description: icdDescription(code),
          };
        })
      );
    }

    const byMonth = Array.from(monthMap.entries()).map(([month, value]) => ({
      month,
      label: THAI_MONTHS_SHORT[month] || String(month),
      opd: value.opd,
      ipd: value.ipd,
      total: value.opd + value.ipd,
    }));

    return {
      year: selectedYear,
      years,
      updatedAt: kpi.updated_at ? new Date(kpi.updated_at).toISOString() : new Date().toISOString(),
      kpis: {
        visits: Number(kpi.visits || 0),
        opdVisits: Number(kpi.opd_visits || 0),
        ipdVisits: Number(kpi.ipd_visits || 0),
        diagCount: Number(kpi.diag_count || 0),
        uniqueCodes: Number(kpi.unique_codes || 0),
      },
      byType: toNamedCounts(
        (typeRows || []).map((row: any) => ({
          name: String(row.name || ''),
          count: Number(row.count || 0),
        }))
      ),
      byMonth,
      topCodes: await topCodes(undefined, 25),
      topOpd: await topCodes('OPD', 20),
      topIpd: await topCodes('IPD', 20),
    };
  } finally {
    await db.end();
  }
}
