export type ReportModuleKey = 'ssop' | 'icd10' | 'aipn' | 'chronic' | 'eclaim';

export interface ReportModule {
  key: ReportModuleKey;
  href: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const REPORT_MODULES: ReportModule[] = [
  {
    key: 'ssop',
    href: '/ssop-report',
    label: 'SSOP',
    shortLabel: 'SSOP',
    description: 'รายงานส่งข้อมูลผู้ป่วยนอกสิทธิประกันสังคม',
  },
  {
    key: 'icd10',
    href: '/icd10-report',
    label: 'ICD-10',
    shortLabel: 'ICD-10',
    description: 'วิเคราะห์รหัสโรค ICD-10',
  },
  {
    key: 'aipn',
    href: '/aipn-report',
    label: 'AIPN',
    shortLabel: 'AIPN',
    description: 'SIGNSTM — SIGNSTMM / SIGNSTMS ผู้ป่วยในสิทธิประกันสังคม',
  },
  {
    key: 'chronic',
    href: '/chronic-report',
    label: 'โรคเรื้อรัง',
    shortLabel: 'เรื้อรัง',
    description: 'SSOP ACD — ยืนยันและรายละเอียดโรคเรื้อรัง (ACDCONF / acddetail)',
  },
  {
    key: 'eclaim',
    href: '/eclaim-report',
    label: 'E-claim',
    shortLabel: 'E-claim',
    description: 'STM / พึงรับ-พึงจ่าย จากโฟลเดอร์งวด เช่น 202609',
  },
];
