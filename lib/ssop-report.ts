import { getDB } from '@/lib/database';
import { hospitalAmp, hospitalName, loadHospitalDirectory } from '@/lib/hospital-names';
import {
  THAI_MONTHS,
  type FacilityMonthRow,
  type FacilityRow,
  type NamedCount,
  type SsopReportData,
} from '@/lib/ssop-report-types';

function facilityType(name: string) {
  if (/โรงพยาบาลส่งเสริม|รพ\.?\s*สต|รพสต/i.test(name)) return 'รพ.สต.';
  if (/โรงพยาบาล|รพ\./i.test(name)) return 'โรงพยาบาล';
  if (/คลินิก/i.test(name)) return 'คลินิก';
  if (/ศูนย์/i.test(name)) return 'ศูนย์สุขภาพ';
  return 'อื่นๆ';
}

function matchDistrict(hosname: string, amphoeNames: string[], ampFromDb = '') {
  const fromDb = String(ampFromDb || '').trim();
  if (fromDb) {
    const normalized = fromDb.startsWith('อำเภอ') ? fromDb : `อำเภอ${fromDb}`;
    const hit = amphoeNames.find((name) => {
      const a = name.replace(/^อำเภอ/, '').replace(/\s+/g, '');
      const b = normalized.replace(/^อำเภอ/, '').replace(/\s+/g, '');
      return a === b || name === fromDb || name === normalized;
    });
    return hit || normalized;
  }
  const hay = hosname.replace(/\s+/g, '');
  for (const full of amphoeNames) {
    const token = full.replace(/^อำเภอ/, '').replace(/\s+/g, '');
    if (token.length >= 3 && hay.includes(token)) return full;
  }
  return 'ไม่ระบุอำเภอ';
}

function toNamedCounts(
  rows: Array<{ name: string; count: number; amount: number }>,
  options?: { preserveOrder?: boolean }
): NamedCount[] {
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  const mapped = rows.map((row) => ({
    ...row,
    percent: Math.round((row.count / total) * 1000) / 10,
  }));
  if (options?.preserveOrder) return mapped;
  return mapped.sort((a, b) => b.count - a.count);
}

function buddhistPeriodYear(period: string) {
  const yy = Number(String(period).slice(0, 2));
  const mm = Number(String(period).slice(2, 4));
  if (!yy || !mm) return null;
  return { year: 1957 + yy, month: mm };
}

export async function fetchSsopReport(year?: number): Promise<SsopReportData> {
  const db = await getDB();
  try {
    const [yearRows]: any[] = await db.query(
      `SELECT DISTINCT YEAR(dttran) AS y FROM sognstmm WHERE dttran IS NOT NULL ORDER BY y DESC`
    );
    const years: number[] = (yearRows || [])
      .map((row: any) => Number(row.y))
      .filter((value: number) => Number.isFinite(value) && value > 2000);

    const selectedYear = year && years.includes(year) ? year : years[0] || new Date().getFullYear();

    const hospitalMap = await loadHospitalDirectory(db);

    const [ampRows]: any[] = await db.query('SELECT name FROM amppart WHERE name IS NOT NULL');
    const amphoeNamesAll = (ampRows || [])
      .map((row: any) => String(row.name ?? '').trim())
      .filter(Boolean);
    // ใช้เรียงตามความยาวตอนจับชื่อ (กัน คอนสาร ชน คอนสวรรค์ ฯลฯ)
    const amphoeNames = [...amphoeNamesAll].sort((a: string, b: string) => b.length - a.length);
    // ลำดับแสดงผลตามชื่อใน amppart
    const amphoeDisplayOrder = [...amphoeNamesAll].sort((a, b) => a.localeCompare(b, 'th'));

    const [opdRows]: any[] = await db.query(
      `
      SELECT
        COALESCE(NULLIF(hcare, ''), hproc) AS hcode,
        MONTH(dttran) AS month,
        COUNT(*) AS visits,
        COALESCE(SUM(total), 0) AS amount
      FROM sognstmm
      WHERE YEAR(dttran) = ?
      GROUP BY COALESCE(NULLIF(hcare, ''), hproc), MONTH(dttran)
      `,
      [selectedYear]
    );

    const [ipdRows]: any[] = await db.query(
      `
      SELECT
        hcode,
        period,
        COUNT(*) AS visits,
        COALESCE(SUM(Reimb), 0) AS amount
      FROM signstmm
      WHERE period IS NOT NULL AND period != ''
      GROUP BY hcode, period
      `
    );

    const facilityMonthMap = new Map<string, FacilityMonthRow>();
    const districtMonth: Record<number, Record<string, number>> = {};
    const districtTotals = new Map<string, { count: number; amount: number }>();
    const typeTotals = new Map<string, { count: number; amount: number }>();
    const facilityTotals = new Map<string, FacilityRow>();

    for (const row of opdRows || []) {
      const hcode = String(row.hcode ?? '').trim();
      if (!hcode) continue;
      const month = Number(row.month);
      const visits = Number(row.visits ?? 0);
      const amount = Number(row.amount ?? 0);
      const name = hospitalName(hospitalMap, hcode, hcode);
      const district = matchDistrict(name, amphoeNames, hospitalAmp(hospitalMap, hcode));
      const type = facilityType(name);

      const key = `${hcode}-${month}`;
      facilityMonthMap.set(key, {
        hcode,
        name,
        district,
        type,
        year: selectedYear,
        month,
        monthLabel: THAI_MONTHS[month] || String(month),
        visits,
        amount,
      });

      districtMonth[month] ??= {};
      districtMonth[month][district] = (districtMonth[month][district] || 0) + visits;

      const d = districtTotals.get(district) || { count: 0, amount: 0 };
      d.count += visits;
      d.amount += amount;
      districtTotals.set(district, d);

      const t = typeTotals.get(type) || { count: 0, amount: 0 };
      t.count += visits;
      t.amount += amount;
      typeTotals.set(type, t);

      const f = facilityTotals.get(hcode) || {
        hcode,
        name,
        district,
        type,
        visits: 0,
        amount: 0,
      };
      f.visits += visits;
      f.amount += amount;
      facilityTotals.set(hcode, f);
    }

    const facilityMonths = [...facilityMonthMap.values()].sort(
      (a, b) => a.month - b.month || b.visits - a.visits
    );
    const facilities = [...facilityTotals.values()].sort((a, b) => b.visits - a.visits);

    const byMonth = Array.from({ length: 12 }, (_, idx) => {
      const month = idx + 1;
      const raw = districtMonth[month] || {};
      // ซ่อนกลุ่มนอกจังหวัด / จับอำเภอไม่ได้ ออกจากกราฟแยกอำเภอชั่วคราว
      const districts = Object.fromEntries(
        Object.entries(raw).filter(([name]) => name !== 'ไม่ระบุอำเภอ')
      );
      const total = Object.values(districts).reduce((sum, value) => sum + value, 0);
      return { month, label: THAI_MONTHS[month], districts, total };
    });

    // โชว์ครบทุกอำเภอใน amppart (แม้เป็น 0) — ซ่อน「ไม่ระบุอำเภอ」ไว้ก่อน
    const districtRows: Array<{ name: string; count: number; amount: number }> = [];
    const seenDistrict = new Set<string>();
    for (const name of amphoeDisplayOrder) {
      const value = districtTotals.get(name) || { count: 0, amount: 0 };
      districtRows.push({ name, count: value.count, amount: value.amount });
      seenDistrict.add(name);
    }
    for (const [name, value] of districtTotals.entries()) {
      if (seenDistrict.has(name) || name === 'ไม่ระบุอำเภอ') continue;
      districtRows.push({ name, count: value.count, amount: value.amount });
      seenDistrict.add(name);
    }
    const byDistrict = toNamedCounts(districtRows, { preserveOrder: true });
    const byFacilityType = toNamedCounts(
      [...typeTotals.entries()].map(([name, value]) => ({
        name,
        count: value.count,
        amount: value.amount,
      }))
    );

    const patients = facilities.reduce((sum, row) => sum + row.visits, 0);
    const totalAmount = facilities.reduce((sum, row) => sum + row.amount, 0);

    const ipdFacilityMap = new Map<string, FacilityRow>();
    const ipdMonths: FacilityMonthRow[] = [];
    for (const row of ipdRows || []) {
      const parsed = buddhistPeriodYear(String(row.period ?? ''));
      if (!parsed || parsed.year !== selectedYear) continue;
      const hcode = String(row.hcode ?? '').trim();
      if (!hcode) continue;
      const name = hospitalName(hospitalMap, hcode, hcode);
      const district = matchDistrict(name, amphoeNames, hospitalAmp(hospitalMap, hcode));
      const type = facilityType(name);
      const visits = Number(row.visits ?? 0);
      const amount = Number(row.amount ?? 0);
      ipdMonths.push({
        hcode,
        name,
        district,
        type,
        year: parsed.year,
        month: parsed.month,
        monthLabel: THAI_MONTHS[parsed.month] || String(parsed.month),
        visits,
        amount,
      });
      const current = ipdFacilityMap.get(hcode) || {
        hcode,
        name,
        district,
        type,
        visits: 0,
        amount: 0,
      };
      current.visits += visits;
      current.amount += amount;
      ipdFacilityMap.set(hcode, current);
    }

    return {
      source: 'database',
      fileName: null,
      year: selectedYear,
      years,
      updatedAt: new Date().toISOString(),
      kpis: {
        patients,
        avgAmount: patients ? Math.round((totalAmount / patients) * 100) / 100 : 0,
        facilities: facilities.length,
        totalAmount,
      },
      byDistrict,
      byMonth,
      byFacilityType,
      facilities,
      facilityMonths,
      ipdFacilities: [...ipdFacilityMap.values()].sort((a, b) => b.visits - a.visits),
      ipdMonths: ipdMonths.sort((a, b) => a.month - b.month || b.visits - a.visits),
      watchRows: [],
    };
  } finally {
    await db.end();
  }
}
