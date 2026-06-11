'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { downloadDataMatchExcel } from '@/lib/data-match-export';

interface AuthenRecord {
  authen: string;
  authenHcare: string;
  authenInvNo: string;
  citizen_id: string;
  hcode: string;
  date: string;
  time: string;
  vn: string | null;
  hn: string | null;
}

interface MatchTableRow {
  invno: string;
  hcare: string;
  hmain: string;
  station: string;
  hn: string;
  pid: string;
  name: string;
  dttran: string;
  payplan: string;
  bp: string;
  bf: string;
  care: string;
  rid: string;
  copay: string;
  total: number;
  status: 'matched' | 'not_found' | 'no_invno';
  authen: AuthenRecord | null;
}

interface HcareGroup {
  hcare: string;
  hosname: string;
  hmain: string;
  rowCount: number;
  matchedCount: number;
  notFoundCount: number;
  totalAmount: number;
  rows: MatchTableRow[];
}

function hcareLabel(group: Pick<HcareGroup, 'hcare' | 'hosname'>) {
  if (group.hosname) return group.hosname;
  if (group.hcare && group.hcare !== '-') return `HCare ${group.hcare}`;
  return 'ไม่ระบุ HCare';
}

interface AuthenMatchResult {
  summary: {
    xmlCount: number;
    authenMatchedCount: number;
    onlyInXmlCount: number;
    uniqueInvNoCount: number;
    duplicateInvNoCount: number;
    xmlTotal: number;
    hcareCount: number;
  };
  byHcare: HcareGroup[];
}

interface ApiResponse {
  compare: {
    source: string;
    dbTable?: string;
    fileName: string;
    fileType: string;
    stmDoc?: string;
    billCount?: number;
  };
  result: AuthenMatchResult;
}

function formatMoney(value: number) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDttran(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear() + 543).slice(-2);
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}.${mi}`;
}

function getCurrentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function HospitalSummaryTable({
  groups,
  onSelect,
}: {
  groups: HcareGroup[];
  onSelect: (hcare: string) => void;
}) {
  const sorted = [...groups].sort((a, b) => hcareLabel(a).localeCompare(hcareLabel(b), 'th'));

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-indigo-700 text-white">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">#</th>
            <th className="px-4 py-3 text-left font-semibold">ชื่อสถานบริการ</th>
            <th className="px-4 py-3 text-left font-semibold">HCare</th>
            <th className="px-4 py-3 text-right font-semibold">จำนวน (พบ authen)</th>
            <th className="px-4 py-3 text-right font-semibold">ยอดรวม</th>
            <th className="px-4 py-3 text-center font-semibold">รายละเอียด</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {sorted.map((group, index) => (
            <tr
              key={group.hcare}
              onClick={() => onSelect(group.hcare)}
              className="cursor-pointer transition-colors hover:bg-indigo-50"
            >
              <td className="px-4 py-3 text-gray-500">{index + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-900">{hcareLabel(group)}</td>
              <td className="px-4 py-3 font-mono text-gray-700">{group.hcare}</td>
              <td className="px-4 py-3 text-right font-semibold text-green-700">
                {group.rowCount.toLocaleString('th-TH')}
              </td>
              <td className="px-4 py-3 text-right text-gray-900">{formatMoney(group.totalAmount)}</td>
              <td className="px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(group.hcare);
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  ดูรายละเอียด
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HcareDataTable({ rows }: { rows: MatchTableRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-xs md:text-sm">
        <thead className="bg-blue-700 text-white">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">#</th>
            <th className="px-3 py-2 text-left font-semibold">HCare</th>
            <th className="px-3 py-2 text-left font-semibold">HMain</th>
            <th className="px-3 py-2 text-left font-semibold">HN</th>
            <th className="px-3 py-2 text-left font-semibold">InvNo</th>
            <th className="px-3 py-2 text-left font-semibold">PID</th>
            <th className="px-3 py-2 text-left font-semibold">Name</th>
            <th className="px-3 py-2 text-left font-semibold">DTtran</th>
            <th className="px-3 py-2 text-center font-semibold">CP</th>
            <th className="px-3 py-2 text-center font-semibold">BP</th>
            <th className="px-3 py-2 text-center font-semibold">BF</th>
            <th className="px-3 py-2 text-center font-semibold">CA</th>
            <th className="px-3 py-2 text-left font-semibold">RID</th>
            <th className="px-3 py-2 text-left font-semibold">Copay</th>
            <th className="px-3 py-2 text-right font-semibold">Amount</th>
            <th className="px-3 py-2 text-left font-semibold">authen (เต็ม)</th>
            <th className="px-3 py-2 text-left font-semibold">HCare ใน authen</th>
            <th className="px-3 py-2 text-left font-semibold">InvNo ใน authen</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, index) => (
            <tr
              key={`${row.hcare}-${row.invno}-${row.hn}-${index}`}
              className="hover:bg-green-50"
            >
              <td className="px-3 py-2 text-gray-500">{index + 1}</td>
              <td className="px-3 py-2">{row.hcare || '-'}</td>
              <td className="px-3 py-2">{row.hmain || '-'}</td>
              <td className="px-3 py-2">{row.hn || '-'}</td>
              <td className="px-3 py-2 font-mono">{row.invno || '-'}</td>
              <td className="px-3 py-2">{row.pid || '-'}</td>
              <td className="px-3 py-2">{row.name || '-'}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatDttran(row.dttran)}</td>
              <td className="px-3 py-2 text-center">{row.payplan || '-'}</td>
              <td className="px-3 py-2 text-center">{row.bp || '-'}</td>
              <td className="px-3 py-2 text-center">{row.bf || '-'}</td>
              <td className="px-3 py-2 text-center">{row.care || '-'}</td>
              <td className="px-3 py-2">{row.rid || '-'}</td>
              <td className="px-3 py-2">{row.copay || '-'}</td>
              <td className="px-3 py-2 text-right font-medium">{formatMoney(row.total)}</td>
              <td className="px-3 py-2 font-mono text-xs">
                {row.authen?.authen || '-'}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {row.authen?.authenHcare || '-'}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {row.authen?.authenInvNo || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DataMatchPage() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [authenTotal, setAuthenTotal] = useState<number | null>(null);
  const [sognstmmTotal, setSognstmmTotal] = useState<number | null>(null);
  const [selectedHcare, setSelectedHcare] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);

  const loadMonthStats = useCallback(async (monthValue: string) => {
    if (!monthValue) {
      setAuthenTotal(null);
      setSognstmmTotal(null);
      return;
    }

    try {
      const params = new URLSearchParams({ month: monthValue });
      const res = await fetch(`/api/data-match?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setAuthenTotal(data.authenTotal ?? 0);
        setSognstmmTotal(data.sognstmmTotal ?? 0);
      } else {
        setAuthenTotal(null);
        setSognstmmTotal(null);
      }
    } catch {
      setAuthenTotal(null);
      setSognstmmTotal(null);
    }
  }, []);

  useEffect(() => {
    loadMonthStats(month);
  }, [month, loadMonthStats]);

  const result = response?.result;

  const matchedStats = useMemo(() => {
    if (!result) return { hospitalCount: 0, matchedCount: 0, totalAmount: 0 };
    const matchedRows = result.byHcare.flatMap((group) =>
      group.rows.filter((row) => row.status === 'matched')
    );
    const hospitalCount = result.byHcare.filter((group) =>
      group.rows.some((row) => row.status === 'matched')
    ).length;

    return {
      hospitalCount,
      matchedCount: matchedRows.length,
      totalAmount: matchedRows.reduce((sum, row) => sum + row.total, 0),
    };
  }, [result]);

  const visibleGroups = useMemo(() => {
    if (!result) return [];

    return result.byHcare
      .map((group) => {
        const rows = group.rows.filter((row) => row.status === 'matched');
        return {
          ...group,
          rows,
          rowCount: rows.length,
          matchedCount: rows.length,
          notFoundCount: 0,
          totalAmount: rows.reduce((sum, row) => sum + row.total, 0),
        };
      })
      .filter((group) => group.rows.length > 0);
  }, [result]);

  const selectedGroup = useMemo(() => {
    if (!selectedHcare) return null;
    return visibleGroups.find((group) => group.hcare === selectedHcare) ?? null;
  }, [selectedHcare, visibleGroups]);

  useEffect(() => {
    if (selectedHcare && !visibleGroups.some((group) => group.hcare === selectedHcare)) {
      setSelectedHcare(null);
    }
  }, [visibleGroups, selectedHcare]);

  const handleMonthChange = (value: string) => {
    setMonth(value);
    setResponse(null);
    setSelectedHcare(null);
  };

  const handleMatch = async () => {
    if (!month) {
      setError('กรุณาเลือกเดือน');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);
    setSelectedHcare(null);

    try {
      const res = await fetch('/api/data-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาดในการชนข้อมูล');
        return;
      }

      setResponse(data);
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 p-6 md:p-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-8">
          <Link href="/upload" className="mb-4 inline-flex items-center text-blue-700 hover:text-blue-900">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับหน้าอัปโหลด
          </Link>

          <h1 className="mb-2 text-3xl font-bold text-gray-900">ชน InvNo กับ authen</h1>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-bold text-emerald-900">ฐานข้อมูล sognstmm</h2>
            <p className="text-sm text-emerald-900">
              เดือน {month || '-'}:{' '}
              <strong>{sognstmmTotal != null ? sognstmmTotal.toLocaleString('th-TH') : '...'}</strong> รายการทั้งหมด
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-bold text-blue-900">ฐานข้อมูล authen_code</h2>
            <p className="text-sm text-blue-900">
              เดือน {month || '-'}:{' '}
              <strong>{authenTotal != null ? authenTotal.toLocaleString('th-TH') : '...'}</strong> รายการ
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-xl bg-white p-6 shadow-lg">
          <label htmlFor="match-month" className="mb-2 block text-sm font-medium text-gray-700">
            เลือกเดือน
          </label>
          <input
            id="match-month"
            type="month"
            value={month}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <p className="mt-2 text-xs text-gray-500">
            ดึง sognstmm ทั้งหมดของเดือนที่เลือก แล้วแสดงผลแยกตามแต่ละสถานบริการ
          </p>
        </div>

        <div className="mb-8">
          <button
            onClick={handleMatch}
            disabled={loading || !month}
            className="rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? 'กำลังชนข้อมูล...' : 'เริ่มชนข้อมูล'}
          </button>
        </div>

        {error && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        )}

        {response && result && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-white p-4 shadow">
                <p className="text-sm text-gray-500">สถานบริการ (พบ authen)</p>
                <p className="text-2xl font-bold text-gray-900">{matchedStats.hospitalCount}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow">
                <p className="text-sm text-gray-500">พบ authen</p>
                <p className="text-2xl font-bold text-green-600">{matchedStats.matchedCount.toLocaleString('th-TH')}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow">
                <p className="text-sm text-gray-500">ยอดรวม (พบ authen)</p>
                <p className="text-lg font-bold text-gray-900">{formatMoney(matchedStats.totalAmount)}</p>
              </div>
            </div>

            {visibleGroups.length === 0 && (
              <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-lg">
                ไม่พบรายการที่ชน authen ในเดือนนี้
              </div>
            )}

            {visibleGroups.length > 0 && !selectedGroup && (
              <div className="overflow-hidden rounded-xl bg-white shadow-lg">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 md:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">สรุปตามสถานบริการ</h3>
                      <p className="text-sm text-gray-600">
                        เดือน {month} · {visibleGroups.length.toLocaleString('th-TH')} สถานบริการ · กดแถวเพื่อดูรายละเอียด
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        downloadDataMatchExcel({
                          month,
                          groups: visibleGroups,
                          formatDttran,
                        })
                      }
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Export Excel
                    </button>
                  </div>
                </div>
                <div className="p-4 md:p-6">
                  <HospitalSummaryTable
                    groups={visibleGroups}
                    onSelect={(hcare) => setSelectedHcare(hcare)}
                  />
                </div>
              </div>
            )}

            {selectedGroup && (
              <div className="overflow-hidden rounded-xl bg-white shadow-lg">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 md:px-6">
                  <button
                    type="button"
                    onClick={() => setSelectedHcare(null)}
                    className="mb-3 inline-flex items-center text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                  >
                    ← กลับรายการสถานบริการ
                  </button>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{hcareLabel(selectedGroup)}</h3>
                      <p className="text-sm text-gray-600">
                        HCare: {selectedGroup.hcare}
                        {selectedGroup.hmain !== '-' ? ` · HMain: ${selectedGroup.hmain}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-green-700">พบ authen: <strong>{selectedGroup.rowCount.toLocaleString('th-TH')}</strong> รายการ</span>
                      <span>ยอดรวม: <strong>{formatMoney(selectedGroup.totalAmount)}</strong></span>
                      <button
                        type="button"
                        onClick={() =>
                          downloadDataMatchExcel({
                            month,
                            groups: visibleGroups,
                            formatDttran,
                            hospitalOnly: selectedGroup,
                          })
                        }
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Export Excel
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4 md:p-6">
                  <HcareDataTable rows={selectedGroup.rows} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
