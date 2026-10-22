'use client';

import { useState } from 'react';
import AllocationBoard from '@/app/components/AllocationBoard';
import ReportModuleShell from '@/app/components/ReportModuleShell';

export default function VaccineReportPage() {
  const current = new Date().getFullYear();
  const [year, setYear] = useState(current);

  return (
    <ReportModuleShell
      active="vaccine"
      title="แดชบอร์ดวัคซีน"
      subtitle="รายการวัคซีนจาก SSOP ของหน่วยในจังหวัดชัยภูมิ"
    >
      <AllocationBoard
        title="วัคซีน จัดสรรเงิน"
        description="เฉพาะ 10702 และ 10970–10983 ที่รหัสหลักหรือรหัสรองขึ้นต้น Z23 Z24 Z25 หรือ U11 กราฟเรียงตามยอดเงินจากมากไปน้อย"
        endpoint="/api/ssop-report/audit"
        query={{ mode: 'vaccine' }}
        year={year}
        years={[current, current - 1, current - 2, current - 3]}
        onYearChange={setYear}
        amountLabel="ยอดเบิก"
        variant="ssop"
      />
    </ReportModuleShell>
  );
}
