export type Icd10FileType = 'OPD' | 'IPD';

export type Icd10PageKey = 'data' | 'overview' | 'top' | 'opd' | 'ipd';

export interface Icd10NamedCount {
  name: string;
  count: number;
  percent: number;
  description?: string;
}

export interface Icd10MonthRow {
  month: number;
  label: string;
  opd: number;
  ipd: number;
  total: number;
}

export interface Icd10BatchRow {
  batchKey: string;
  fileType: Icd10FileType;
  fileName: string;
  hcode: string;
  period: string;
  visitCount: number;
  diagCount: number;
  uploadedAt: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface Icd10ReportData {
  year: number;
  years: number[];
  updatedAt: string;
  kpis: {
    visits: number;
    opdVisits: number;
    ipdVisits: number;
    diagCount: number;
    uniqueCodes: number;
  };
  byType: Icd10NamedCount[];
  byMonth: Icd10MonthRow[];
  topCodes: Icd10NamedCount[];
  topOpd: Icd10NamedCount[];
  topIpd: Icd10NamedCount[];
}

export const ICD10_PAGES: Array<{ key: Icd10PageKey; label: string }> = [
  { key: 'data', label: 'ข้อมูล ICD-10' },
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'top', label: 'รหัสโรคยอดนิยม' },
  { key: 'opd', label: 'สรุป OPD' },
  { key: 'ipd', label: 'สรุป IPD' },
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
