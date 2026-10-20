'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import EclaimDataUploadPanel from '@/app/components/EclaimDataUploadPanel';
import SsopEChart from '@/app/components/SsopEChart';
import {
  ReportActionButton,
  ReportAlert,
  ReportEmpty,
  ReportKpi,
  ReportLoading,
  ReportMeta,
  ReportPageHeader,
  ReportPanel,
  ReportSidebarNav,
  ReportTable,
  ReportYearSelect,
} from '@/app/components/ReportUi';
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
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      yAxis: {
        type: 'category',
        data: [...(data?.byFacility || [])].slice(0, 12).reverse().map((row) => row.name.slice(0, 28)),
        axisLabel: { fontSize: 10, color: '#3d4f5a' },
      },
      series: [
        {
          type: 'bar',
          data: [...(data?.byFacility || [])].slice(0, 12).reverse().map((row) => row.amount),
          itemStyle: { color: '#1a7a6d', borderRadius: [0, 3, 3, 0] },
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
        axisLine: { lineStyle: { color: '#d8e0e5' } },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      series: [
        {
          type: 'bar',
          data: (data?.byPayFacility || []).slice(0, 10).map((row) => row.amount),
          itemStyle: { color: '#0b3d4a', borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 40,
        },
      ],
    }),
    [data]
  );

  return (
    <ReportModuleShell
      active="eclaim"
      title="แดชบอร์ด E-claim"
      subtitle="ใบคำขอเบิกค่าบริการและรายงานพึงรับ-พึงจ่าย"
      sidebar={<ReportSidebarNav items={ECLAIM_PAGES} active={page} onChange={setPage} />}
      actions={
        hasDashboard || page !== 'data' ? (
          <ReportActionButton onClick={() => loadDb(typeof year === 'number' ? year : undefined)}>
            รีเฟรช
          </ReportActionButton>
        ) : null
      }
    >
      {page === 'data' && <EclaimDataUploadPanel onImported={handleImported} />}

      {(page !== 'data' || hasDashboard) && (
        <>
          <ReportPageHeader
            id="eclaim-dashboard"
            title={page === 'data' ? 'ภาพรวมข้อมูลหลังอัปโหลด' : 'รายงาน E-claim'}
            description="ข้อมูลจาก STM และรายงานพึงรับ-พึงจ่าย"
            controls={
              <ReportYearSelect
                year={year}
                years={data?.years || []}
                onChange={(next) => {
                  setYear(next);
                  loadDb(next);
                }}
              />
            }
            kpis={
              <>
                <ReportKpi label="รายการ STM" value={formatInt(data?.kpis.claims || 0)} />
                <ReportKpi label="พึงรับ (STM)" value={formatMoney(data?.kpis.receiveTotal || 0)} />
                <ReportKpi label="พึงจ่าย" value={formatMoney(data?.kpis.payTotal || 0)} />
                <ReportKpi label="เอกสาร" value={formatInt(data?.kpis.docs || 0)} />
              </>
            }
          />

          {error && <ReportAlert>{error}</ReportAlert>}
          {loading ? (
            <ReportLoading />
          ) : !data ? null : (
            <>
              {(page === 'overview' || page === 'data') && (
                <>
                  <div className="report-grid-2">
                    <ReportPanel title="พึงรับตามหน่วยรักษา (STM)">
                      <SsopEChart option={facilityBar} height={360} />
                    </ReportPanel>
                    <ReportPanel title="ยอดพึงจ่ายตามหน่วย">
                      <SsopEChart option={payBar} height={360} />
                    </ReportPanel>
                  </div>
                  <MoneyTable title="แยก HTYPE" rows={data.byHtype} />
                </>
              )}

              {page === 'stm' && (
                <ReportPanel title="รายการ STM ยอดพึงรับสูงสุด">
                  {data.topClaims.length === 0 ? (
                    <p className="text-sm text-[#5c6b73] text-center py-8">ยังไม่มีข้อมูล</p>
                  ) : (
                    <ReportTable>
                      <thead>
                        <tr>
                          <th>REP</th>
                          <th>HN</th>
                          <th>ชื่อ</th>
                          <th>HCODE</th>
                          <th className="text-right">ขอเบิก</th>
                          <th className="text-right">พึงรับ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topClaims.map((row, idx) => (
                          <tr key={`${row.rep}-${row.hn}-${idx}`}>
                            <td>{row.rep}</td>
                            <td>{row.hn}</td>
                            <td>{row.name}</td>
                            <td>{row.hcode}</td>
                            <td className="text-right tabular-nums">{formatMoney(row.claimAmt)}</td>
                            <td className="text-right tabular-nums">{formatMoney(row.receiveTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </ReportTable>
                  )}
                </ReportPanel>
              )}

              {page === 'pay' && <MoneyTable title="พึงรับ-พึงจ่าย แยกหน่วย" rows={data.byPayFacility} />}
              {page === 'summary' && (
                <ReportPanel title="สรุปราย REP (จากชีต summary)">
                  {data.summaryRows.length === 0 ? (
                    <p className="text-sm text-[#5c6b73] text-center py-8">ยังไม่มีข้อมูลสรุป</p>
                  ) : (
                    <ReportTable>
                      <thead>
                        <tr>
                          <th>REP</th>
                          <th>HCODE</th>
                          <th className="text-right">ทั้งหมด</th>
                          <th className="text-right">ผ่าน</th>
                          <th className="text-right">ไม่ผ่าน</th>
                          <th className="text-right">พึงรับ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.summaryRows.map((row) => (
                          <tr key={`${row.repNo}-${row.hcode}`}>
                            <td>{row.repNo}</td>
                            <td>{row.hcode}</td>
                            <td className="text-right tabular-nums">{formatInt(row.totalCases)}</td>
                            <td className="text-right tabular-nums">{formatInt(row.passCases)}</td>
                            <td className="text-right tabular-nums">{formatInt(row.failCases)}</td>
                            <td className="text-right tabular-nums">{formatMoney(row.receiveTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </ReportTable>
                  )}
                </ReportPanel>
              )}
            </>
          )}

          <ReportMeta>
            วันที่อัปเดตข้อมูลล่าสุด:{' '}
            {data?.updatedAt
              ? new Date(data.updatedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
              : '-'}
          </ReportMeta>
        </>
      )}
    </ReportModuleShell>
  );
}

function MoneyTable({ title, rows }: { title: string; rows: EclaimNamedCount[] }) {
  if (!rows.length) {
    return <ReportEmpty>ยังไม่มีข้อมูล</ReportEmpty>;
  }
  return (
    <ReportPanel title={title}>
      <ReportTable>
        <thead>
          <tr>
            <th>#</th>
            <th>รายการ</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">ยอดเงิน</th>
            <th className="text-right">ร้อยละ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.name}>
              <td>{idx + 1}</td>
              <td className="font-medium">{row.name}</td>
              <td className="text-right tabular-nums">{formatInt(row.count)}</td>
              <td className="text-right tabular-nums">{formatMoney(row.amount)}</td>
              <td className="text-right tabular-nums">{row.percent.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportPanel>
  );
}
