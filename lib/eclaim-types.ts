export type EclaimFileType = 'STM' | 'PAY' | 'IMG' | 'UNKNOWN';

export type EclaimPageKey = 'data' | 'overview' | 'stm' | 'pay' | 'summary';

export interface EclaimNamedCount {
  name: string;
  count: number;
  amount: number;
  percent: number;
}

export interface EclaimBatchRow {
  batchKey: string;
  fileType: string;
  fileName: string;
  hcode: string;
  period: string;
  docNo: string;
  rowCount: number;
  amount: number;
  uploadedAt: string | null;
}

export interface EclaimReportData {
  year: number;
  years: number[];
  updatedAt: string;
  kpis: {
    claims: number;
    receiveTotal: number;
    claimAmt: number;
    payTotal: number;
    facilities: number;
    docs: number;
  };
  byHtype: EclaimNamedCount[];
  byFacility: EclaimNamedCount[];
  byPayFacility: EclaimNamedCount[];
  topClaims: Array<{
    rep: string;
    hn: string;
    name: string;
    hcode: string;
    receiveTotal: number;
    claimAmt: number;
  }>;
  summaryRows: Array<{
    repNo: string;
    hcode: string;
    totalCases: number;
    passCases: number;
    failCases: number;
    receiveTotal: number;
  }>;
}

export const ECLAIM_PAGES: Array<{ key: EclaimPageKey; label: string }> = [
  { key: 'data', label: 'ข้อมูล E-claim' },
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'stm', label: 'รายการขอเบิก (STM)' },
  { key: 'pay', label: 'พึงรับ-พึงจ่าย' },
  { key: 'summary', label: 'สรุปราย REP' },
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
