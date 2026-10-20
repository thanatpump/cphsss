'use client';

import ReportModuleShell from '@/app/components/ReportModuleShell';
import { REPORT_MODULES, type ReportModuleKey } from '@/lib/report-modules';

export default function ReportComingSoon({ moduleKey }: { moduleKey: ReportModuleKey }) {
  const mod = REPORT_MODULES.find((item) => item.key === moduleKey);

  return (
    <ReportModuleShell active={moduleKey} title={`แดชบอร์ด ${mod?.label || ''}`}>
      <section className="bg-white rounded-xl border border-[#d8e0e5] p-8 sm:p-12 text-center">
        <p
          className="text-xs font-medium tracking-[0.16em] uppercase text-[#1a7a6d] mb-3"
          style={{ fontFamily: 'var(--font-ibm-plex)' }}
        >
          กำลังจัดทำ
        </p>
        <h2
          className="text-2xl font-semibold text-[#0b3d4a]"
          style={{ fontFamily: 'var(--font-ibm-plex)' }}
        >
          {mod?.label}
        </h2>
        <p className="mt-3 text-sm text-[#5c6b73] max-w-lg mx-auto leading-relaxed">
          {mod?.description}
          <br />
          เมนูนี้พร้อมใช้งานแล้ว — เนื้อหาแดชบอร์ดจะต่อจากชุดข้อมูลที่เกี่ยวข้องในรอบถัดไป
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
          <Hint title="อัปโหลดข้อมูล" text="รองรับไฟล์ชุดที่เกี่ยวข้องกับโมดูลนี้" />
          <Hint title="สรุปภาพรวม" text="KPI และกราฟแนวเดียวกับ SSOP" />
          <Hint title="เจาะรายละเอียด" text="ตารางแยกหน่วย / ช่วงเวลา / สถานะ" />
        </div>
      </section>
    </ReportModuleShell>
  );
}

function Hint({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-[#d8e0e5] bg-[#fafbfc] px-4 py-3">
      <p className="text-sm font-semibold text-[#0b3d4a]">{title}</p>
      <p className="text-xs text-[#5c6b73] mt-1 leading-relaxed">{text}</p>
    </div>
  );
}
