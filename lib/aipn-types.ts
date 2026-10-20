export type AipnFileType = 'SIGNSTMM' | 'SIGNSTMS' | 'SIGNSUMM' | 'SIGNSUMS' | 'SIGNSUPM' | 'SIGNSUPS';

export type AipnPageKey = 'data' | 'overview' | 'stmm' | 'stms' | 'watch';

export interface AipnNamedCount {
  name: string;
  count: number;
  amount: number;
  percent: number;
}

export interface AipnMonthRow {
  month: number;
  label: string;
  stmm: number;
  stms: number;
  total: number;
  amount: number;
}

export interface AipnBatchRow {
  stmno: string;
  fileType: string;
  hcode: string;
  period: string;
  rowCount: number;
  amount: number;
  adjrw: number;
  uploadedAt: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface AipnFacilityRow {
  hcode: string;
  name: string;
  visits: number;
  amount: number;
  adjrw: number;
}

export interface AipnFacilityStatusRow {
  hcode: string;
  name: string;
  total: number;
  passed: number;
  failed: number;
  failPercent: number;
  amount: number;
}

export interface AipnWatchRow {
  hcode: string;
  name: string;
  issue: string;
  count: number;
}

export interface AipnReportData {
  year: number;
  years: number[];
  updatedAt: string;
  kpis: {
    cases: number;
    stmmCases: number;
    stmsCases: number;
    amount: number;
    adjrw: number;
    facilities: number;
    transactions: number;
    passed: number;
    failed: number;
  };
  byMonth: AipnMonthRow[];
  bySource: AipnNamedCount[];
  stmmFacilities: AipnFacilityRow[];
  stmsFacilities: AipnFacilityRow[];
  facilityStatus: AipnFacilityStatusRow[];
  topByVolume: AipnFacilityStatusRow[];
  topByFailPercent: AipnFacilityStatusRow[];
  watchRows: AipnWatchRow[];
}

export const AIPN_PAGES: Array<{ key: AipnPageKey; label: string }> = [
  { key: 'data', label: 'ข้อมูล AIPN' },
  { key: 'overview', label: 'AIPN-ส่งข้อมูลIPD' },
  { key: 'stmm', label: 'SIGNSTMM (IPD)' },
  { key: 'stms', label: 'SIGNSTMS' },
  { key: 'watch', label: 'AIPN-เฝ้าระวังข้อมูลที่ไม่ผ่าน' },
];

export const THAI_MONTHS_SHORT = [
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
