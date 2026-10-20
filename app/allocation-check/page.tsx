'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AllocationCheckLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/hospcode-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (data.success && data.user) {
        // เก็บข้อมูล authentication
        localStorage.setItem('allocation_check_auth', 'true');
        localStorage.setItem('allocation_check_user', JSON.stringify(data.user));
        
        // redirect ไปหน้าข้อมูลสิทธิ์
        router.push('/allocation-check/data');
      } else {
        setError(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-shell">
      {/* Header */}
      <header className="bg-[#0b3d4a] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-[#1a7a6d] rounded-md flex items-center justify-center mr-3">
                <span className="text-white text-xs font-semibold tracking-[0.12em]" style={{ fontFamily: 'var(--font-ibm-plex)' }}>SSO</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">ตรวจสอบข้อมูลการจัดสรรเงิน</h1>
                <p className="text-sm text-white/70">Budget Allocation Check System</p>
              </div>
            </div>
            <Link
              href="/"
              className="bg-white/10 hover:bg-white/15 border border-white/15 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
            >
              หน้าหลัก
            </Link>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <div className="flex items-center justify-center p-4 py-20">
        <div className="max-w-md w-full">
          <div className="app-card p-8 shadow-sm">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-[#1a7a6d] rounded-md flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-sm font-semibold tracking-[0.14em]" style={{ fontFamily: 'var(--font-ibm-plex)' }}>SSO</span>
              </div>
              <h1 className="text-2xl font-semibold text-[#0b3d4a] mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>เข้าสู่ระบบ</h1>
              <p className="text-[#5c6b73] text-sm">ตรวจสอบข้อมูลการจัดสรรเงิน</p>
              <p className="text-sm text-[#5c6b73] mt-1">สำหรับเจ้าหน้าที่ข้อมูลสิทธิ์</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-bold text-gray-700 mb-2">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    ชื่อผู้ใช้
                  </span>
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-[#1a7a6d] transition-colors"
                  placeholder="กรอกชื่อผู้ใช้"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    รหัสผ่าน
                  </span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-[#1a7a6d] transition-colors"
                  placeholder="กรอกรหัสผ่าน"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#1a7a6d] to-[#0b3d4a] text-white py-4 rounded-lg hover:from-[#15685d] hover:to-[#072a33] focus:ring-4 focus:ring-[#7dcdc0] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg transform hover:scale-105"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  'เข้าสู่ระบบ'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ยังไม่มีบัญชี?{' '}
                <Link href="/allocation-register" className="text-[#1a7a6d] hover:text-[#0b3d4a] font-semibold">
                  สมัครสมาชิก
                </Link>
              </p>
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-[#e8f4f2] border border-[#d8e0e5] rounded-xl p-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-[#1a7a6d] mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-bold text-[#0b3d4a] mb-1">ข้อมูลสำคัญ</h3>
                <p className="text-sm text-[#5c6b73]">
                  ระบบนี้สำหรับเจ้าหน้าที่ตรวจสอบข้อมูลการจัดสรรเงินและข้อมูลสิทธิ์ของผู้ป่วย
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






