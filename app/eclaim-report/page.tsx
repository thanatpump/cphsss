'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import EclaimDataUploadPanel from '@/app/components/EclaimDataUploadPanel';
import SsopEChart from '@/app/components/SsopEChart';
import {
  ECLAIM_PAGES,
  type EclaimNamedCount,
  type EclaimPageKey,
  type EclaimReportData,
} from '@/lib/eclaim-types';

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
}

function formatMoney(value: number) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buddhistYear(year: number) {
  return year + 543;
}

export default function EclaimReportPage() {
  const [page, setPage] = useState<EclaimPageKey>('overview');
  const [year, setYear] = useState<number | ''>('');
  const [data, setData] = useState<EclaimReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDb = useCallback(async (nextYear?: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (nextYear) params.set('year', String(nextYear));
      const res = await fetch(`/api/eclaim-report?${params}`);
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

  const hasDashboard = Boolean(data && (data.kpis.claims > 0 || data.kpis.payTotal > 0));

  const handleImported = useCallback(() => {
    void loadDb().then(() => {
      setPage('overview');
      requestAnimationFrame(() => {
        document.getElementById('eclaim-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, [loadDb]);

  const facilityBar = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 120, right: 24, top: 16, bottom: 32 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: [...(data?.byFacility || [])].slice(0, 12).reverse().map((row) => row.name.slice(0, 28)),
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          type: 'bar',
          data: [...(data?.byFacility || [])].slice(0, 12).reverse().map((row) => row.amount),
          itemStyle: { color: '#1a7a6d' },
        },
      ],
    }),
    [data]
  );

  const payBar = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 72 },
      xAxis: {
        type: 'category',
        data: (data?.byPayFacility || []).slice(0, 10).map((row) => row.name),
        axisLabel: { rotate: 35, fontSize: 10 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: (data?.byPayFacility || []).slice(0, 10).map((row) => row.amount),
          itemStyle: { color: '#0b3d4a' },
        },
      ],
    }),
    [data]
  );

  const sidebar = (
    <>
      {ECLAIM_PAGES.map((item) => (
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
      active="eclaim"
      title="แดชบอร์ด E-claim"
      subtitle="ใบคำขอเบิกค่าบริการและรายงานพึงรับ-พึงจ่าย"
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
      {page === 'data' && <EclaimDataUploadPanel onImported={handleImported} />}

      {(page !== 'data' || hasDashboard) && (
        <>
          <div
            id="eclaim-dashboard"
            className="bg-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <h2 className="text-xl font-bold">
                {page === 'data' ? 'ภาพรวมข้อมูลหลังอัปโหลด' : 'รายงาน E-claim'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">ข้อมูลจาก STM และรายงานพึงรับ-พึงจ่าย</p>
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
              <KpiBox label="รายการ STM" value={formatInt(data?.kpis.claims || 0)} />
              <KpiBox label="พึงรับ (STM)" value={formatMoney(data?.kpis.receiveTotal || 0)} />
              <KpiBox label="พึงจ่าย" value={formatMoney(data?.kpis.payTotal || 0)} />
              <KpiBox label="เอกสาร" value={formatInt(data?.kpis.docs || 0)} />
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
                      <h3 className="font-bold mb-2">พึงรับตามหน่วยรักษา (STM)</h3>
                      <SsopEChart option={facilityBar} height={360} />
                    </section>
                    <section className="bg-white rounded-xl p-4">
                      <h3 className="font-bold mb-2">ยอดพึงจ่ายตามหน่วย</h3>
                      <SsopEChart option={payBar} height={360} />
                    </section>
                  </div>
                  <MoneyTable title="แยก HTYPE" rows={data.byHtype} />
                </>
              )}

              {page === 'stm' && (
                <section className="bg-white rounded-xl p-4 overflow-auto">
                  <h3 className="font-bold mb-3">รายการ STM ยอดพึงรับสูงสุด</h3>
                  {data.topClaims.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">ยังไม่มีข้อมูล</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600 border-b">
                          <th className="py-2">REP</th>
                          <th>HN</th>
                          <th>ชื่อ</th>
                          <th>HCODE</th>
                          <th className="text-right">ขอเบิก</th>
                          <th className="text-right">พึงรับ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topClaims.map((row, idx) => (
                          <tr key={`${row.rep}-${row.hn}-${idx}`} className="border-b">
                            <td className="py-2">{row.rep}</td>
                            <td>{row.hn}</td>
                            <td>{row.name}</td>
                            <td>{row.hcode}</td>
                            <td className="text-right tabular-nums">{formatMoney(row.claimAmt)}</td>
                            <td className="text-right tabular-nums">{formatMoney(row.receiveTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              )}

              {page === 'pay' && <MoneyTable title="พึงรับ-พึงจ่าย แยกหน่วย" rows={data.byPayFacility} />}
              {page === 'summary' && (
                <section className="bg-white rounded-xl p-4 overflow-auto">
                  <h3 className="font-bold mb-3">สรุปราย REP (จากชีต summary)</h3>
                  {data.summaryRows.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">ยังไม่มีข้อมูลสรุป</p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600 border-b">
                          <th className="py-2">REP</th>
                          <th>HCODE</th>
                          <th className="text-right">ทั้งหมด</th>
                          <th className="text-right">ผ่าน</th>
                          <th className="text-right">ไม่ผ่าน</th>
                          <th className="text-right">พึงรับ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.summaryRows.map((row) => (
                          <tr key={`${row.repNo}-${row.hcode}`} className="border-b">
                            <td className="py-2">{row.repNo}</td>
                            <td>{row.hcode}</td>
                            <td className="text-right tabular-nums">{formatInt(row.totalCases)}</td>
                            <td className="text-right tabular-nums">{formatInt(row.passCases)}</td>
                            <td className="text-right tabular-nums">{formatInt(row.failCases)}</td>
                            <td className="text-right tabular-nums">{formatMoney(row.receiveTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
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

function MoneyTable({ title, rows }: { title: string; rows: EclaimNamedCount[] }) {
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
            <th className="text-right">ยอดเงิน</th>
            <th className="text-right">ร้อยละ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.name} className="border-b">
              <td className="py-2">{idx + 1}</td>
              <td className="font-medium">{row.name}</td>
              <td className="text-right tabular-nums">{formatInt(row.count)}</td>
              <td className="text-right tabular-nums">{formatMoney(row.amount)}</td>
              <td className="text-right tabular-nums">{row.percent.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
