'use client';

import { useState } from 'react';
import AllocationBoard from '@/app/components/AllocationBoard';
import ReportModuleShell from '@/app/components/ReportModuleShell';

export default function PpReportPage() {
  const current = new Date().getFullYear();
  const [year, setYear] = useState(current);

  return (
    <ReportModuleShell
      active="pp"
      title="แดชบอร์ดตรวจสุขภาพ"
      subtitle="ตรวจสุขภาพ ใบรับรองแพทย์ และตรวจสุขภาพโรงงาน"
    >
      <AllocationBoard
        title="ตรวจสุขภาพ จัดสรรเงิน"
        description="เฉพาะ 10702 และ 10970–10983 ที่รหัสอยู่ใน Z000–Z009, Z020–Z029 หรือ Z100–Z109 ยอดเงินคือ total ของรายการ SSOP"
        endpoint="/api/ssop-report/audit"
        query={{ mode: 'pp' }}
        year={year}
        years={[current, current - 1, current - 2, current - 3]}
        onYearChange={setYear}
        amountLabel="ยอดเงิน"
        variant="ssop"
      />
    </ReportModuleShell>
  );
}
