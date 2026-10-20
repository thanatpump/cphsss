'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import AipnDataUploadPanel from '@/app/components/AipnDataUploadPanel';
import SsopEChart from '@/app/components/SsopEChart';
import {
  AIPN_PAGES,
  type AipnFacilityRow,
  type AipnFacilityStatusRow,
  type AipnPageKey,
  type AipnReportData,
} from '@/lib/aipn-types';

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
}

function formatMoney(value: number) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buddhistYear(year: number) {
  return year + 543;
}

export default function AipnReportPage() {
  const [page, setPage] = useState<AipnPageKey>('overview');
  const [year, setYear] = useState<number | ''>('');
  const [data, setData] = useState<AipnReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDb = useCallback(async (nextYear?: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (nextYear) params.set('year', String(nextYear));
      const res = await fetch(`/api/aipn-report?${params}`);
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
        document.getElementById('aipn-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, [loadDb]);

  const chartRows = useMemo(() => {
    const rows = [...(data?.facilityStatus || [])].slice(0, 40).reverse();
    return rows;
  }, [data]);

  const passFailOption = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ seriesName: string; value: number; name: string }>) => {
          const name = params[0]?.name || '';
          const lines = params.map((p) => `${p.seriesName}: ${formatInt(p.value)}`);
          return `${name}<br/>${lines.join('<br/>')}`;
        },
      },
      legend: { top: 0, data: ['รายการที่ตรวจผ่าน', 'ธุรกรรมที่ตรวจไม่ผ่าน'] },
      grid: { left: 160, right: 24, top: 36, bottom: 24 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: chartRows.map((row) => `${row.hcode} ${row.name}`.slice(0, 28)),
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          name: 'รายการที่ตรวจผ่าน',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#34a853' },
          emphasis: { focus: 'series' },
          data: chartRows.map((row) => row.passed),
        },
        {
          name: 'ธุรกรรมที่ตรวจไม่ผ่าน',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#ea4335' },
          emphasis: { focus: 'series' },
          data: chartRows.map((row) => row.failed),
        },
      ],
    }),
    [chartRows]
  );

  const monthOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 12, top: 16, bottom: 28 },
      xAxis: {
        type: 'category',
        data: data?.byMonth.map((row) => row.label) || [],
        axisLabel: { fontSize: 10 },
      },
      yAxis: { type: 'value', splitNumber: 3 },
      series: [
        {
          type: 'bar',
          data: data?.byMonth.map((row) => row.total) || [],
          itemStyle: { color: '#4285f4' },
        },
      ],
    }),
    [data]
  );

  const chartHeight = Math.max(360, chartRows.length * 22);

  const sidebar = (
    <>
      {AIPN_PAGES.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setPage(item.key)}
          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold mb-1 ${
            page === item.key ? 'bg-[#e8f0fe] text-[#1967d2]' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {item.label}
        </button>
      ))}
    </>
  );

  return (
    <ReportModuleShell
      active="aipn"
      title="แดชบอร์ด AIPN"
      subtitle="รายงานผลการส่งข้อมูลผู้ป่วยใน สิทธิประกันสังคม"
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
      {page === 'data' && <AipnDataUploadPanel onImported={handleImported} />}

      {(page !== 'data' || hasDashboard) && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">{error}</div>
          )}
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center text-gray-500">กำลังโหลดรายงาน...</div>
          ) : !data ? null : (
            <>
              {(page === 'overview' || page === 'data') && (
                <div id="aipn-dashboard" className="space-y-4">
                  <div className="bg-white rounded-xl p-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-[#202124]">
                        รายงานผลการส่งข้อมูลผู้ป่วยใน สิทธิประกันสังคม
                      </h2>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="font-semibold text-gray-700">ปี:</span>
                        <select
                          className="border rounded-lg px-2 py-1"
                          value={year}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            setYear(next);
                            loadDb(next);
                          }}
                        >
                          {(data.years || []).map((item) => (
                            <option key={item} value={item}>
                              {buddhistYear(item)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <ScoreCard
                        label="จำนวนธุรกรรม"
                        value={formatInt(data.kpis.transactions)}
                        tone="blue"
                      />
                      <ScoreCard
                        label="รายการที่ตรวจผ่าน"
                        value={formatInt(data.kpis.passed)}
                        tone="green"
                      />
                      <ScoreCard
                        label="ธุรกรรมที่ตรวจไม่ผ่าน"
                        value={formatInt(data.kpis.failed)}
                        tone="red"
                      />
                    </div>
                  </div>

                  <section className="bg-white rounded-xl p-4">
                    <h3 className="font-bold text-[#202124] mb-1">สัดส่วนผ่าน / ไม่ผ่าน แยกหน่วยบริการ</h3>
                    <p className="text-xs text-gray-500 mb-2">
                      ยังไม่มีไฟล์รายการไม่ผ่าน — แสดงเป็นผ่านทั้งหมดจนกว่าจะอัปโหลดข้อมูลเฝ้าระวัง
                    </p>
                    <SsopEChart option={passFailOption} height={chartHeight} />
                  </section>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <RankTable
                      title="เรียงลำดับ ตามจำนวนบริการที่พบ"
                      rows={data.topByVolume}
                      mode="volume"
                    />
                    <RankTable
                      title="เรียงลำดับ ตามส่วนบริการที่ไม่ผ่าน"
                      rows={data.topByFailPercent}
                      mode="fail"
                    />
                    <section className="bg-white rounded-xl p-4">
                      <h3 className="font-bold text-[#202124] mb-2">จำนวน Admit รายเดือน</h3>
                      <SsopEChart option={monthOption} height={280} />
                    </section>
                  </div>
                </div>
              )}

              {page === 'stmm' && (
                <FacilityTable rows={data.stmmFacilities} empty="ยังไม่มีข้อมูล SIGNSTMM ของปีนี้" />
              )}
              {page === 'stms' && (
                <FacilityTable rows={data.stmsFacilities} empty="ยังไม่มีข้อมูล SIGNSTMS ของปีนี้" />
              )}
              {page === 'watch' && (
                <section className="bg-white rounded-xl p-4">
                  <h3 className="font-bold mb-3">เฝ้าระวังข้อมูลที่ไม่ผ่าน</h3>
                  {data.watchRows.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      ยังไม่มีไฟล์รายการที่ไม่ผ่าน — เมื่อมีข้อมูล ส่วนสีแดงในภาพรวมและตารางอันดับจะอัปเดตตาม
                    </p>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600 border-b">
                          <th className="py-2">รหัส</th>
                          <th>หน่วยบริการ</th>
                          <th>สาเหตุ</th>
                          <th className="text-right">จำนวน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.watchRows.map((row, idx) => (
                          <tr key={`${row.hcode}-${idx}`} className="border-b">
                            <td className="py-2">{row.hcode}</td>
                            <td>{row.name}</td>
                            <td>{row.issue}</td>
                            <td className="text-right">{formatInt(row.count)}</td>
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

function ScoreCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'green' | 'red';
}) {
  const map = {
    blue: 'bg-[#e8f0fe] text-[#1967d2] border-[#aecbfa]',
    green: 'bg-[#e6f4ea] text-[#137333] border-[#a8dab5]',
    red: 'bg-[#fce8e6] text-[#c5221f] border-[#f6aea9]',
  } as const;
  return (
    <div className={`min-w-[140px] rounded-xl border px-4 py-3 text-center ${map[tone]}`}>
      <p className="text-[11px] font-medium opacity-90">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  );
}

function RankTable({
  title,
  rows,
  mode,
}: {
  title: string;
  rows: AipnFacilityStatusRow[];
  mode: 'volume' | 'fail';
}) {
  return (
    <section className="bg-white rounded-xl p-4 overflow-auto">
      <h3 className="font-bold text-[#202124] mb-3 text-sm">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">ยังไม่มีข้อมูล</p>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600 border-b">
              <th className="py-2">#</th>
              <th>หน่วยบริการ</th>
              <th className="text-right">{mode === 'fail' ? '% ไม่ผ่าน' : 'จำนวน'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.hcode} className="border-b">
                <td className="py-1.5">{idx + 1}</td>
                <td className="pr-2">
                  <span className="text-gray-500 mr-1">{row.hcode}</span>
                  {row.name}
                </td>
                <td className="text-right tabular-nums">
                  {mode === 'fail' ? `${row.failPercent.toFixed(2)}%` : formatInt(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function FacilityTable({ rows, empty }: { rows: AipnFacilityRow[]; empty?: string }) {
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
            <th className="text-right">จำนวน</th>
            <th className="text-right">Reimb</th>
            <th className="text-right">AdjRW</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hcode} className="border-b">
              <td className="py-2">{row.hcode}</td>
              <td>{row.name}</td>
              <td className="text-right tabular-nums">{formatInt(row.visits)}</td>
              <td className="text-right tabular-nums">{formatMoney(row.amount)}</td>
              <td className="text-right tabular-nums">
                {row.adjrw.toLocaleString('th-TH', { maximumFractionDigits: 4 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
