import * as XLSX from 'xlsx';
import {
  THAI_MONTHS,
  type FacilityMonthRow,
  type FacilityRow,
  type NamedCount,
  type SsopReportData,
  type WatchRow,
} from '@/lib/ssop-report-types';

function findCol(headers: string[], patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = headers.find((header) => pattern.test(header));
    if (match) return match;
  }
  return null;
}

function num(value: unknown) {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown) {
  return String(value ?? '').trim();
}

function toNamed(rows: Array<{ name: string; count: number; amount: number }>): NamedCount[] {
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;
  return rows
    .map((row) => ({ ...row, percent: Math.round((row.count / total) * 1000) / 10 }))
    .sort((a, b) => b.count - a.count);
}

function parseMonth(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const asNum = Number(raw);
  if (asNum >= 1 && asNum <= 12) return asNum;
  const thai = THAI_MONTHS.findIndex((label) => label && raw.includes(label));
  if (thai > 0) return thai;
  const iso = raw.match(/(\d{4})-(\d{2})/);
  if (iso) return Number(iso[2]);
  const yyyymm = raw.match(/(\d{4})(\d{2})/);
  if (yyyymm) return Number(yyyymm[2]);
  return null;
}

export interface ParseResult {
  data: SsopReportData | null;
  headers: string[];
  error?: string;
}

export function parseSsopWorkbook(buffer: ArrayBuffer, fileName: string, year: number): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { data: null, headers: [], error: 'ไม่พบชีตในไฟล์' };

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  if (!rows.length) return { data: null, headers: [], error: 'ไฟล์ไม่มีข้อมูล' };

  const headers = Object.keys(rows[0]);
  const districtCol = findCol(headers, [/อำเภอ/, /amphur/i, /district/i, /amppart/i]);
  const nameCol = findCol(headers, [/ชื่อหน่วย/, /หน่วยบริการ/, /hosname/i, /hname/i, /สถานบริการ/]);
  const hcodeCol = findCol(headers, [/hcode/i, /รหัสหน่วย/, /รหัสสถาน/, /hcare/i]);
  const monthCol = findCol(headers, [/เดือน/, /month/i, /period/i]);
  const countCol = findCol(headers, [/จำนวนครั้ง/, /จำนวนคน/, /visit/i, /รายการ/, /^จำนวน$/]);
  const amountCol = findCol(headers, [/จำนวนเงิน/, /amount/i, /total/i, /เงิน/]);
  const typeCol = findCol(headers, [/ประเภท/, /type/i]);
  const issueCol = findCol(headers, [/ไม่ผ่าน/, /สาเหตุ/, /issue/i, /error/i]);

  if (!countCol && !amountCol) {
    return {
      data: null,
      headers,
      error: `ไม่พบคอลัมน์จำนวนในไฟล์ (คอลัมน์ที่พบ: ${headers.join(', ')})`,
    };
  }

  const facilityMonthMap = new Map<string, FacilityMonthRow>();
  const districtMonth: Record<number, Record<string, number>> = {};
  const districtTotals = new Map<string, { count: number; amount: number }>();
  const typeTotals = new Map<string, { count: number; amount: number }>();
  const facilityTotals = new Map<string, FacilityRow>();
  const watchRows: WatchRow[] = [];

  for (const row of rows) {
    const hcode = hcodeCol ? text(row[hcodeCol]) : '';
    const name = nameCol ? text(row[nameCol]) : hcode || 'ไม่ระบุ';
    const district = districtCol ? text(row[districtCol]) || 'ไม่ระบุอำเภอ' : 'ไม่ระบุอำเภอ';
    const type = typeCol ? text(row[typeCol]) || 'อื่นๆ' : 'อื่นๆ';
    const month = monthCol ? parseMonth(row[monthCol]) || 0 : 0;
    const visits = countCol ? num(row[countCol]) : 1;
    const amount = amountCol ? num(row[amountCol]) : 0;
    if (issueCol && text(row[issueCol])) {
      watchRows.push({ hcode, name, issue: text(row[issueCol]), count: visits });
    }

    const key = `${hcode || name}-${month}`;
    const currentMonth = facilityMonthMap.get(key);
    if (currentMonth) {
      currentMonth.visits += visits;
      currentMonth.amount += amount;
    } else {
      facilityMonthMap.set(key, {
        hcode: hcode || name,
        name,
        district,
        type,
        year,
        month,
        monthLabel: THAI_MONTHS[month] || (month ? String(month) : '-'),
        visits,
        amount,
      });
    }

    if (month >= 1 && month <= 12) {
      districtMonth[month] ??= {};
      districtMonth[month][district] = (districtMonth[month][district] || 0) + visits;
    }

    const d = districtTotals.get(district) || { count: 0, amount: 0 };
    d.count += visits;
    d.amount += amount;
    districtTotals.set(district, d);

    const t = typeTotals.get(type) || { count: 0, amount: 0 };
    t.count += visits;
    t.amount += amount;
    typeTotals.set(type, t);

    const facilityKey = hcode || name;
    const f = facilityTotals.get(facilityKey) || {
      hcode: facilityKey,
      name,
      district,
      type,
      visits: 0,
      amount: 0,
    };
    f.visits += visits;
    f.amount += amount;
    facilityTotals.set(facilityKey, f);
  }

  const facilities = [...facilityTotals.values()].sort((a, b) => b.visits - a.visits);
  const patients = facilities.reduce((sum, row) => sum + row.visits, 0);
  const totalAmount = facilities.reduce((sum, row) => sum + row.amount, 0);
  const byDistrict = toNamed(
    [...districtTotals.entries()].map(([name, value]) => ({
      name,
      count: value.count,
      amount: value.amount,
    }))
  );

  const data: SsopReportData = {
    source: 'file',
    fileName,
    year,
    years: [year],
    updatedAt: new Date().toISOString(),
    kpis: {
      patients,
      avgAmount: patients ? Math.round((totalAmount / patients) * 100) / 100 : 0,
      facilities: facilities.length,
      totalAmount,
    },
    byDistrict,
    byMonth: Array.from({ length: 12 }, (_, idx) => {
      const month = idx + 1;
      const districts = districtMonth[month] || {};
      return {
        month,
        label: THAI_MONTHS[month],
        districts,
        total: Object.values(districts).reduce((sum, value) => sum + value, 0),
      };
    }),
    byFacilityType: toNamed(
      [...typeTotals.entries()].map(([name, value]) => ({
        name,
        count: value.count,
        amount: value.amount,
      }))
    ),
    facilities,
    facilityMonths: [...facilityMonthMap.values()],
    ipdFacilities: facilities,
    ipdMonths: [...facilityMonthMap.values()],
    watchRows,
  };

  return { data, headers };
}
