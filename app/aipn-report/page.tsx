'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import AllocationBoard from '@/app/components/AllocationBoard';
import AipnDataUploadPanel from '@/app/components/AipnDataUploadPanel';
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
  const audit =
    page === 'cases' || page === 'allocate' || page === 'reject'
      ? { mode: page, minRw: '' }
      : page === 'rw-cases'
        ? { mode: 'cases', minRw: '2' }
        : page === 'rw-allocate'
          ? { mode: 'allocate', minRw: '2' }
          : page === 'rw-reject'
            ? { mode: 'reject', minRw: '2' }
            : null;
  const auditYear = typeof year === 'number' ? year : new Date().getFullYear();
  const yearOptions = data?.years?.length ? data.years : [auditYear, auditYear - 1, auditYear - 2];

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
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      yAxis: {
        type: 'category',
        data: chartRows.map((row) => `${row.hcode} ${row.name}`.slice(0, 28)),
        axisLabel: { fontSize: 10, color: '#3d4f5a' },
      },
      series: [
        {
          name: 'รายการที่ตรวจผ่าน',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#1a7a6d' },
          emphasis: { focus: 'series' },
          data: chartRows.map((row) => row.passed),
        },
        {
          name: 'ธุรกรรมที่ตรวจไม่ผ่าน',
          type: 'bar',
          stack: 'total',
          itemStyle: { color: '#c5221f' },
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
        axisLine: { lineStyle: { color: '#d8e0e5' } },
      },
      yAxis: { type: 'value', splitNumber: 3, splitLine: { lineStyle: { color: '#eef2f4' } } },
      series: [
        {
          type: 'bar',
          data: data?.byMonth.map((row) => row.total) || [],
          itemStyle: { color: '#0b3d4a', borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 36,
        },
      ],
    }),
    [data]
  );

  const chartHeight = Math.max(360, chartRows.length * 22);

  return (
    <ReportModuleShell
      active="aipn"
      title="แดชบอร์ด AIPN"
      subtitle="รายงานผลการส่งข้อมูลผู้ป่วยใน สิทธิประกันสังคม"
      sidebar={<ReportSidebarNav items={AIPN_PAGES} active={page} onChange={setPage} />}
      actions={
        hasDashboard || page !== 'data' ? (
          <ReportActionButton onClick={() => loadDb(typeof year === 'number' ? year : undefined)}>
            รีเฟรช
          </ReportActionButton>
        ) : null
      }
    >
      {page === 'data' && <AipnDataUploadPanel onImported={handleImported} />}

      {audit && (
        <AllocationBoard
          title={
            page === 'rw-cases'
              ? 'AIPN RW ≥ 2 แยกรายตัว'
              : page === 'rw-allocate'
                ? 'AIPN จัดสรรเงิน RW ≥ 2'
                : page === 'rw-reject'
                  ? 'AIPN ถูกปฏิเสธจ่าย RW ≥ 2'
                  : page === 'allocate'
                    ? 'AIPN จัดสรรเงิน'
                    : page === 'reject'
                      ? 'AIPN ถูกปฏิเสธจ่าย'
                      : 'AIPN แยกรายตัว'
          }
          description="กราฟเรียงตามผลรวม AdjRW จากมากไปน้อย จัดสรรตัดรายการ ft = N ออก ส่วนถูกปฏิเสธคือรายการ ft = N คำอธิบายรหัสมาจาก ICD-10-TM2016"
          endpoint="/api/aipn-report/audit"
          query={audit.minRw ? { mode: audit.mode, minRw: audit.minRw } : { mode: audit.mode }}
          year={auditYear}
          years={yearOptions}
          onYearChange={(next) => {
            setYear(next);
            loadDb(next);
          }}
          amountLabel="ผลรวม AdjRW"
          digits={4}
          variant="simple"
        />
      )}

      {(page !== 'data' || hasDashboard) && !audit && (
        <>
          {error && <ReportAlert>{error}</ReportAlert>}
          {loading ? (
            <ReportLoading />
          ) : !data ? null : (
            <>
              {(page === 'overview' || page === 'data') && (
                <div className="space-y-4">
                  <ReportPageHeader
                    id="aipn-dashboard"
                    title="รายงานผลการส่งข้อมูลผู้ป่วยใน สิทธิประกันสังคม"
                    controls={
                      <ReportYearSelect
                        year={year}
                        years={data.years || []}
                        onChange={(next) => {
                          setYear(next);
                          loadDb(next);
                        }}
                      />
                    }
                    kpis={
                      <>
                        <ReportKpi
                          label="จำนวนธุรกรรม"
                          value={formatInt(data.kpis.transactions)}
                          tone="blue"
                        />
                        <ReportKpi
                          label="รายการที่ตรวจผ่าน"
                          value={formatInt(data.kpis.passed)}
                          tone="green"
                        />
                        <ReportKpi
                          label="ธุรกรรมที่ตรวจไม่ผ่าน"
                          value={formatInt(data.kpis.failed)}
                          tone="red"
                        />
                      </>
                    }
                  />

                  <ReportPanel
                    title="สัดส่วนผ่าน / ไม่ผ่าน แยกหน่วยบริการ"
                    description="ยังไม่มีไฟล์รายการไม่ผ่าน — แสดงเป็นผ่านทั้งหมดจนกว่าจะอัปโหลดข้อมูลเฝ้าระวัง"
                  >
                    <SsopEChart option={passFailOption} height={chartHeight} />
                  </ReportPanel>

                  <div className="report-grid-3">
                    <RankTable title="เรียงลำดับ ตามจำนวนบริการที่พบ" rows={data.topByVolume} mode="volume" />
                    <RankTable
                      title="เรียงลำดับ ตามส่วนบริการที่ไม่ผ่าน"
                      rows={data.topByFailPercent}
                      mode="fail"
                    />
                    <ReportPanel title="จำนวน Admit รายเดือน">
                      <SsopEChart option={monthOption} height={280} />
                    </ReportPanel>
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
                <ReportPanel title="เฝ้าระวังข้อมูลที่ไม่ผ่าน">
                  {data.watchRows.length === 0 ? (
                    <p className="text-sm text-[#5c6b73] py-6 text-center">
                      ยังไม่มีไฟล์รายการที่ไม่ผ่าน — เมื่อมีข้อมูล ส่วนสีแดงในภาพรวมและตารางอันดับจะอัปเดตตาม
                    </p>
                  ) : (
                    <ReportTable>
                      <thead>
                        <tr>
                          <th>รหัส</th>
                          <th>หน่วยบริการ</th>
                          <th>สาเหตุ</th>
                          <th className="text-right">จำนวน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.watchRows.map((row, idx) => (
                          <tr key={`${row.hcode}-${idx}`}>
                            <td>{row.hcode}</td>
                            <td>{row.name}</td>
                            <td>{row.issue}</td>
                            <td className="text-right tabular-nums">{formatInt(row.count)}</td>
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
    <ReportPanel title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-[#5c6b73] text-center py-6">ยังไม่มีข้อมูล</p>
      ) : (
        <ReportTable>
          <thead>
            <tr>
              <th>#</th>
              <th>หน่วยบริการ</th>
              <th className="text-right">{mode === 'fail' ? '% ไม่ผ่าน' : 'จำนวน'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.hcode}>
                <td>{idx + 1}</td>
                <td>
                  <span className="text-[#5c6b73] mr-1">{row.hcode}</span>
                  {row.name}
                </td>
                <td className="text-right tabular-nums">
                  {mode === 'fail' ? `${row.failPercent.toFixed(2)}%` : formatInt(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </ReportTable>
      )}
    </ReportPanel>
  );
}

function FacilityTable({ rows, empty }: { rows: AipnFacilityRow[]; empty?: string }) {
  if (!rows.length) {
    return <ReportEmpty>{empty || 'ไม่พบข้อมูล'}</ReportEmpty>;
  }
  return (
    <ReportPanel title="แยกหน่วยบริการ">
      <ReportTable>
        <thead>
          <tr>
            <th>รหัส</th>
            <th>หน่วยบริการ</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">Reimb</th>
            <th className="text-right">AdjRW</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hcode}>
              <td>{row.hcode}</td>
              <td>{row.name}</td>
              <td className="text-right tabular-nums">{formatInt(row.visits)}</td>
              <td className="text-right tabular-nums">{formatMoney(row.amount)}</td>
              <td className="text-right tabular-nums">
                {row.adjrw.toLocaleString('th-TH', { maximumFractionDigits: 4 })}
              </td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportPanel>
  );
}
