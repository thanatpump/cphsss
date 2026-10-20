'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import SsopEChart from '@/app/components/SsopEChart';
import SsopDataUploadPanel from '@/app/components/SsopDataUploadPanel';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import {
  DISTRICT_COLORS,
  SSOP_PAGES,
  type SsopPageKey,
  type SsopReportData,
} from '@/lib/ssop-report-types';

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
}

function formatMoney(value: number) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buddhistYear(year: number) {
  return year + 543;
}

export default function SsopReportPage() {
  const [page, setPage] = useState<SsopPageKey>('overview');
  const [year, setYear] = useState<number | ''>('');
  const [data, setData] = useState<SsopReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDb = useCallback(async (nextYear?: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (nextYear) params.set('year', String(nextYear));
      const res = await fetch(`/api/ssop-report?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'โหลดรายงานไม่สำเร็จ');
      setData(json.data);
      setYear(json.data.year);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDb();
  }, [loadDb]);

  const download = () => {
    if (!data) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        data.byDistrict.map((row) => ({
          อำเภอ: row.name,
          จำนวน: row.count,
          ร้อยละ: row.percent,
          จำนวนเงิน: row.amount,
        }))
      ),
      'แยกอำเภอ'
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        data.facilities.map((row) => ({
          รหัส: row.hcode,
          หน่วยบริการ: row.name,
          อำเภอ: row.district,
          ประเภท: row.type,
          จำนวน: row.visits,
          จำนวนเงิน: row.amount,
        }))
      ),
      'แยกหน่วย'
    );
    XLSX.writeFile(workbook, `ssop-report-${data.year}.xlsx`);
  };

  const districtNames = useMemo(
    () => data?.byDistrict.map((row) => row.name) || [],
    [data]
  );

  const pieOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      color: DISTRICT_COLORS,
      series: [
        {
          type: 'pie',
          radius: ['18%', '68%'],
          data: (data?.byDistrict || []).map((row) => ({ name: row.name, value: row.count })),
          label: { formatter: '{b}\n{d}%', fontSize: 10 },
        },
      ],
    }),
    [data]
  );

  const monthOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { type: 'scroll', bottom: 0 },
      color: DISTRICT_COLORS,
      grid: { left: 48, right: 16, top: 24, bottom: 64 },
      xAxis: { type: 'category', data: data?.byMonth.map((row) => row.label) || [] },
      yAxis: { type: 'value' },
      series: districtNames.map((name) => ({
        name,
        type: 'bar',
        stack: 'district',
        emphasis: { focus: 'series' },
        data: data?.byMonth.map((row) => row.districts[name] || 0) || [],
      })),
    }),
    [data, districtNames]
  );

  const typeOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: data?.byFacilityType.map((row) => row.name) || [] },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: data?.byFacilityType.map((row) => row.count) || [],
          itemStyle: { color: '#60a5fa' },
        },
      ],
    }),
    [data]
  );

  const topDistricts = data?.byDistrict.slice(0, 10) || [];
  const bottomDistricts = [...(data?.byDistrict || [])].reverse().slice(0, 10);
  const hasDashboard = Boolean(data && data.kpis.patients > 0);
  const showReportChrome = page !== 'data' || hasDashboard;

  const handleImported = useCallback(() => {
    void loadDb().then(() => {
      setPage('overview');
      requestAnimationFrame(() => {
        document.getElementById('ssop-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, [loadDb]);

  const sidebar = (
    <>
      {SSOP_PAGES.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setPage(item.key)}
          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold mb-1 ${
            page === item.key ? 'bg-[#e8f4f2] text-[#0b3d4a]' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {item.label}
        </button>
      ))}
    </>
  );

  return (
    <ReportModuleShell
      active="ssop"
      title="แดชบอร์ด SSOP"
      subtitle="รายงานผลการส่งข้อมูลผู้ป่วยนอกสิทธิประกันสังคม"
      sidebar={sidebar}
      actions={
        showReportChrome ? (
          <>
            <button
              type="button"
              onClick={download}
              className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-semibold hover:bg-gray-200"
            >
              ดาวน์โหลด
            </button>
            <button
              type="button"
              onClick={() => loadDb(typeof year === 'number' ? year : undefined)}
              className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-semibold hover:bg-gray-200"
            >
              รีเฟรช
            </button>
          </>
        ) : null
      }
    >
          {page === 'data' && <SsopDataUploadPanel onImported={handleImported} />}

          {(page !== 'data' || hasDashboard) && (
            <>
              <div id="ssop-dashboard" className="bg-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">
                    {page === 'data'
                      ? 'ภาพรวมข้อมูลหลังอัปโหลด'
                      : 'รายงานผลการส่งข้อมูลผู้ป่วยนอก สิทธิประกันสังคม'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    ข้อมูลจากไฟล์ SSOP ที่อัปโหลดในระบบ (SOGNSTMM / SOGNSTMP)
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-sm font-semibold">
                    ปี {year ? buddhistYear(Number(year)) : '-'}
                    <select
                      className="ml-2 border rounded-lg px-2 py-1"
                      value={year}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setYear(next);
                        loadDb(next);
                      }}
                    >
                      {(data?.years || []).map((item) => (
                        <option key={item} value={item}>
                          {buddhistYear(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
                    <p className="text-[11px] text-gray-600">จำนวนคนไข้ทั้งหมด</p>
                    <p className="text-xl font-bold">{formatInt(data?.kpis.patients || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
                    <p className="text-[11px] text-gray-600">จำนวนเงินเฉลี่ย</p>
                    <p className="text-xl font-bold">{formatMoney(data?.kpis.avgAmount || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
                    <p className="text-[11px] text-gray-600">จำนวนหน่วยบริการ</p>
                    <p className="text-xl font-bold">{formatInt(data?.kpis.facilities || 0)}</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">{error}</div>
              )}
              {loading ? (
                <div className="bg-white rounded-xl p-12 text-center text-gray-500">กำลังโหลดรายงาน...</div>
              ) : !data ? null : (
                <>
                  {(page === 'overview' || page === 'data') && (
                    <>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <section className="bg-white rounded-xl p-4">
                          <h3 className="font-bold mb-2">สัดส่วนที่ส่งข้อมูลแยกอำเภอ</h3>
                          <SsopEChart option={pieOption} height={360} />
                        </section>
                        <section className="bg-white rounded-xl p-4">
                          <h3 className="font-bold mb-2">จำนวนที่ส่งข้อมูลแยกเดือน</h3>
                          <SsopEChart option={monthOption} height={360} />
                        </section>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <RankTable title="ส่งข้อมูลสูงสุด" rows={topDistricts} />
                        <RankTable title="ส่งข้อมูลต่ำสุด" rows={bottomDistricts} />
                      </div>
                      <section className="bg-white rounded-xl p-4">
                        <h3 className="font-bold mb-2">จำนวนส่งข้อมูลแยกประเภทหน่วยบริการ</h3>
                        <SsopEChart option={typeOption} height={280} />
                      </section>
                    </>
                  )}

                  {page === 'district' && <RankTable title="สรุปแยกอำเภอ" rows={data.byDistrict} showAmount />}
                  {page === 'facility' && <FacilityTable rows={data.facilities} />}
                  {page === 'facility-month' && <FacilityMonthTable rows={data.facilityMonths} />}
                </>
              )}

              <p className="text-xs text-gray-500 text-right">
                วันที่อัปเดตข้อมูลล่าสุด:{' '}
                {data?.updatedAt
                  ? new Date(data.updatedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
                  : '-'}
              </p>
            </>
          )}
    </ReportModuleShell>
  );
}

function RankTable({
  title,
  rows,
  showAmount = false,
}: {
  title: string;
  rows: Array<{ name: string; count: number; percent: number; amount: number }>;
  showAmount?: boolean;
}) {
  return (
    <section className="bg-white rounded-xl p-4 overflow-auto">
      <h3 className="font-bold mb-3">{title}</h3>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 border-b">
            <th className="py-2">#</th>
            <th>อำเภอ</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">ร้อยละ</th>
            {showAmount && <th className="text-right">จำนวนเงิน</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.name} className="border-b">
              <td className="py-2">{idx + 1}</td>
              <td>{row.name}</td>
              <td className="text-right">{formatInt(row.count)}</td>
              <td className="text-right">{row.percent.toFixed(1)}</td>
              {showAmount && <td className="text-right">{formatMoney(row.amount)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function FacilityTable({ rows, empty }: { rows: SsopReportData['facilities']; empty?: string }) {
  if (!rows.length) {
    return <section className="bg-white rounded-xl p-8 text-center text-gray-500">{empty || 'ไม่พบข้อมูล'}</section>;
  }
  return (
    <section className="bg-white rounded-xl p-4 overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 border-b">
            <th className="py-2">รหัส</th>
            <th>หน่วยบริการ</th>
            <th>อำเภอ</th>
            <th>ประเภท</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hcode} className="border-b">
              <td className="py-2">{row.hcode}</td>
              <td>{row.name}</td>
              <td>{row.district}</td>
              <td>{row.type}</td>
              <td className="text-right">{formatInt(row.visits)}</td>
              <td className="text-right">{formatMoney(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function FacilityMonthTable({ rows }: { rows: SsopReportData['facilityMonths'] }) {
  return (
    <section className="bg-white rounded-xl p-4 overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 border-b">
            <th className="py-2">เดือน</th>
            <th>รหัส</th>
            <th>หน่วยบริการ</th>
            <th>อำเภอ</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.hcode}-${row.month}`} className="border-b">
              <td className="py-2">{row.monthLabel}</td>
              <td>{row.hcode}</td>
              <td>{row.name}</td>
              <td>{row.district}</td>
              <td className="text-right">{formatInt(row.visits)}</td>
              <td className="text-right">{formatMoney(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
