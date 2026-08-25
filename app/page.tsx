'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthVerificationFacilitiesChart from './components/AuthVerificationFacilitiesChart';

interface AllocationUser {
  id: number;
  username: string;
  hospital_name?: string;
}

const NAV_ITEMS = [
  {
    href: '/allocation-check',
    label: 'ตรวจสอบจัดสรรเงิน',
    icon: '/id.png',
    className: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600',
  },
  {
    href: '/hospcode-check',
    label: 'ตรวจสอบการส่งข้อมูล',
    icon: '/pay.png',
    className: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700',
  },
  {
    href: '/login',
    label: 'อัพโหลด / Dashboard',
    icon: '/dash.png',
    className: 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800',
  },
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังเข้าสู่ระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:h-16 gap-2 py-3 lg:py-0">
            <div className="flex items-center gap-3 min-w-0 shrink-0">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-lg">SSO</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  ระบบจัดสรรเงินประกันสังคมจังหวัดชัยภูมิ
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Social Security Office</p>
              </div>
            </div>

            <nav className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-all shadow-sm ${item.className}`}
                >
                  <Image src={item.icon} alt="" width={18} height={18} className="object-contain shrink-0" />
                  <span className="hidden md:inline">{item.label}</span>
                  <span className="md:hidden">{item.label.split(' ')[0]}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuthVerificationFacilitiesChart
          highlightHcode={allocationUser?.username}
          title="สถิติการยืนยันตัวตนแต่ละ รพสต."
          subtitle={
            allocationUser
              ? 'กราฟ 3 แท่งต่อหน่วยบริการ · ทั้งหมด · เอาบัตรมา · ไม่มีบัตร · รพสต. ของคุณจะถูกไฮไลต์'
              : 'กราฟ 3 แท่งต่อหน่วยบริการ · ทั้งหมด · เอาบัตรมา · ไม่มีบัตร'
          }
        />

        <footer className="text-center mt-12">
          <p className="text-gray-600 text-sm">&copy; 2025 ระบบจัดการข้อมูล SSO. สงวนลิขสิทธิ์.</p>
        </footer>
      </main>
    </div>
  );
}
