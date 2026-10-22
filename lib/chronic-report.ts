import { chronicLevel } from '@/lib/codebook';
import { getDB } from '@/lib/database';
import { ensureChronicTables } from '@/lib/chronic-import';
import { hospitalLabel, loadHospitalDirectory } from '@/lib/hospital-names';
import {
  THAI_MONTHS_SHORT,
  type ChronicNamedCount,
  type ChronicReportData,
} from '@/lib/chronic-types';

function toNamedCounts(rows: Array<{ name: string; count: number; description?: string }>): ChronicNamedCount[] {
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

export async function fetchChronicReport(year?: number): Promise<ChronicReportData> {
  await ensureChronicTables();
  const db = await getDB();
  try {
    const [periodRows]: any[] = await db.query(
      `
      SELECT DISTINCT period FROM (
        SELECT period FROM acd_conf
        UNION
        SELECT period FROM acd_detail
      ) t
      WHERE period IS NOT NULL AND period != ''
      ORDER BY period DESC
      `
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
        COUNT(*) AS cases,
        SUM(CASE WHEN UPPER(TRIM(confirmed)) = 'Y' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN confirmed IS NULL OR TRIM(confirmed) = '' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN UPPER(TRIM(case_type)) = 'NEW' THEN 1 ELSE 0 END) AS new_cases,
        COUNT(DISTINCT disease_code) AS disease_codes,
        MAX(created_at) AS updated_at
      FROM acd_conf
      WHERE period LIKE ?
      `,
      [`${periodPrefix}%`]
    );
    const kpi = kpiRows?.[0] || {};

    const [detailKpi]: any[] = await db.query(
      `SELECT COUNT(*) AS detail_visits FROM acd_detail WHERE period LIKE ?`,
      [`${periodPrefix}%`]
    );

    const [typeRows]: any[] = await db.query(
      `
      SELECT COALESCE(NULLIF(TRIM(case_type), ''), '(ว่าง)') AS name, COUNT(*) AS count
      FROM acd_conf
      WHERE period LIKE ?
      GROUP BY COALESCE(NULLIF(TRIM(case_type), ''), '(ว่าง)')
      ORDER BY count DESC
      `,
      [`${periodPrefix}%`]
    );

    const [diseaseRows]: any[] = await db.query(
      `
      SELECT disease_code AS name, COUNT(*) AS count
      FROM acd_conf
      WHERE period LIKE ?
      GROUP BY disease_code
      ORDER BY count DESC
      LIMIT 30
      `,
      [`${periodPrefix}%`]
    );

    const [confirmRows]: any[] = await db.query(
      `
      SELECT
        CASE
          WHEN UPPER(TRIM(confirmed)) = 'Y' THEN 'ยืนยันแล้ว'
          WHEN confirmed IS NULL OR TRIM(confirmed) = '' THEN 'รอยืนยัน'
          ELSE TRIM(confirmed)
        END AS name,
        COUNT(*) AS count
      FROM acd_conf
      WHERE period LIKE ?
      GROUP BY name
      `,
      [`${periodPrefix}%`]
    );

    const [monthRows]: any[] = await db.query(
      `
      SELECT MONTH(first_date) AS month, COUNT(*) AS count
      FROM acd_conf
      WHERE period LIKE ? AND first_date IS NOT NULL
      GROUP BY MONTH(first_date)
      `,
      [`${periodPrefix}%`]
    );

    const monthMap = new Map<number, number>();
    for (let m = 1; m <= 12; m++) monthMap.set(m, 0);
    for (const row of monthRows || []) {
      const month = Number(row.month);
      if (monthMap.has(month)) monthMap.set(month, Number(row.count || 0));
    }

    const hospitalMap = await loadHospitalDirectory(db);

    const [facilityRows]: any[] = await db.query(
      `
      SELECT COALESCE(NULLIF(hcode, ''), hproc) AS name, COUNT(*) AS count
      FROM acd_detail
      WHERE period LIKE ?
      GROUP BY COALESCE(NULLIF(hcode, ''), hproc)
      ORDER BY count DESC
      LIMIT 20
      `,
      [`${periodPrefix}%`]
    );

    return {
      year: selectedYear,
      years,
      updatedAt: kpi.updated_at ? new Date(kpi.updated_at).toISOString() : new Date().toISOString(),
      kpis: {
        cases: Number(kpi.cases || 0),
        confirmed: Number(kpi.confirmed || 0),
        pending: Number(kpi.pending || 0),
        newCases: Number(kpi.new_cases || 0),
        detailVisits: Number(detailKpi?.[0]?.detail_visits || 0),
        diseaseCodes: Number(kpi.disease_codes || 0),
      },
      byType: toNamedCounts(
        (typeRows || []).map((row: any) => ({
          name: String(row.name || ''),
          count: Number(row.count || 0),
        }))
      ),
      byDisease: toNamedCounts(
        (diseaseRows || []).map((row: any) => {
          const code = String(row.name || '');
          const level = chronicLevel(code);
          return {
            name: code,
            count: Number(row.count || 0),
            description: level ? `${level.name} (น้ำหนัก ${level.weight})` : '',
          };
        })
      ),
      byConfirm: toNamedCounts(
        (confirmRows || []).map((row: any) => ({
          name: String(row.name || ''),
          count: Number(row.count || 0),
        }))
      ),
      byMonth: Array.from(monthMap.entries()).map(([month, count]) => ({
        month,
        label: THAI_MONTHS_SHORT[month] || String(month),
        count,
      })),
      topFacilities: toNamedCounts(
        (facilityRows || []).map((row: any) => ({
          name: hospitalLabel(hospitalMap, row.name),
          count: Number(row.count || 0),
        }))
      ),
    };
  } finally {
    await db.end();
  }
}
