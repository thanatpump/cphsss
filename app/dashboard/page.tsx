'use client';

import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthenStmmMatchPanel from '../components/AuthenStmmMatchPanel';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TableData {
  rows: any[];
  pagination: PaginationInfo;
}

interface SummaryData {
  month: string;
  patient_count: number;
}

interface HospitalStats {
  signstmm: number;
  signstms: number;
  sognstmm: number;
  sognstmp: number;
}

export default function DashboardPage() {
  const { username, hospcode, logout } = useAuth();
  const router = useRouter();
  const [hosname, setHosname] = useState<string>('');
  const [hospitalStats, setHospitalStats] = useState<HospitalStats>({ signstmm: 0, signstms: 0, sognstmm: 0, sognstmp: 0 });
  const [monthlySummary, setMonthlySummary] = useState<SummaryData[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [todayUsageCount, setTodayUsageCount] = useState<number>(0);
  const [todayLoading, setTodayLoading] = useState(true);

  // State สำหรับแต่ละตาราง
  const [signstmm, setSignstmm] = useState<TableData>({ rows: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } });
  const [signstms, setSignstms] = useState<TableData>({ rows: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } });
  const [sognstmm, setSognstmm] = useState<TableData>({ rows: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } });
  const [sognstmp, setSognstmp] = useState<TableData>({ rows: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);

  // ดึงชื่อโรงพยาบาลและข้อมูลสรุป
  useEffect(() => {
    if (username && hospcode) {
      fetchHosname();
      fetchSummaryData();
      fetchHospitalStats();
      fetchTodayUsageCount();
    }
  }, [username, hospcode]);

  // ดึงข้อมูลแต่ละตาราง
  useEffect(() => {
    if (username && hospcode) {
      fetchAllTables(1, 1, 1, 1);
    }
    // eslint-disable-next-line
  }, [username, hospcode]);

  // ดึงข้อมูลสรุปรายเดือน
  const fetchSummaryData = async () => {
    if (!hospcode) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/data-signstmm?hproc=${hospcode}&summary=1`);
      const data = await res.json();
      if (res.ok && data.summary) {
        setMonthlySummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  // ดึงสถิติโรงพยาบาล
  const fetchHospitalStats = async () => {
    if (!username) return;
    try {
      const res = await fetch(`/api/hospital-data?user_sks=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (res.ok) {
        setHospitalStats(data);
      }
    } catch (error) {
      console.error('Error fetching hospital stats:', error);
    }
  };

  // ดึงจำนวนคนที่มาใช้บริการในวันนี้
  const fetchTodayUsageCount = async () => {
    if (!username) return;
    setTodayLoading(true);
    try {
      const res = await fetch(`/api/authen-code/today-count?user_sks=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTodayUsageCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching today usage count:', error);
      setTodayUsageCount(0);
    } finally {
      setTodayLoading(false);
    }
  };

  // ฟังก์ชันดึงข้อมูลแต่ละตาราง
  const fetchAllTables = async (
    pageStmm: number,
    pageStms: number,
    pageOmm: number,
    pageOmp: number
  ) => {
    setLoading(true);
    await Promise.all([
      fetchTableData('signstmm', pageStmm),
      fetchTableData('signstms', pageStms),
      fetchTableData('sognstmm', pageOmm),
      fetchTableData('sognstmp', pageOmp),
    ]);
    setLoading(false);
  };

  const fetchTableData = async (type: 'signstmm' | 'signstms' | 'sognstmm' | 'sognstmp', page: number) => {
    if (!hospcode) return;
    let api = '';
    if (type === 'signstmm') api = '/api/data-signstmm';
    if (type === 'signstms') api = '/api/data-signstms';
    if (type === 'sognstmm') api = '/api/data-sognstmm';
    if (type === 'sognstmp') api = '/api/data-sognstmp';
    const res = await fetch(`${api}?hproc=${encodeURIComponent(hospcode)}&page=${page}&limit=10`);
    const data = await res.json();
    if (res.ok) {
      const tableData: TableData = {
        rows: data.data,
        pagination: data.pagination,
      };
      if (type === 'signstmm') setSignstmm(tableData);
      if (type === 'signstms') setSignstms(tableData);
      if (type === 'sognstmm') setSognstmm(tableData);
      if (type === 'sognstmp') setSognstmp(tableData);
    }
  };

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

  // ฟังก์ชันแสดงตารางแบบ dynamic columns
  const renderTable = (
    title: string,
    table: TableData,
    onPageChange: (page: number) => void
  ) => {
    // สร้าง columns อัตโนมัติจาก key ของ row แรก
    const columns = table.rows.length > 0 ? Object.keys(table.rows[0]) : [];
  return (
      <div className="mb-12 bg-white rounded-2xl shadow-xl overflow-hidden border-t-8 border-blue-400">
        <div className="bg-gradient-to-r from-[#1a7a6d] to-[#0b3d4a] px-6 py-4 flex items-center">
          <h2 className="text-2xl font-bold text-white tracking-wide flex-1 drop-shadow">{title}</h2>
          <span className="text-white/80 text-sm font-semibold">{table.rows.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#e8f4f2] to-[#d5ebe7]">
                {columns.map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-bold text-[#0b3d4a] uppercase tracking-wider border-b">{col}</th>
                ))}
                  </tr>
                </thead>
            <tbody className="bg-white divide-y divide-blue-100">
              {table.rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center py-8 text-[#5c6b73]">ไม่มีข้อมูล</td></tr>
              ) : (
                table.rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-[#e8f4f2] transition-colors">
                    {columns.map(col => (
                      <td key={col} className="px-4 py-3 text-gray-900 border-b max-w-xs truncate" title={row[col]?.toString() || "-"}>
                        {row[col]?.toString() || "-"}
                    </td>
                    ))}
                  </tr>
                ))
              )}
                </tbody>
              </table>
            </div>
        {renderPagination(table.pagination, onPageChange)}
          </div>
    );
  };

  // ฟังก์ชัน pagination (ตกแต่งใหม่)
  const renderPagination = (pagination: PaginationInfo, onPageChange: (page: number) => void) => (
    <div className="flex justify-center items-center gap-2 mt-4 pb-4">
      <button
        className="px-4 py-2 rounded-lg bg-[#e8f4f2] text-[#0b3d4a] font-semibold hover:bg-[#d4ebe7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow"
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={pagination.page === 1}
      >
        ก่อนหน้า
      </button>
      <span className="mx-2 text-[#0b3d4a] font-bold text-lg">หน้า {pagination.page} / {pagination.totalPages}</span>
      <button
        className="px-4 py-2 rounded-lg bg-[#e8f4f2] text-[#0b3d4a] font-semibold hover:bg-[#d4ebe7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow"
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={pagination.page === pagination.totalPages}
                >
        ถัดไป
      </button>
              </div>
  );

  // ฟังก์ชันแสดงสถิติ
  const renderStatsCard = (title: string, value: number, icon: string, color: string) => (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-t-4 ${color} hover:shadow-xl transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value.toLocaleString()}</p>
        </div>
        <div className={`${color} bg-opacity-10 rounded-full p-4`}>
          <span className="text-3xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  // ฟังก์ชันแสดงกราฟสรุปรายเดือน (Bar Chart)
  const renderMonthlySummary = () => {
    if (summaryLoading) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-center text-[#1a7a6d] animate-pulse">กำลังโหลดข้อมูลสรุป...</div>
        </div>
      );
    }

    if (monthlySummary.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-[#0b3d4a] mb-4">สรุปจำนวนผู้ป่วยรายเดือน (SIGNSTMM)</h3>
          <div className="text-center text-gray-500 py-8">ไม่มีข้อมูล</div>
        </div>
      );
    }

    const maxCount = Math.max(...monthlySummary.map(s => s.patient_count), 1);
    const displayData = monthlySummary.slice(0, 12).reverse();

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-[#1a7a6d]">
        <h3 className="text-xl font-bold text-[#0b3d4a] mb-6">สรุปจำนวนผู้ป่วยรายเดือน (SIGNSTMM)</h3>
        <div className="space-y-4">
          {displayData.map((item, idx) => {
            const [year, month] = item.month.split('-');
            const thMonths = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
            const percentage = (item.patient_count / maxCount) * 100;
            
            return (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-24 text-sm font-semibold text-gray-700">
                  {thMonths[parseInt(month, 10)]} {year.slice(-2)}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden relative">
                  <div 
                    className="bg-gradient-to-r from-[#0b3d4a] to-[#072a33] h-full flex items-center justify-end pr-3 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="text-white text-xs font-bold">{item.patient_count.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ฟังก์ชันแสดงกราฟเปรียบเทียบข้อมูล (Bar Chart แนวนอน)
  const renderComparisonChart = () => {
    const stats = [
      { name: 'ผู้ป่วยใน', value: hospitalStats.signstmm, color: 'bg-[#1a7a6d]' },
      { name: 'ผู้ป่วยในสรุป', value: hospitalStats.signstms, color: 'bg-green-500' },
      { name: 'ผู้ป่วยนอก', value: hospitalStats.sognstmm, color: 'bg-[#15685d]' },
      { name: 'ผู้ป่วยนอกพิเศษ', value: hospitalStats.sognstmp, color: 'bg-orange-500' },
    ];
    
    const maxValue = Math.max(...stats.map(s => s.value), 1);

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-[#1a7a6d]">
        <h3 className="text-xl font-bold text-[#0b3d4a] mb-6">เปรียบเทียบจำนวนผู้ป่วย</h3>
        <div className="space-y-4">
          {stats.map((stat, idx) => {
            const percentage = (stat.value / maxValue) * 100;
            return (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">{stat.name}</span>
                  <span className="text-lg font-bold text-gray-900">{stat.value.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div 
                    className={`${stat.color} h-full flex items-center justify-end pr-3 transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="text-white text-xs font-bold">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ฟังก์ชันแสดงกราฟแบบ Line Chart (จำลองด้วย SVG)
  const renderLineChart = () => {
    if (summaryLoading || monthlySummary.length === 0) {
      return null;
    }

    const displayData = monthlySummary.slice(0, 12).reverse();
    const maxCount = Math.max(...displayData.map(s => s.patient_count), 1);
    const width = 600;
    const height = 300;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // สร้างจุดสำหรับ line chart
    const points = displayData.map((item, idx) => {
      const x = padding + (idx / (displayData.length - 1 || 1)) * chartWidth;
      const y = padding + chartHeight - (item.patient_count / maxCount) * chartHeight;
      return { x, y, value: item.patient_count };
    });

    // สร้าง path สำหรับ line
    const pathData = points.map((point, idx) => 
      `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-[#1a7a6d]">
        <h3 className="text-xl font-bold text-[#0b3d4a] mb-6">แนวโน้มจำนวนผู้ป่วยรายเดือน</h3>
        <div className="overflow-x-auto">
          <svg width={width} height={height} className="mx-auto">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + chartHeight - (ratio * chartHeight);
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            })}
            
            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Points */}
            {points.map((point, idx) => (
              <g key={idx}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#6366f1"
                  className="hover:r-7 transition-all"
                />
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  className="text-xs fill-gray-600 font-semibold"
                >
                  {point.value}
                </text>
              </g>
            ))}
            
            {/* X-axis labels */}
            {displayData.map((item, idx) => {
              const [year, month] = item.month.split('-');
              const thMonths = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
              const x = padding + (idx / (displayData.length - 1 || 1)) * chartWidth;
              return (
                <text
                  key={idx}
                  x={x}
                  y={height - padding + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {thMonths[parseInt(month, 10)]}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen app-shell relative pb-10 font-sans">
      <header className="bg-[#0b3d4a] border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 shrink-0 rounded-md bg-[#1a7a6d] flex items-center justify-center">
                <span className="text-white text-sm font-semibold tracking-[0.14em]" style={{ fontFamily: 'var(--font-ibm-plex)' }}>SSO</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                  ระบบจัดสรรเงินประกันสังคมจังหวัดชัยภูมิ
                </h1>
                <div className="text-white/70 text-sm">
                  ยินดีต้อนรับ {hosname ? `: ${hosname}` : ''} {hospcode ? `(รหัส: ${hospcode})` : ''}
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Link href="/upload">
                    <button className="bg-[#1a7a6d] hover:bg-[#15685d] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
                      อัปโหลดข้อมูลกลาง
                    </button>
                  </Link>
                  <Link href="/hospcode-check">
                    <button className="bg-white/10 hover:bg-white/15 border border-white/15 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
                      ตรวจสอบข้อมูล
                    </button>
                  </Link>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="bg-white/10 hover:bg-white/15 border border-white/15 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>
      
      <div className="relative z-[1] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {renderStatsCard('ผู้มาใช้บริการวันนี้', todayLoading ? 0 : todayUsageCount, '👤', 'border-[#1a7a6d]')}
          {renderStatsCard('ผู้ป่วยใน (SIGNSTMM)', hospitalStats.signstmm, '🏥', 'border-[#1a7a6d]')}
          {renderStatsCard('ผู้ป่วยในสรุป (SIGNSTMS)', hospitalStats.signstms, '📋', 'border-green-500')}
          {renderStatsCard('ผู้ป่วยนอก (SOGNSTMM)', hospitalStats.sognstmm, '👥', 'border-[#1a7a6d]')}
          {renderStatsCard('ผู้ป่วยนอกพิเศษ (SOGNSTMP)', hospitalStats.sognstmp, '⭐', 'border-orange-500')}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Summary Bar Chart */}
          <div>
            {renderMonthlySummary()}
          </div>
          
          {/* Comparison Chart */}
          <div>
            {renderComparisonChart()}
          </div>
        </div>

        {/* Line Chart */}
        <div className="mb-8">
          {renderLineChart()}
        </div>

        {/* Authen vs STMM */}
        {username && (
          <div className="mb-8">
            <AuthenStmmMatchPanel
              auth={{ userSks: username }}
              title={`เทียบ Authen กับ STMM${hosname ? ` · ${hosname}` : ''}`}
            />
          </div>
        )}

        {/* Data Tables */}
        {loading ? (
          <div className="text-center text-[#1a7a6d] text-xl animate-pulse py-12">กำลังโหลดข้อมูล...</div>
        ) : (
          <>
            {renderTable('SIGNSTMM (ผู้ป่วยใน)', signstmm, (page) => fetchTableData('signstmm', page))}
            {renderTable('SIGNSTMS (ผู้ป่วยในสรุป)', signstms, (page) => fetchTableData('signstms', page))}
            {renderTable('SOGNSTMM (ผู้ป่วยนอก)', sognstmm, (page) => fetchTableData('sognstmm', page))}
            {renderTable('SOGNSTMP (ผู้ป่วยนอกพิเศษ)', sognstmp, (page) => fetchTableData('sognstmp', page))}
          </>
        )}
      </div>
    </div>
  );
} 