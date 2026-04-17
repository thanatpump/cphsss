'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DbStats {
  signstmm: number;
  signstms: number;
  sognstmm: number;
  sognstmp: number;
  total: number;
}

export default function DbInfo() {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/db-info');
      const result = await response.json();
      
      if (response.ok) {
        setStats(result);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับหน้าหลัก
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            สถิติฐานข้อมูล
          </h1>
          <p className="text-gray-600">
            ข้อมูลสถิติของฐานข้อมูล SSO
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-gray-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังโหลดข้อมูล...
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={fetchStats} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ลองใหม่
            </button>
          </div>
        ) : stats ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* SIGNSTMM */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">S</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">SIGNSTMM</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.signstmm.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link 
                    href="/data-signstmm"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    ดูข้อมูล →
                  </Link>
                </div>
              </div>

              {/* SIGNSTMS */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">S</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">SIGNSTMS</p>
                    <p className="text-2xl font-bold text-green-600">{stats.signstms.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link 
                    href="/data-signstms"
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    ดูข้อมูล →
                  </Link>
                </div>
              </div>

              {/* SOGNSTMM */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">O</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">SOGNSTMM</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.sognstmm.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link 
                    href="/data-sognstmm"
                    className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                  >
                    ดูข้อมูล →
                  </Link>
                </div>
              </div>

              {/* SOGNSTMP */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-lg">P</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">SOGNSTMP</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.sognstmp.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link 
                    href="/data-sognstmp"
                    className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                  >
                    ดูข้อมูล →
                  </Link>
                </div>
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">สรุปข้อมูลทั้งหมด</h2>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {stats.total.toLocaleString()}
                </div>
                <p className="text-gray-600">รายการทั้งหมดในฐานข้อมูล</p>
              </div>
            </div>

            {/* Database Info */}
            <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูลฐานข้อมูล</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p><strong>ประเภทข้อมูล:</strong></p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>SIGNSTMM - ข้อมูลการชำระเงินผู้ป่วยใน</li>
                    <li>SIGNSTMS - ข้อมูลการชำระเงินผู้ป่วยใน (สรุป)</li>
                    <li>SOGNSTMM - ข้อมูลการชำระเงินผู้ป่วยนอก</li>
                    <li>SOGNSTMP - ข้อมูลการชำระเงินผู้ป่วยนอก (พิเศษ)</li>
                  </ul>
                </div>
                <div>
                  <p><strong>คุณสมบัติ:</strong></p>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    <li>รองรับไฟล์ XML</li>
                    <li>การจัดการข้อมูลแบบ Real-time</li>
                    <li>ระบบ Pagination</li>
                    <li>การแสดงผลแบบ Responsive</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
} 