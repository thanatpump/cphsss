'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import ChronicDataUploadPanel from '@/app/components/ChronicDataUploadPanel';
import SsopEChart from '@/app/components/SsopEChart';
import {
  CHRONIC_PAGES,
  type ChronicNamedCount,
  type ChronicPageKey,
  type ChronicReportData,
} from '@/lib/chronic-types';

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
}

function buddhistYear(year: number) {
  return year + 543;
}

export default function ChronicReportPage() {
  const [page, setPage] = useState<ChronicPageKey>('overview');
  const [year, setYear] = useState<number | ''>('');
  const [data, setData] = useState<ChronicReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDb = useCallback(async (nextYear?: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (nextYear) params.set('year', String(nextYear));
      const res = await fetch(`/api/chronic-report?${params}`);
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

  const hasDashboard = Boolean(data && data.kpis.cases > 0);

  const handleImported = useCallback(() => {
    void loadDb().then(() => {
      setPage('overview');
      requestAnimationFrame(() => {
        document.getElementById('chronic-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, [loadDb]);

  const confirmPie = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      color: ['#1a7a6d', '#f59e0b', '#0b3d4a'],
      series: [
        {
          type: 'pie',
          radius: ['28%', '68%'],
          data: (data?.byConfirm || []).map((row) => ({ name: row.name, value: row.count })),
          label: { formatter: '{b}\n{d}%' },
        },
      ],
    }),
    [data]
  );

  const typeBar = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 48 },
      xAxis: { type: 'category', data: data?.byType.map((row) => row.name) || [] },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: data?.byType.map((row) => row.count) || [],
          itemStyle: { color: '#1a7a6d' },
        },
      ],
    }),
    [data]
  );

  const diseaseBar = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 56, right: 24, top: 16, bottom: 32 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: [...(data?.byDisease || [])].slice(0, 15).reverse().map((row) => row.name),
      },
      series: [
        {
          type: 'bar',
          data: [...(data?.byDisease || [])].slice(0, 15).reverse().map((row) => row.count),
          itemStyle: { color: '#3b82f6' },
        },
      ],
    }),
    [data]
  );

  const monthOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 32 },
      xAxis: { type: 'category', data: data?.byMonth.map((row) => row.label) || [] },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: data?.byMonth.map((row) => row.count) || [],
          itemStyle: { color: '#0b3d4a' },
        },
      ],
    }),
    [data]
  );

  const sidebar = (
    <>
      {CHRONIC_PAGES.map((item) => (
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
      active="chronic"
      title="แดชบอร์ดโรคเรื้อรัง"
      subtitle="SSOP ACD — ยืนยันและรายละเอียดโรคเรื้อรัง"
      sidebar={sidebar}
      actions={
        hasDashboard || page !== 'data' ? (
          <button
            type="button"
            onClick={() => loadDb(typeof year === 'number' ? year : undefined)}
            className="px-3 py-2 rounded-lg bg-gray-100 text-sm font-semibold hover:bg-gray-200"
          >
            รีเฟรช
          </button>
        ) : null
      }
    >
      {page === 'data' && <ChronicDataUploadPanel onImported={handleImported} />}

      {(page !== 'data' || hasDashboard) && (
        <>
          <div
            id="chronic-dashboard"
            className="bg-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <h2 className="text-xl font-bold">
                {page === 'data' ? 'ภาพรวมข้อมูลหลังอัปโหลด' : 'รายงานโรคเรื้อรัง (ACD)'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">ข้อมูลจาก ACDCONF / acddetail ที่อัปโหลดในระบบ</p>
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
              <KpiBox label="เคสทั้งหมด" value={formatInt(data?.kpis.cases || 0)} />
              <KpiBox label="ยืนยันแล้ว" value={formatInt(data?.kpis.confirmed || 0)} />
              <KpiBox label="รอยืนยัน" value={formatInt(data?.kpis.pending || 0)} />
              <KpiBox label="NEW" value={formatInt(data?.kpis.newCases || 0)} />
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
                      <h3 className="font-bold mb-2">สถานะการยืนยัน</h3>
                      <SsopEChart option={confirmPie} height={300} />
                    </section>
                    <section className="bg-white rounded-xl p-4">
                      <h3 className="font-bold mb-2">แยกประเภท (Type)</h3>
                      <SsopEChart option={typeBar} height={300} />
                    </section>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <section className="bg-white rounded-xl p-4">
                      <h3 className="font-bold mb-2">รหัสโรคเรื้อรัง Top 15</h3>
                      <SsopEChart option={diseaseBar} height={360} />
                    </section>
                    <section className="bg-white rounded-xl p-4">
                      <h3 className="font-bold mb-2">FirstDate แยกเดือน</h3>
                      <SsopEChart option={monthOption} height={360} />
                    </section>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiBox label="รหัสโรคไม่ซ้ำ" value={formatInt(data.kpis.diseaseCodes)} />
                    <KpiBox label="Visit ใน acddetail" value={formatInt(data.kpis.detailVisits)} />
                  </div>
                </>
              )}

              {page === 'disease' && <CountTable title="แยกรหัสโรคเรื้อรัง" rows={data.byDisease} />}
              {page === 'type' && <CountTable title="แยกประเภท Type" rows={data.byType} />}
              {page === 'detail' && (
                <CountTable title="หน่วยบริการจาก acddetail (Top)" rows={data.topFacilities} />
              )}
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

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
      <p className="text-[11px] text-gray-600">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function CountTable({ title, rows }: { title: string; rows: ChronicNamedCount[] }) {
  if (!rows.length) {
    return <section className="bg-white rounded-xl p-8 text-center text-gray-500">ยังไม่มีข้อมูล</section>;
  }
  return (
    <section className="bg-white rounded-xl p-4 overflow-auto">
      <h3 className="font-bold mb-3">{title}</h3>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 border-b">
            <th className="py-2">#</th>
            <th>รายการ</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">ร้อยละ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.name} className="border-b">
              <td className="py-2">{idx + 1}</td>
              <td className="font-medium">{row.name}</td>
              <td className="text-right tabular-nums">{formatInt(row.count)}</td>
              <td className="text-right tabular-nums">{row.percent.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
