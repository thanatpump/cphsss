'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ReportView = 'daily' | 'range';

interface ReportRow {
  hospital_name: string;
  service_count: number;
}

interface Recipient {
  citizen_id: string;
  date: string;
  time: string;
  auth_type: string | null;
  authen: string;
  vstdate: string | null;
  has_proof_image: boolean;
}

interface RecipientModalState {
  hospital_name: string;
  start: string;
  end: string;
  periodLabel: string;
}

export default function AdminReportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ReportView>('daily');
  const [reportLoading, setReportLoading] = useState(false);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [report, setReport] = useState<ReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeReport, setRangeReport] = useState<ReportRow[]>([]);
  const [rangeTotal, setRangeTotal] = useState(0);
  const [rangeLabel, setRangeLabel] = useState('');
  const rangeLoadedRef = useRef(false);
  const [recipientModal, setRecipientModal] = useState<RecipientModalState | null>(null);

  const getTodayIso = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const getMonthStartIso = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const formatThaiDate = (isoDate: string) => {
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    return new Date(y, m - 1, d).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatThaiDateShort = (isoDate: string) => {
    const [y, m, d] = isoDate.split('-').map(Number);
    if (!y || !m || !d) return isoDate;
    return new Date(y, m - 1, d).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const fetchDailyReport = async (userData: any, date: string) => {
    setReportLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/admin/service-report?user_id=${userData.id}&date=${encodeURIComponent(date)}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถโหลดรายงานได้');
      }

      setReport(data.report || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดรายงาน');
      setReport([]);
      setTotal(0);
    } finally {
      setReportLoading(false);
    }
  };

  const fetchRangeReport = useCallback(async (userData: any, start: string, end: string) => {
    if (!start || !end) return;

    setRangeLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        user_id: String(userData.id),
        mode: 'range',
        start,
        end,
      });

      const res = await fetch(`/api/admin/service-report?${params}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถโหลดรายงานช่วงวันที่ได้');
      }

      rangeLoadedRef.current = true;
      setRangeReport(data.range?.report || []);
      setRangeTotal(data.range?.total || 0);
      setRangeLabel(data.range?.label || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดรายงานช่วงวันที่');
      setRangeReport([]);
      setRangeTotal(0);
      setRangeLabel('');
    } finally {
      setRangeLoading(false);
    }
  }, []);

  useEffect(() => {
    const auth = localStorage.getItem('allocation_check_auth');
    const storedUser = localStorage.getItem('allocation_check_user');

    if (auth !== 'true' || !storedUser) {
      router.push('/allocation-check');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);

      const allowedRoles = ['admin_server', 'admin_rps', 'user'];
      if (!allowedRoles.includes(userData.role)) {
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        router.push('/allocation-check');
        return;
      }

      const today = getTodayIso();
      const monthStart = getMonthStartIso();
      setSelectedDate(today);
      setRangeStart(monthStart);
      setRangeEnd(today);
      setUser(userData);

      fetchDailyReport(userData, today).finally(() => setLoading(false));
    } catch {
      router.push('/allocation-check');
    }
  }, [router]);

  const handleViewChange = (next: ReportView) => {
    setView(next);
    setError('');

    if (next === 'range' && user && !rangeLoadedRef.current) {
      const start = rangeStart || getMonthStartIso();
      const end = rangeEnd || getTodayIso();
      setRangeStart(start);
      setRangeEnd(end);
      fetchRangeReport(user, start, end);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (user && date) {
      fetchDailyReport(user, date);
    }
  };

  const handleRangeChange = (start: string, end: string) => {
    setRangeStart(start);
    setRangeEnd(end);
    if (user && start && end && start <= end) {
      fetchRangeReport(user, start, end);
    }
  };

  const isAdmin = user?.role === 'admin_server' || user?.role === 'admin_rps';
  const backHref = isAdmin ? '/admin' : '/allocation-check/data';
  const backLabel = isAdmin ? 'กลับหน้า Admin' : 'กลับหน้าหลัก';

  const openRecipients = (hospitalName: string, start: string, end: string, periodLabel: string) => {
    setRecipientModal({ hospital_name: hospitalName, start, end, periodLabel });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xl">
              📊
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">รายงานการให้บริการ</h1>
              <p className="text-sm text-gray-600">
                {user?.role === 'admin_server'
                  ? 'จำนวนผู้รับบริการแยกตามสถานบริการ (ทุก รพสต)'
                  : `สถานบริการ: ${user?.hospital_name || '-'}`}
              </p>
            </div>
          </div>
          <Link
            href={backHref}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            {backLabel}
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReportViewTabs view={view} onChange={handleViewChange} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {view === 'daily' ? (
          <DailyReportPanel
            selectedDate={selectedDate}
            formatThaiDate={formatThaiDate}
            getTodayIso={getTodayIso}
            onDateChange={handleDateChange}
            report={report}
            total={total}
            reportLoading={reportLoading}
            isAdmin={isAdmin}
            onViewRecipients={(hospitalName) =>
              openRecipients(hospitalName, selectedDate, selectedDate, formatThaiDate(selectedDate))
            }
          />
        ) : (
          <RangeReportPanel
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            rangeLabel={rangeLabel}
            rangeReport={rangeReport}
            rangeTotal={rangeTotal}
            rangeLoading={rangeLoading}
            getTodayIso={getTodayIso}
            formatThaiDateShort={formatThaiDateShort}
            onRangeChange={handleRangeChange}
            isAdmin={isAdmin}
            onViewRecipients={(hospitalName) =>
              openRecipients(
                hospitalName,
                rangeStart,
                rangeEnd,
                rangeLabel || `${formatThaiDateShort(rangeStart)} – ${formatThaiDateShort(rangeEnd)}`
              )
            }
          />
        )}

        {recipientModal && user && (
          <RecipientListModal
            userId={user.id}
            modal={recipientModal}
            onClose={() => setRecipientModal(null)}
          />
        )}
      </div>
    </div>
  );
}

function ReportViewTabs({
  view,
  onChange,
}: {
  view: ReportView;
  onChange: (v: ReportView) => void;
}) {
  const tabs: { id: ReportView; label: string; desc: string }[] = [
    { id: 'daily', label: 'รายวัน', desc: 'ยอดสรุปตามวันที่เลือก' },
    { id: 'range', label: 'ช่วงวันที่', desc: 'ยอดสรุปตามช่วงวันที่เลือก' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-2 mb-6 flex flex-col sm:flex-row gap-2">
      {tabs.map((tab) => {
        const active = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex-1 rounded-lg px-5 py-4 text-left transition-all ${
              active
                ? tab.id === 'daily'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <p className="text-lg font-bold">{tab.label}</p>
            <p className={`text-sm mt-0.5 ${active ? 'text-white/80' : 'text-gray-500'}`}>
              {tab.desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function DailyReportPanel({
  selectedDate,
  formatThaiDate,
  getTodayIso,
  onDateChange,
  report,
  total,
  reportLoading,
  isAdmin,
  onViewRecipients,
}: {
  selectedDate: string;
  formatThaiDate: (iso: string) => string;
  getTodayIso: () => string;
  onDateChange: (date: string) => void;
  report: ReportRow[];
  total: number;
  reportLoading: boolean;
  isAdmin: boolean;
  onViewRecipients: (hospitalName: string) => void;
}) {
  return (
    <div>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">เลือกวันที่</h2>
            <p className="text-sm text-gray-600">{formatThaiDate(selectedDate)}</p>
          </div>
          <div>
            <label htmlFor="report-date" className="block text-sm font-semibold text-gray-700 mb-1">
              วันที่
            </label>
            <input
              id="report-date"
              type="date"
              value={selectedDate}
              max={getTodayIso()}
              onChange={(e) => onDateChange(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-gray-900"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <SummaryCard
          title="ผู้รับบริการวันที่เลือก"
          value={reportLoading ? '...' : total.toLocaleString('th-TH')}
          subtitle="คน (นับไม่ซ้ำตามเลขบัตรประชาชน)"
          borderColor="border-teal-500"
        />
        {isAdmin && (
          <SummaryCard
            title="จำนวนสถานบริการ"
            value={reportLoading ? '...' : report.length.toLocaleString('th-TH')}
            subtitle="แห่ง (ในวันที่เลือก)"
            borderColor="border-blue-500"
          />
        )}
      </div>

      <ReportTableCard
        title="รายละเอียดตามสถานบริการ"
        rows={report}
        total={total}
        loading={reportLoading}
        emptyMessage="ไม่พบข้อมูลในวันที่เลือก"
        accentColor="teal"
        onViewRecipients={onViewRecipients}
      />
    </div>
  );
}

function RangeReportPanel({
  rangeStart,
  rangeEnd,
  rangeLabel,
  rangeReport,
  rangeTotal,
  rangeLoading,
  getTodayIso,
  formatThaiDateShort,
  onRangeChange,
  isAdmin,
  onViewRecipients,
}: {
  rangeStart: string;
  rangeEnd: string;
  rangeLabel: string;
  rangeReport: ReportRow[];
  rangeTotal: number;
  rangeLoading: boolean;
  getTodayIso: () => string;
  formatThaiDateShort: (iso: string) => string;
  onRangeChange: (start: string, end: string) => void;
  isAdmin: boolean;
  onViewRecipients: (hospitalName: string) => void;
}) {
  const rangeInvalid = Boolean(rangeStart && rangeEnd && rangeStart > rangeEnd);

  return (
    <div>
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">เลือกช่วงวันที่</h2>
        <p className="text-sm text-gray-600 mb-4">
          {rangeLabel || (rangeStart && rangeEnd
            ? `${formatThaiDateShort(rangeStart)} – ${formatThaiDateShort(rangeEnd)}`
            : 'กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label htmlFor="range-start" className="block text-sm font-semibold text-gray-700 mb-1">
              วันที่เริ่มต้น
            </label>
            <input
              id="range-start"
              type="date"
              value={rangeStart}
              max={rangeEnd || getTodayIso()}
              onChange={(e) => onRangeChange(e.target.value, rangeEnd)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="range-end" className="block text-sm font-semibold text-gray-700 mb-1">
              วันที่สิ้นสุด
            </label>
            <input
              id="range-end"
              type="date"
              value={rangeEnd}
              min={rangeStart}
              max={getTodayIso()}
              onChange={(e) => onRangeChange(rangeStart, e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            />
          </div>
        </div>
        {rangeInvalid && (
          <p className="mt-3 text-sm text-red-600">วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <SummaryCard
          title="ผู้รับบริการในช่วงที่เลือก"
          value={rangeLoading ? '...' : rangeTotal.toLocaleString('th-TH')}
          subtitle="คน (นับไม่ซ้ำตามเลขบัตรประชาชน)"
          borderColor="border-indigo-500"
        />
        {isAdmin && (
          <SummaryCard
            title="จำนวนสถานบริการ"
            value={rangeLoading ? '...' : rangeReport.length.toLocaleString('th-TH')}
            subtitle="แห่ง (ในช่วงวันที่เลือก)"
            borderColor="border-blue-500"
          />
        )}
      </div>

      <ReportTableCard
        title={`รายละเอียดช่วงวันที่ — ${rangeLabel || ''}`}
        subtitle={
          rangeStart && rangeEnd && !rangeInvalid
            ? `${formatThaiDateShort(rangeStart)} – ${formatThaiDateShort(rangeEnd)} · รวม ${rangeLoading ? '...' : rangeTotal.toLocaleString('th-TH')} คน (ไม่ซ้ำ)`
            : undefined
        }
        rows={rangeReport}
        total={rangeTotal}
        loading={rangeLoading}
        emptyMessage="ไม่พบข้อมูลในช่วงวันที่เลือก"
        accentColor="indigo"
        onViewRecipients={onViewRecipients}
      />
    </div>
  );
}

function ReportTableCard({
  title,
  subtitle,
  rows,
  total,
  loading,
  emptyMessage,
  accentColor,
  onViewRecipients,
}: {
  title: string;
  subtitle?: string;
  rows: ReportRow[];
  total: number;
  loading: boolean;
  emptyMessage: string;
  accentColor: 'teal' | 'indigo';
  onViewRecipients: (hospitalName: string) => void;
}) {
  const spinnerColor = accentColor === 'teal' ? 'border-teal-500' : 'border-indigo-500';

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {loading && (
          <span className="text-sm text-gray-500 flex items-center gap-2">
            <span className={`animate-spin rounded-full h-4 w-4 border-b-2 ${spinnerColor}`} />
            กำลังโหลด...
          </span>
        )}
      </div>
      <HospitalTable
        rows={rows}
        total={total}
        loading={loading}
        emptyMessage={emptyMessage}
        onViewRecipients={onViewRecipients}
      />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-600">กำลังโหลด...</p>
      </div>
    </div>
  );
}

function HospitalTable({
  rows,
  total,
  loading,
  emptyMessage,
  onViewRecipients,
}: {
  rows: ReportRow[];
  total: number;
  loading: boolean;
  emptyMessage: string;
  onViewRecipients: (hospitalName: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <p className="px-6 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
        กดที่แถวที่มียอด &gt; 0 เพื่อดูรายชื่อและรูปหลักฐาน
      </p>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-16">
              ลำดับ
            </th>
            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
              สถานบริการ (รพสต)
            </th>
            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
              จำนวนผู้รับบริการ (คน)
            </th>
            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-28">
              รายละเอียด
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => {
              const clickable = row.service_count > 0;
              return (
                <tr
                  key={row.hospital_name}
                  className={clickable ? 'hover:bg-teal-50 cursor-pointer' : 'hover:bg-gray-50'}
                  onClick={() => clickable && onViewRecipients(row.hospital_name)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.hospital_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full font-bold ${
                        row.service_count > 0
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.service_count.toLocaleString('th-TH')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {clickable ? (
                      <span className="text-teal-700 font-semibold">ดูรายชื่อ</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {rows.length > 0 && !loading && (
          <tfoot className="bg-teal-50">
            <tr>
              <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                รวมทั้งหมด
              </td>
              <td className="px-6 py-4 text-sm font-bold text-teal-800 text-right">
                {total.toLocaleString('th-TH')}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function formatCitizenId(id: string) {
  const d = id.replace(/\D/g, '');
  if (d.length !== 13) return id;
  return `${d.slice(0, 1)}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d.slice(12)}`;
}

function formatDbDateDisplay(dbDate: string) {
  if (!/^\d{8}$/.test(dbDate)) return dbDate;
  const day = dbDate.slice(0, 2);
  const month = dbDate.slice(2, 4);
  const year = Number(dbDate.slice(4, 8));
  return new Date(year, Number(month) - 1, Number(day)).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function authTypeLabel(type: string | null) {
  if (type === 'Auth_card') return 'อ่านบัตร';
  if (type === 'Auth_manual') return 'กรอกเลขบัตร';
  return type || '-';
}

function RecipientListModal({
  userId,
  modal,
  onClose,
}: {
  userId: number;
  modal: RecipientModalState;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewAuthen, setPreviewAuthen] = useState<{ authen: string; cid: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({
          user_id: String(userId),
          mode: 'recipients',
          hospital_name: modal.hospital_name,
          start: modal.start,
          end: modal.end,
        });
        const res = await fetch(`/api/admin/service-report?${params}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'โหลดรายชื่อไม่สำเร็จ');
        }
        setRecipients(data.recipients || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
        setRecipients([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, modal.hospital_name, modal.start, modal.end]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openImage = async (authen: string, cid: string) => {
    try {
      const url = `/api/admin/service-report/proof-image?user_id=${userId}&authen=${encodeURIComponent(authen)}&cid=${encodeURIComponent(cid)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('ไม่พบรูปหลักฐาน');
      const blob = await res.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewAuthen({ authen, cid });
    } catch {
      alert('ไม่สามารถโหลดรูปหลักฐานได้');
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewAuthen(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">รายชื่อผู้รับบริการ</h2>
            <p className="text-sm text-gray-600 mt-1">{modal.hospital_name}</p>
            <p className="text-sm text-gray-500">{modal.periodLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none px-2"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
          )}

          {loading ? (
            <div className="py-12 text-center text-gray-500">กำลังโหลดรายชื่อ...</div>
          ) : recipients.length === 0 ? (
            <p className="py-12 text-center text-gray-500">ไม่พบรายชื่อในช่วงเวลานี้</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">ลำดับ</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">เลขบัตรประชาชน</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">วันที่</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">เวลา</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">วิธี</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-600">รูปหลักฐาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recipients.map((r, i) => (
                    <tr key={`${r.authen}-${i}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-mono font-medium">{formatCitizenId(r.citizen_id)}</td>
                      <td className="px-4 py-3">{formatDbDateDisplay(r.date)}</td>
                      <td className="px-4 py-3">{r.time}</td>
                      <td className="px-4 py-3">{authTypeLabel(r.auth_type)}</td>
                      <td className="px-4 py-3 text-center">
                        {r.has_proof_image ? (
                          <button
                            type="button"
                            onClick={() => openImage(r.authen, r.citizen_id)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold underline"
                          >
                            ดูรูป
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && recipients.length > 0 && (
            <p className="mt-4 text-sm text-gray-600">
              รวม {recipients.length} รายการ (แสดงทุกครั้งที่ให้บริการ)
            </p>
          )}
        </div>

        {previewUrl && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
            onClick={closePreview}
          >
            <div className="bg-white rounded-lg p-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3">
                <p className="font-semibold text-gray-900">รูปหลักฐาน</p>
                <button type="button" onClick={closePreview} className="text-gray-500 hover:text-gray-800 text-xl">
                  ×
                </button>
              </div>
              {previewAuthen && (
                <p className="text-xs text-gray-500 mb-2 font-mono">
                  {formatCitizenId(previewAuthen.cid)}
                </p>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="หลักฐาน" className="w-full rounded-lg max-h-[70vh] object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  borderColor,
}: {
  title: string;
  value: string;
  subtitle: string;
  borderColor: string;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-t-4 ${borderColor}`}>
      <p className="text-gray-600 text-sm font-semibold uppercase">{title}</p>
      <p className="text-4xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
