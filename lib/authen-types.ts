export type AuthenPageKey = 'overview' | 'facilities' | 'auth-type' | 'monthly';

export interface AuthenNamedCount {
  name: string;
  count: number;
  percent: number;
}

export interface AuthenFacilityRow {
  hcode: string;
  name: string;
  total: number;
  withCard: number;
  noCard: number;
  withCardPercent: number;
}

export interface AuthenMonthRow {
  month: string;
  label: string;
  total: number;
  withCard: number;
  noCard: number;
}

export interface AuthenReportData {
  dateFrom: string | null;
  dateTo: string | null;
  kpis: {
    total: number;
    withCard: number;
    noCard: number;
    facilities: number;
    withCardPercent: number;
  };
  byAuthType: AuthenNamedCount[];
  byFacility: AuthenFacilityRow[];
  byMonth: AuthenMonthRow[];
  updatedAt: string | null;
}

export const AUTHEN_PAGES: Array<{ key: AuthenPageKey; label: string }> = [
  { key: 'overview', label: 'ภาพรวม' },
  { key: 'facilities', label: 'แยกหน่วยบริการ' },
  { key: 'auth-type', label: 'แยกประเภท Auth' },
  { key: 'monthly', label: 'แยกรายเดือน' },
];
