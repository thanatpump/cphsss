import { getDB } from '@/lib/database';
import { ensureEclaimTables } from '@/lib/eclaim-import';
import { hospitalLabel, hospitalName, loadHospitalDirectory } from '@/lib/hospital-names';
import type { EclaimNamedCount, EclaimReportData } from '@/lib/eclaim-types';

function toNamedCounts(rows: Array<{ name: string; count: number; amount: number }>): EclaimNamedCount[] {
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  return rows
    .map((row) => ({
      ...row,
      percent: Math.round((row.count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count);
}

function periodYear(period: string) {
  const y = Number(String(period).slice(0, 4));
  return Number.isFinite(y) && y > 2000 ? y : null;
}

export async function fetchEclaimReport(year?: number): Promise<EclaimReportData> {
  await ensureEclaimTables();
  const db = await getDB();
  try {
    const [periodRows]: any[] = await db.query(
      `
      SELECT DISTINCT period FROM (
        SELECT period FROM eclaim_stm
        UNION
        SELECT period FROM eclaim_pay
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

    const hospitalMap = await loadHospitalDirectory(db);

    const [stmKpi]: any[] = await db.query(
      `
      SELECT
        COUNT(*) AS claims,
        COALESCE(SUM(receive_total), 0) AS receive_total,
        COALESCE(SUM(claim_amt), 0) AS claim_amt,
        COUNT(DISTINCT hcode) AS facilities,
        COUNT(DISTINCT doc_no) AS docs,
        MAX(created_at) AS updated_at
      FROM eclaim_stm
      WHERE period LIKE ?
      `,
      [`${periodPrefix}%`]
    );

    const [payKpi]: any[] = await db.query(
      `
      SELECT
        COALESCE(SUM(amount), 0) AS pay_total,
        COUNT(DISTINCT doc_no) AS docs,
        MAX(created_at) AS updated_at
      FROM eclaim_pay
      WHERE period LIKE ?
      `,
      [`${periodPrefix}%`]
    );

    const [htypeRows]: any[] = await db.query(
      `
      SELECT COALESCE(NULLIF(htype, ''), 'unknown') AS name, COUNT(*) AS count, COALESCE(SUM(receive_total), 0) AS amount
      FROM eclaim_stm
      WHERE period LIKE ?
      GROUP BY COALESCE(NULLIF(htype, ''), 'unknown')
      `,
      [`${periodPrefix}%`]
    );

    const [facilityRows]: any[] = await db.query(
      `
      SELECT hcode AS name, COUNT(*) AS count, COALESCE(SUM(receive_total), 0) AS amount
      FROM eclaim_stm
      WHERE period LIKE ? AND hcode IS NOT NULL AND hcode != ''
      GROUP BY hcode
      ORDER BY amount DESC
      LIMIT 25
      `,
      [`${periodPrefix}%`]
    );

    const [payFacilityRows]: any[] = await db.query(
      `
      SELECT
        COALESCE(NULLIF(htreat_code, ''), htreat_name) AS name,
        COUNT(*) AS count,
        COALESCE(SUM(amount), 0) AS amount
      FROM eclaim_pay
      WHERE period LIKE ?
      GROUP BY COALESCE(NULLIF(htreat_code, ''), htreat_name)
      ORDER BY amount DESC
      LIMIT 25
      `,
      [`${periodPrefix}%`]
    );

    const [topClaims]: any[] = await db.query(
      `
      SELECT rep, hn, patient_name AS name, hcode, receive_total, claim_amt
      FROM eclaim_stm
      WHERE period LIKE ?
      ORDER BY receive_total DESC, claim_amt DESC
      LIMIT 30
      `,
      [`${periodPrefix}%`]
    );

    const [summaryRows]: any[] = await db.query(
      `
      SELECT rep_no, hcode, total_cases, pass_cases, fail_cases, receive_total
      FROM eclaim_summary
      WHERE period LIKE ?
      ORDER BY receive_total DESC
      LIMIT 50
      `,
      [`${periodPrefix}%`]
    );

    const updatedCandidates = [stmKpi?.[0]?.updated_at, payKpi?.[0]?.updated_at].filter(Boolean);
    const updatedAt =
      updatedCandidates.length > 0
        ? new Date(
            Math.max(...updatedCandidates.map((value: Date | string) => new Date(value).getTime()))
          ).toISOString()
        : new Date().toISOString();

    return {
      year: selectedYear,
      years,
      updatedAt,
      kpis: {
        claims: Number(stmKpi?.[0]?.claims || 0),
        receiveTotal: Number(stmKpi?.[0]?.receive_total || 0),
        claimAmt: Number(stmKpi?.[0]?.claim_amt || 0),
        payTotal: Number(payKpi?.[0]?.pay_total || 0),
        facilities: Number(stmKpi?.[0]?.facilities || 0),
        docs: Math.max(Number(stmKpi?.[0]?.docs || 0), Number(payKpi?.[0]?.docs || 0)),
      },
      byHtype: toNamedCounts(
        (htypeRows || []).map((row: any) => {
          const code = String(row.name || '');
          return {
            name: `HTYPE ${code === 'unknown' ? '-' : code}`,
            count: Number(row.count || 0),
            amount: Number(row.amount || 0),
          };
        })
      ),
      byFacility: toNamedCounts(
        (facilityRows || []).map((row: any) => {
          const code = String(row.name || '');
          return {
            name: hospitalLabel(hospitalMap, code),
            count: Number(row.count || 0),
            amount: Number(row.amount || 0),
          };
        })
      ),
      byPayFacility: toNamedCounts(
        (payFacilityRows || []).map((row: any) => {
          const raw = String(row.name || '');
          const lookedUp = hospitalName(hospitalMap, raw, '');
          return {
            name: lookedUp ? hospitalLabel(hospitalMap, raw) : raw,
            count: Number(row.count || 0),
            amount: Number(row.amount || 0),
          };
        })
      ),
      topClaims: (topClaims || []).map((row: any) => ({
        rep: String(row.rep || ''),
        hn: String(row.hn || ''),
        name: String(row.name || ''),
        hcode: hospitalLabel(hospitalMap, row.hcode),
        receiveTotal: Number(row.receive_total || 0),
        claimAmt: Number(row.claim_amt || 0),
      })),
      summaryRows: (summaryRows || []).map((row: any) => ({
        repNo: String(row.rep_no || ''),
        hcode: hospitalLabel(hospitalMap, row.hcode),
        totalCases: Number(row.total_cases || 0),
        passCases: Number(row.pass_cases || 0),
        failCases: Number(row.fail_cases || 0),
        receiveTotal: Number(row.receive_total || 0),
      })),
    };
  } finally {
    await db.end();
  }
}
