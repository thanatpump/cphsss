'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AllocationData {
  id: number;
  hospital_code: string;
  hospital_name: string;
  period: string;
  stmno: string;
  total_amount: number;
  total_cases: number;
  avg_amount: number;
  data_type: string; // SIGNSTMM, SIGNSTMS, SOGNSTMM, SOGNSTMP
  created_at: string;
}

interface SummaryStats {
  total_allocation: number;
  total_cases: number;
  total_hospitals: number;
  avg_per_case: number;
  by_type: {
    [key: string]: {
      amount: number;
      cases: number;
    };
  };
}

export default function BudgetAllocationPage() {
  const [allocations, setAllocations] = useState<AllocationData[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ดึงข้อมูลจาก API
  useEffect(() => {
    // TODO: ดึงข้อมูลจาก API จริง
    setLoading(false);
  }, []);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatNumberShort = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)} ล้าน`;
    }
    return formatNumber(num);
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'SIGNSTMM': 'bg-blue-100 text-blue-800 border-blue-300',
      'SIGNSTMS': 'bg-green-100 text-green-800 border-green-300',
      'SOGNSTMM': 'bg-purple-100 text-purple-800 border-purple-300',
      'SOGNSTMP': 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getTypeName = (type: string) => {
    const names: { [key: string]: string } = {
      'SIGNSTMM': 'ผู้ป่วยใน',
      'SIGNSTMS': 'ผู้ป่วยในสรุป',
      'SOGNSTMM': 'ผู้ป่วยนอก',
      'SOGNSTMP': 'ผู้ป่วยนอกพิเศษ',
    };
    return names[type] || type;
  };

  // Filter data
  const filteredData = allocations.filter(item => {
    const matchType = selectedType === 'all' || item.data_type === selectedType;
    const matchSearch = searchTerm === '' || 
      item.hospital_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.hospital_code.includes(searchTerm);
    const matchPeriod = selectedPeriod === '' || item.period === selectedPeriod;
    
    return matchType && matchSearch && matchPeriod;
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Get unique periods
  const periods = Array.from(new Set(allocations.map(item => item.period))).sort().reverse();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-xl text-gray-700 font-semibold">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-10">
      {/* Header */}
      <div className="bg-white shadow-lg border-b-4 border-blue-600 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-6 gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                ตรวจสอบข้อมูลการจัดสรรเงิน
              </h1>
              <p className="text-gray-600 mt-2 text-lg">ระบบประกันสังคมจังหวัดชัยภูมิ</p>
            </div>
            <Link href="/dashboard">
              <button className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-bold hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg transform hover:scale-105">
                ← กลับหน้าหลัก
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-semibold mb-1">งบประมาณรวม</p>
                  <p className="text-3xl font-bold">{formatNumberShort(summary.total_allocation)}</p>
                  <p className="text-blue-100 text-xs mt-1">บาท</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-semibold mb-1">จำนวนรายการ</p>
                  <p className="text-3xl font-bold">{formatNumber(summary.total_cases)}</p>
                  <p className="text-green-100 text-xs mt-1">ราย</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-semibold mb-1">โรงพยาบาล</p>
                  <p className="text-3xl font-bold">{summary.total_hospitals}</p>
                  <p className="text-purple-100 text-xs mt-1">แห่ง</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-transform">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-semibold mb-1">เฉลี่ยต่อราย</p>
                  <p className="text-3xl font-bold">{formatNumber(summary.avg_per_case)}</p>
                  <p className="text-orange-100 text-xs mt-1">บาท</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-full p-4">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Type Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Object.entries(summary.by_type).map(([type, data]) => (
              <div key={type} className={`${getTypeColor(type)} rounded-xl shadow-md p-5 border-2`}>
                <h3 className="font-bold text-lg mb-2">{getTypeName(type)}</h3>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-semibold">งบประมาณ:</span> {formatNumberShort(data.amount)} บาท
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">จำนวน:</span> {formatNumber(data.cases)} ราย
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">เฉลี่ย:</span> {formatNumber(data.amount / data.cases)} บาท
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border-t-4 border-blue-500">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            ตัวกรองข้อมูล
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ประเภทข้อมูล</label>
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">ทั้งหมด</option>
                <option value="SIGNSTMM">ผู้ป่วยใน (SIGNSTMM)</option>
                <option value="SIGNSTMS">ผู้ป่วยในสรุป (SIGNSTMS)</option>
                <option value="SOGNSTMM">ผู้ป่วยนอก (SOGNSTMM)</option>
                <option value="SOGNSTMP">ผู้ป่วยนอกพิเศษ (SOGNSTMP)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">งวด</label>
              <select
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">ทั้งหมด</option>
                {periods.map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">ค้นหา (ชื่อหรือรหัสโรงพยาบาล)</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="พิมพ์ชื่อหรือรหัสโรงพยาบาล..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {(selectedType !== 'all' || selectedPeriod !== '' || searchTerm !== '') && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setSelectedType('all');
                  setSelectedPeriod('');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors font-semibold shadow"
              >
                ล้างตัวกรอง
              </button>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-t-4 border-purple-500">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white">
              รายการจัดสรรเงิน ({filteredData.length} รายการ)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ลำดับ</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">รหัส-โรงพยาบาล</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ประเภท</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">งวด</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">เลขที่ STM</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">จำนวนราย</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">เฉลี่ยต่อราย</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">งบประมาณรวม</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-xl font-semibold">ไม่พบข้อมูล</p>
                    </td>
                  </tr>
                ) : (
                  currentData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-purple-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{item.hospital_code}</div>
                        <div className="text-sm text-gray-600">{item.hospital_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border-2 ${getTypeColor(item.data_type)}`}>
                          {getTypeName(item.data_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {item.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {item.stmno}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-700">
                        {formatNumber(item.total_cases)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-700">
                        {formatNumber(item.avg_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-700">
                        {formatNumber(item.total_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {currentData.length > 0 && (
                <tfoot className="bg-gradient-to-r from-purple-100 to-purple-200">
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-right text-sm font-bold text-gray-800">
                      รวมทั้งหมด ({filteredData.length} รายการ):
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-green-700">
                      {formatNumber(filteredData.reduce((sum, item) => sum + item.total_cases, 0))}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-blue-700">
                      {formatNumber(
                        filteredData.reduce((sum, item) => sum + item.total_amount, 0) /
                        filteredData.reduce((sum, item) => sum + item.total_cases, 0)
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-purple-700">
                      {formatNumber(filteredData.reduce((sum, item) => sum + item.total_amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    แสดง <span className="font-semibold">{startIndex + 1}</span> ถึง{' '}
                    <span className="font-semibold">{Math.min(endIndex, filteredData.length)}</span> จาก{' '}
                    <span className="font-semibold">{filteredData.length}</span> รายการ
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      หน้าแรก
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ก่อนหน้า
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      หน้า {currentPage} จาก {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ถัดไป
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      หน้าสุดท้าย
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Button */}
        <div className="mt-8 flex justify-center gap-4">
          <button 
            onClick={() => alert('ฟีเจอร์ Export Excel กำลังพัฒนา')}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-lg transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            ส่งออก Excel
          </button>
          <button 
            onClick={() => alert('ฟีเจอร์ Export PDF กำลังพัฒนา')}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
            </svg>
            ส่งออก PDF
          </button>
        </div>
      </div>
    </div>
  );
}

