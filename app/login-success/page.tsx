'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';

export default function LoginSuccessPage() {
  const { username, hospcode, isAuthenticated } = useAuth();
  const [hosname, setHosname] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // ถ้ายังไม่ได้ login ให้ redirect ไปหน้า login
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // ดึงชื่อโรงพยาบาล
    if (username) {
      fetchHosname();
    }
  }, [isAuthenticated, username, router]);

  const fetchHosname = async () => {
    try {
      const res = await fetch(`/api/login-sks-name?user_sks=${encodeURIComponent(username || '')}`);
      const data = await res.json();
      if (res.ok && data.hosname) {
        setHosname(data.hosname);
      } else {
        setHosname('');
      }
    } catch (error) {
      setHosname('');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="app-shell relative min-h-screen flex items-center justify-center p-4">
      <div className="relative z-[1] max-w-2xl w-full">
        <div className="app-card p-8 shadow-sm">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#1a7a6d] rounded-md flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1
              className="text-2xl font-semibold text-[#0b3d4a] mb-2"
              style={{ fontFamily: 'var(--font-ibm-plex)' }}
            >
              เข้าสู่ระบบสำเร็จ
            </h1>
            <p className="text-[#5c6b73] text-sm">ยินดีต้อนรับเข้าสู่ระบบ</p>
          </div>

          {/* User Info */}
          <div className="bg-[#e8f4f2] rounded-lg p-6 mb-6 border border-[#d8e0e5]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#1a7a6d]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-600">ชื่อผู้ใช้</p>
                  <p className="text-lg font-semibold text-gray-900">{username}</p>
                </div>
              </div>
              
              {hosname && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#1a7a6d]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600">สถานพยาบาล</p>
                    <p className="text-lg font-semibold text-gray-900">{hosname}</p>
                  </div>
                </div>
              )}
              
              {hospcode && (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-[#1a7a6d]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600">รหัสสถานพยาบาล</p>
                    <p className="text-lg font-semibold text-gray-900">{hospcode}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Link href="/dashboard" className="block">
              <button className="app-btn-primary w-full py-4 rounded-md font-semibold text-lg">
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  ไปยัง Dashboard
                </div>
              </button>
            </Link>

            <Link href="/allocation-check" className="block">
              <button className="w-full bg-[#0b3d4a] hover:bg-[#072a33] text-white py-4 rounded-md font-semibold text-lg transition-colors">
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ตรวจสอบสิทธิ์การรักษา
                </div>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
