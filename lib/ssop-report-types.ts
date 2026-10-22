export type SsopPageKey =
  | 'data'
  | 'overview'
  | 'district'
  | 'facility-month'
  | 'facility'
  | 'cases'
  | 'allocate'
  | 'reject';

export interface NamedCount {
  name: string;
  count: number;
  amount: number;
  percent: number;
}

export interface MonthDistrictRow {
  month: number;
  label: string;
  districts: Record<string, number>;
  total: number;
}

export interface FacilityRow {
  hcode: string;
  name: string;
  district: string;
  type: string;
  visits: number;
  amount: number;
}

export interface FacilityMonthRow extends FacilityRow {
  year: number;
  month: number;
  monthLabel: string;
}

export interface WatchRow {
  hcode: string;
  name: string;
  issue: string;
  count: number;
}

export interface SsopReportData {
  source: 'database' | 'file';
  fileName?: string | null;
  year: number;
  years: number[];
  updatedAt: string;
  kpis: {
    patients: number;
    avgAmount: number;
    facilities: number;
    totalAmount: number;
  };
  byDistrict: NamedCount[];
  byMonth: MonthDistrictRow[];
  byFacilityType: NamedCount[];
  facilities: FacilityRow[];
  facilityMonths: FacilityMonthRow[];
  ipdFacilities: FacilityRow[];
  ipdMonths: FacilityMonthRow[];
  watchRows: WatchRow[];
}

export const SSOP_PAGES: Array<{ key: SsopPageKey; label: string }> = [
  { key: 'data', label: 'ข้อมูล SSOP' },
  { key: 'overview', label: 'SSOP-ภาพรวมข้อมูล' },
  { key: 'district', label: 'SSOP-สรุปแยกอำเภอ' },
  { key: 'facility-month', label: 'SSOP-สรุปแยกหน่วยรายเดือน' },
  { key: 'facility', label: 'SSOP-สรุปแยกหน่วย' },
  { key: 'cases', label: 'SSOP-แยกรายตัว' },
  { key: 'allocate', label: 'SSOP-จัดสรรเงิน' },
  { key: 'reject', label: 'SSOP-ถูกปฏิเสธจ่าย' },
];

export const THAI_MONTHS = [
  '',
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export const DISTRICT_COLORS = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
  '#2f4554',
  '#61a0a8',
  '#d48265',
  '#c23531',
  '#749f83',
  '#ca8622',
  '#bda29a',
];
