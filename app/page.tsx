'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from './contexts/AuthContext';

export default function Home() {  
  const { isAuthenticated } = useAuth();

  // ถ้า login แล้ว ให้ redirect ไปหน้า dashboard
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - อยู่บนซ้าย */}
        <header className="mb-12">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
              <span className="text-white font-bold text-2xl">SSO</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ระบบจัดสรรเงินประกันสังคมจังหวัดชัยภูมิ</h1>
              <p className="text-sm text-gray-600">Social Security Office</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* ปุ่มซ้าย: ตรวจสอบข้อมูลการจัดสรรเงิน */}
          <Link
            href="/allocation-check"
            className="group relative bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-12 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
          >
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-opacity-30 transition-all">
                <Image src="/id.png" alt="ตรวจสอบข้อมูลการจัดสรรเงิน" width={48} height={48} className="object-contain" />
              </div>
              <h2 className="text-3xl font-bold mb-4">ตรวจสอบข้อมูลการจัดสรรเงิน</h2>
              <p className="text-lg text-white text-opacity-90">อ่านบัตรประชาชนและตรวจสอบสิทธิ์การรักษาแบบ Real-time</p>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </Link>

          {/* ปุ่มขวา: ตรวจสอบการส่งข้อมูล */}
          <Link
            href="/hospcode-check"
            className="group relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-12 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
          >
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-opacity-30 transition-all">
                <Image src="/pay.png" alt="ตรวจสอบการส่งข้อมูล" width={48} height={48} className="object-contain" />
              </div>
              <h2 className="text-3xl font-bold mb-4">ตรวจสอบการส่งข้อมูล</h2>
              <p className="text-lg text-white text-opacity-90">ตรวจสอบสถานะการส่งข้อมูลของโรงพยาบาล</p>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </Link>

          {/* ปุ่ม: Dashboard */}
          <Link
            href="/login"
            className="group relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-12 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2"
          >
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-opacity-30 transition-all">
                <Image src="/dash.png" alt="Dashboard" width={48} height={48} className="object-contain" />
              </div>
              <h2 className="text-3xl font-bold mb-4">อัพโหลดข้อมูลและ dashboard</h2>
              <p className="text-lg text-white text-opacity-90">เข้าสู่ระบบด้วยรหัสหน่วยบริการเพื่อดูข้อมูลของโรงพยาบาลของคุณ</p>
            </div>
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12">
          <p className="text-gray-600 text-sm">&copy; 2025 ระบบจัดการข้อมูล SSO. สงวนลิขสิทธิ์.</p>
        </footer>
      </div>
    </div>
  );
}
