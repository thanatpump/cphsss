'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import Icd10DataUploadPanel from '@/app/components/Icd10DataUploadPanel';
import SsopEChart from '@/app/components/SsopEChart';
import {
  ICD10_PAGES,
  type Icd10NamedCount,
  type Icd10PageKey,
  type Icd10ReportData,
} from '@/lib/icd10-types';

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
}

function buddhistYear(year: number) {
  return year + 543;
}

export default function Icd10ReportPage() {
  const [page, setPage] = useState<Icd10PageKey>('overview');
  const [year, setYear] = useState<number | ''>('');
  const [data, setData] = useState<Icd10ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDb = useCallback(async (nextYear?: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (nextYear) params.set('year', String(nextYear));
      const res = await fetch(`/api/icd10-report?${params}`);
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

  const hasDashboard = Boolean(data && data.kpis.visits > 0);

  const handleImported = useCallback(() => {
    void loadDb().then(() => {
      setPage('overview');
      requestAnimationFrame(() => {
        document.getElementById('icd10-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, [loadDb]);

  const typePie = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      color: ['#1a7a6d', '#0b3d4a'],
      series: [
        {
          type: 'pie',
          radius: ['28%', '68%'],
          data: (data?.byType || []).map((row) => ({ name: row.name, value: row.count })),
          label: { formatter: '{b}\n{d}%' },
        },
      ],
    }),
    [data]
  );

  const monthOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0 },
      grid: { left: 48, right: 16, top: 24, bottom: 48 },
      xAxis: { type: 'category', data: data?.byMonth.map((row) => row.label) || [] },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'OPD',
          type: 'bar',
          stack: 'v',
          itemStyle: { color: '#1a7a6d' },
          data: data?.byMonth.map((row) => row.opd) || [],
        },
        {
          name: 'IPD',
          type: 'bar',
          stack: 'v',
          itemStyle: { color: '#0b3d4a' },
          data: data?.byMonth.map((row) => row.ipd) || [],
        },
      ],
    }),
    [data]
  );

  const topBar = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 72, right: 24, top: 16, bottom: 32 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: [...(data?.topCodes || [])].reverse().map((row) => row.name),
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: [...(data?.topCodes || [])].reverse().map((row) => row.count),
          itemStyle: { color: '#3b82f6' },
        },
      ],
    }),
    [data]
  );

  const sidebar = (
    <>
      {ICD10_PAGES.map((item) => (
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
      active="icd10"
      title="แดชบอร์ด ICD-10"
      subtitle="วิเคราะห์รหัสโรคจากไฟล์ OPD / IPD"
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
      {page === 'data' && <Icd10DataUploadPanel onImported={handleImported} />}

      {(page !== 'data' || hasDashboard) && (
        <>
          <div
            id="icd10-dashboard"
            className="bg-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <h2 className="text-xl font-bold">
                {page === 'data' ? 'ภาพรวมข้อมูลหลังอัปโหลด' : 'รายงานรหัสโรค ICD-10'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">ข้อมูลจากไฟล์ OPD*.TXT / IPD*.TXT ที่อัปโหลดในระบบ</p>
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
              <KpiBox label="Visit ทั้งหมด" value={formatInt(data?.kpis.visits || 0)} />
              <KpiBox label="OPD" value={formatInt(data?.kpis.opdVisits || 0)} />
              <KpiBox label="IPD" value={formatInt(data?.kpis.ipdVisits || 0)} />
              <KpiBox label="รหัสโรคไม่ซ้ำ" value={formatInt(data?.kpis.uniqueCodes || 0)} />
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
                      <h3 className="font-bold mb-2">สัดส่วน Visit แยก OPD / IPD</h3>
                      <SsopEChart option={typePie} height={320} />
                    </section>
                    <section className="bg-white rounded-xl p-4">
                      <h3 className="font-bold mb-2">จำนวน Visit แยกเดือน</h3>
                      <SsopEChart option={monthOption} height={320} />
                    </section>
                  </div>
                  <section className="bg-white rounded-xl p-4">
                    <h3 className="font-bold mb-2">รหัสโรคที่พบบ่อย (Top 25)</h3>
                    <SsopEChart option={topBar} height={480} />
                  </section>
                </>
              )}

              {page === 'top' && <CodeTable title="รหัสโรคยอดนิยม" rows={data.topCodes} />}
              {page === 'opd' && <CodeTable title="Top ICD — OPD" rows={data.topOpd} />}
              {page === 'ipd' && <CodeTable title="Top ICD — IPD" rows={data.topIpd} />}
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

function CodeTable({ title, rows }: { title: string; rows: Icd10NamedCount[] }) {
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
            <th>ICD-10</th>
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
