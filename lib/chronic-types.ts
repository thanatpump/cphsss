export type ChronicFileType = 'ACDCONF' | 'ACDDETAIL' | 'ACDSUM';

export type ChronicPageKey = 'data' | 'overview' | 'disease' | 'type' | 'detail' | 'allocate';

export interface ChronicNamedCount {
  name: string;
  count: number;
  percent: number;
  description?: string;
}

export interface ChronicMonthRow {
  month: number;
  label: string;
  count: number;
}

export interface ChronicBatchRow {
  batchKey: string;
  fileType: ChronicFileType | string;
  fileName: string;
  hcode: string;
  period: string;
  rowCount: number;
  uploadedAt: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface ChronicReportData {
  year: number;
  years: number[];
  updatedAt: string;
  kpis: {
    cases: number;
    confirmed: number;
    pending: number;
    newCases: number;
    detailVisits: number;
    diseaseCodes: number;
  };
  byType: ChronicNamedCount[];
  byDisease: ChronicNamedCount[];
  byConfirm: ChronicNamedCount[];
  byMonth: ChronicMonthRow[];
  topFacilities: ChronicNamedCount[];
}

export const CHRONIC_PAGES: Array<{ key: ChronicPageKey; label: string }> = [
  { key: 'data', label: 'ข้อมูลโรคเรื้อรัง' },
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'disease', label: 'แยกรหัสโรค' },
  { key: 'type', label: 'แยกประเภท (Type)' },
  { key: 'detail', label: 'รายละเอียดบริการ' },
  { key: 'allocate', label: 'เรื้อรัง-จัดสรรเงิน' },
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

/** ชื่อรหัสโรคเรื้อรังที่พบบ่อย (เติมได้ภายหลัง) */
export const ACD_DISEASE_LABELS: Record<string, string> = {
  '001': '001',
  '002': '002',
  '003': '003',
  '014': '014',
};
