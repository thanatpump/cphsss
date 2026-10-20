'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthVerificationFacilitiesChart from './components/AuthVerificationFacilitiesChart';

interface AllocationUser {
  id: number;
  username: string;
  hospital_name?: string;
}

const NAV_ITEMS = [
  { href: '/allocation-check', label: 'ตรวจสอบจัดสรรเงิน', shortLabel: 'จัดสรร' },
  { href: '/hospcode-check', label: 'ตรวจสอบการส่งข้อมูล', shortLabel: 'ส่งข้อมูล' },
  { href: '/login', label: 'อัปโหลด / Dashboard', shortLabel: 'Dashboard' },
] as const;

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [allocationUser, setAllocationUser] = useState<AllocationUser | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem('allocation_check_auth');
    const storedUser = localStorage.getItem('allocation_check_user');
    if (auth === 'true' && storedUser) {
      try {
        setAllocationUser(JSON.parse(storedUser));
      } catch {
        setAllocationUser(null);
      }
    }
  }, []);

  if (isAuthenticated) {
    window.location.href = '/dashboard';
    return (
      <div className="min-h-screen home-shell flex items-center justify-center">
        <div className="text-center home-fade">
          <div className="mx-auto mb-4 h-10 w-10 border-2 border-[#0b3d4a] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#5c6b73] font-[family-name:var(--font-sarabun)]">กำลังเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-shell relative">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b3d4a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 py-3 lg:py-0 lg:h-[4.25rem]">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 shrink-0 rounded-md bg-[#1a7a6d] flex items-center justify-center">
                <span
                  className="text-white text-sm font-semibold tracking-[0.14em]"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  SSO
                </span>
              </div>
              <div className="min-w-0">
                <p
                  className="text-[11px] uppercase tracking-[0.18em] text-white/55"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  Social Security Office · Chaiyaphum
                </p>
                <h1
                  className="text-base sm:text-lg font-semibold text-white truncate leading-tight"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  ระบบจัดสรรเงินประกันสังคมจังหวัดชัยภูมิ
                </h1>
              </div>
            </div>

            <nav className="flex items-center gap-1 overflow-x-auto pb-0.5 lg:pb-0 -mx-1 px-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative shrink-0 px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors whitespace-nowrap"
                  style={{ fontFamily: 'var(--font-sarabun)' }}
                >
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">{item.shortLabel}</span>
                  <span className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-px scale-x-0 bg-[#7dcdc0] transition-transform duration-200 group-hover:scale-x-100" />
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-[1] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <section className="home-rise mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#d8e0e5] pb-5">
            <div>
              <p
                className="text-xs font-medium tracking-[0.16em] uppercase text-[#1a7a6d] mb-2"
                style={{ fontFamily: 'var(--font-ibm-plex)' }}
              >
                ศูนย์ข้อมูล · Dashboard
              </p>
              <h2
                className="text-2xl sm:text-3xl font-semibold text-[#0b3d4a] tracking-tight"
                style={{ fontFamily: 'var(--font-ibm-plex)' }}
              >
                สถิติการยืนยันตัวตน
              </h2>
              <p className="mt-2 text-sm text-[#5c6b73] max-w-2xl leading-relaxed">
                ภาพรวมการยืนยันตัวตนของหน่วยบริการในจังหวัดชัยภูมิ
                {allocationUser
                  ? ` · ไฮไลต์หน่วยของคุณ (${allocationUser.username})`
                  : ''}
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-[#5c6b73] space-y-1">
              <p>ข้อมูลจากระบบ authen_code</p>
              <p>อัปเดตตามช่วงวันที่ที่เลือก</p>
            </div>
          </div>
        </section>

        <section className="home-rise-delay">
          <AuthVerificationFacilitiesChart
            highlightHcode={allocationUser?.username}
            title="สถิติการยืนยันตัวตนแต่ละหน่วยบริการ"
            subtitle="ทั้งหมด · ยืนยันตัวตน · ไม่ได้ยืนยันตัวตน"
          />
        </section>

        <footer className="mt-12 pt-6 border-t border-[#d8e0e5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-[#5c6b73]">
          <p>สำนักงานประกันสังคมจังหวัดชัยภูมิ</p>
          <p>© {new Date().getFullYear()} ระบบจัดการข้อมูล SSO</p>
        </footer>
      </main>
    </div>
  );
}
