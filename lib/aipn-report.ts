import { getDB } from '@/lib/database';
import {
  THAI_MONTHS_SHORT,
  type AipnFacilityRow,
  type AipnNamedCount,
  type AipnReportData,
} from '@/lib/aipn-types';

function toNamedCounts(rows: Array<{ name: string; count: number; amount: number }>): AipnNamedCount[] {
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  return rows
    .map((row) => ({
      ...row,
      percent: Math.round((row.count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}

/** period 6909 → { year: 2026, month: 9 }, หรือ 202609 */
export function parseSignPeriod(period: string): { year: number; month: number } | null {
  const text = String(period || '').trim();
  if (/^20\d{2}(0[1-9]|1[0-2])$/.test(text)) {
    return { year: Number(text.slice(0, 4)), month: Number(text.slice(4, 6)) };
  }
  if (/^\d{2}(0[1-9]|1[0-2])$/.test(text)) {
    return { year: Number(text.slice(0, 2)) + 1957, month: Number(text.slice(2, 4)) };
  }
  return null;
}

export async function fetchAipnReport(year?: number): Promise<AipnReportData> {
  const db = await getDB();
  try {
    const [periodRows]: any[] = await db.query(
      `
      SELECT DISTINCT period FROM (
        SELECT period FROM signstmm WHERE period IS NOT NULL AND period != ''
        UNION
        SELECT period FROM signstms WHERE period IS NOT NULL AND period != ''
      ) t
      `
    );

    const yearSet = new Set<number>();
    for (const row of periodRows || []) {
      const parsed = parseSignPeriod(String(row.period || ''));
      if (parsed) yearSet.add(parsed.year);
    }
    const years: number[] = Array.from(yearSet).sort((a, b) => b - a);
    const selectedYear: number =
      year && years.includes(year) ? year : years[0] ?? new Date().getFullYear();

    const periodsForYear = (periodRows || [])
      .map((row: any) => String(row.period || ''))
      .filter((period: string) => {
        const parsed = parseSignPeriod(period);
        return parsed?.year === selectedYear;
      });

    if (!periodsForYear.length) {
      return {
        year: selectedYear,
        years,
        updatedAt: new Date().toISOString(),
        kpis: {
          cases: 0,
          stmmCases: 0,
          stmsCases: 0,
          amount: 0,
          adjrw: 0,
          facilities: 0,
          transactions: 0,
          passed: 0,
          failed: 0,
        },
        byMonth: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          label: THAI_MONTHS_SHORT[i + 1],
          stmm: 0,
          stms: 0,
          total: 0,
          amount: 0,
        })),
        bySource: [],
        stmmFacilities: [],
        stmsFacilities: [],
        facilityStatus: [],
        topByVolume: [],
        topByFailPercent: [],
        watchRows: [],
      };
    }

    const placeholders = periodsForYear.map(() => '?').join(',');

    const [nameRows]: any[] = await db.query('SELECT user_sks, hosname FROM login_sks');
    const nameMap = new Map<string, string>();
    for (const row of nameRows || []) {
      const hcode = String(row.user_sks ?? '').trim();
      if (hcode) nameMap.set(hcode, String(row.hosname ?? '').trim() || hcode);
    }

    const [stmmKpi]: any[] = await db.query(
      `
      SELECT
        COUNT(*) AS cases,
        COALESCE(SUM(Reimb), 0) AS amount,
        COALESCE(SUM(adjrw), 0) AS adjrw,
        COUNT(DISTINCT COALESCE(NULLIF(hproc, ''), hcode)) AS facilities,
        MAX(created_at) AS updated_at
      FROM signstmm
      WHERE period IN (${placeholders})
      `,
      periodsForYear
    );

    const [stmsKpi]: any[] = await db.query(
      `
      SELECT
        COUNT(*) AS cases,
        COALESCE(SUM(Reimb), 0) AS amount,
        COALESCE(SUM(adjrw), 0) AS adjrw,
        COUNT(DISTINCT COALESCE(NULLIF(hproc, ''), hcode)) AS facilities,
        MAX(created_at) AS updated_at
      FROM signstms
      WHERE period IN (${placeholders})
      `,
      periodsForYear
    );

    const stmmCases = Number(stmmKpi?.[0]?.cases || 0);
    const stmsCases = Number(stmsKpi?.[0]?.cases || 0);
    const amount = Number(stmmKpi?.[0]?.amount || 0) + Number(stmsKpi?.[0]?.amount || 0);
    const adjrw = Number(stmmKpi?.[0]?.adjrw || 0) + Number(stmsKpi?.[0]?.adjrw || 0);
    const facilities = Math.max(
      Number(stmmKpi?.[0]?.facilities || 0),
      Number(stmsKpi?.[0]?.facilities || 0)
    );

    const updatedCandidates = [stmmKpi?.[0]?.updated_at, stmsKpi?.[0]?.updated_at].filter(Boolean);
    const updatedAt =
      updatedCandidates.length > 0
        ? new Date(
            Math.max(...updatedCandidates.map((value: Date | string) => new Date(value).getTime()))
          ).toISOString()
        : new Date().toISOString();

    async function facilityRows(table: 'signstmm' | 'signstms'): Promise<AipnFacilityRow[]> {
      const [rows]: any[] = await db.query(
        `
        SELECT
          COALESCE(NULLIF(hproc, ''), hcode) AS hcode,
          COUNT(*) AS visits,
          COALESCE(SUM(Reimb), 0) AS amount,
          COALESCE(SUM(adjrw), 0) AS adjrw
        FROM ${table}
        WHERE period IN (${placeholders})
        GROUP BY COALESCE(NULLIF(hproc, ''), hcode)
        ORDER BY visits DESC
        `,
        periodsForYear
      );
      return (rows || []).map((row: any) => {
        const hcode = String(row.hcode || '');
        return {
          hcode,
          name: nameMap.get(hcode) || hcode,
          visits: Number(row.visits || 0),
          amount: Number(row.amount || 0),
          adjrw: Number(row.adjrw || 0),
        };
      });
    }

    const [stmmMonthRows]: any[] = await db.query(
      `
      SELECT MONTH(dateadm) AS month, COUNT(*) AS visits, COALESCE(SUM(Reimb), 0) AS amount
      FROM signstmm
      WHERE period IN (${placeholders}) AND dateadm IS NOT NULL AND dateadm != ''
      GROUP BY MONTH(dateadm)
      `,
      periodsForYear
    );
    const [stmsMonthRows]: any[] = await db.query(
      `
      SELECT MONTH(dateadm) AS month, COUNT(*) AS visits, COALESCE(SUM(Reimb), 0) AS amount
      FROM signstms
      WHERE period IN (${placeholders}) AND dateadm IS NOT NULL AND dateadm != ''
      GROUP BY MONTH(dateadm)
      `,
      periodsForYear
    );

    const monthMap = new Map<number, { stmm: number; stms: number; amount: number }>();
    for (let m = 1; m <= 12; m++) monthMap.set(m, { stmm: 0, stms: 0, amount: 0 });
    for (const row of stmmMonthRows || []) {
      const month = Number(row.month);
      if (!monthMap.has(month)) continue;
      const bucket = monthMap.get(month)!;
      bucket.stmm += Number(row.visits || 0);
      bucket.amount += Number(row.amount || 0);
    }
    for (const row of stmsMonthRows || []) {
      const month = Number(row.month);
      if (!monthMap.has(month)) continue;
      const bucket = monthMap.get(month)!;
      bucket.stms += Number(row.visits || 0);
      bucket.amount += Number(row.amount || 0);
    }

    // เติมจาก period ถ้าไม่มี dateadm
    for (const period of periodsForYear) {
      const parsed = parseSignPeriod(period);
      if (!parsed) continue;
      const bucket = monthMap.get(parsed.month);
      if (!bucket) continue;
      if (bucket.stmm === 0 && bucket.stms === 0) {
        // leave as is; facility queries already cover totals
      }
    }

    const stmmFacilities = await facilityRows('signstmm');
    const stmsFacilities = await facilityRows('signstms');

    // รวมหน่วยจาก STMM+STMS สำหรับแดชบอร์ดแบบ Looker (ผ่าน/ไม่ผ่าน)
    // ยังไม่มีไฟล์รายการไม่ผ่าน — ถือว่าผ่านทั้งหมดจนกว่าจะมี watch data
    const failByHcode = new Map<string, number>();
    const facilityMap = new Map<
      string,
      { name: string; total: number; amount: number; failed: number }
    >();
    for (const row of [...stmmFacilities, ...stmsFacilities]) {
      const prev = facilityMap.get(row.hcode) || {
        name: row.name,
        total: 0,
        amount: 0,
        failed: 0,
      };
      prev.total += row.visits;
      prev.amount += row.amount;
      prev.failed = failByHcode.get(row.hcode) || 0;
      facilityMap.set(row.hcode, prev);
    }

    const facilityStatus = [...facilityMap.entries()]
      .map(([hcode, row]) => {
        const failed = Math.min(row.failed, row.total);
        const passed = Math.max(row.total - failed, 0);
        const failPercent =
          row.total > 0 ? Math.round((failed / row.total) * 10000) / 100 : 0;
        return {
          hcode,
          name: row.name,
          total: row.total,
          passed,
          failed,
          failPercent,
          amount: row.amount,
        };
      })
      .sort((a, b) => b.total - a.total);

    const failedTotal = facilityStatus.reduce((sum, row) => sum + row.failed, 0);
    const transactions = stmmCases + stmsCases;
    const passedTotal = Math.max(transactions - failedTotal, 0);

    return {
      year: selectedYear,
      years,
      updatedAt,
      kpis: {
        cases: transactions,
        stmmCases,
        stmsCases,
        amount,
        adjrw,
        facilities,
        transactions,
        passed: passedTotal,
        failed: failedTotal,
      },
      byMonth: Array.from(monthMap.entries()).map(([month, value]) => ({
        month,
        label: THAI_MONTHS_SHORT[month] || String(month),
        stmm: value.stmm,
        stms: value.stms,
        total: value.stmm + value.stms,
        amount: value.amount,
      })),
      bySource: toNamedCounts([
        { name: 'SIGNSTMM', count: stmmCases, amount: Number(stmmKpi?.[0]?.amount || 0) },
        { name: 'SIGNSTMS', count: stmsCases, amount: Number(stmsKpi?.[0]?.amount || 0) },
      ]),
      stmmFacilities,
      stmsFacilities,
      facilityStatus,
      topByVolume: facilityStatus.slice(0, 15),
      topByFailPercent: [...facilityStatus]
        .filter((row) => row.total > 0)
        .sort((a, b) => b.failPercent - a.failPercent || b.failed - a.failed)
        .slice(0, 15),
      watchRows: [],
    };
  } finally {
    await db.end();
  }
}
