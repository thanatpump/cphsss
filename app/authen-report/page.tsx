'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import SsopEChart from '@/app/components/SsopEChart';
import AuthDateRangeFilter, {
  buildDateRangeParams,
  getDateRangeSummary,
} from '@/app/components/AuthDateRangeFilter';
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
} from '@/app/components/ReportUi';
import {
  AUTHEN_PAGES,
  type AuthenFacilityRow,
  type AuthenNamedCount,
  type AuthenPageKey,
  type AuthenReportData,
} from '@/lib/authen-types';

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
}

export default function AuthenReportPage() {
  const [page, setPage] = useState<AuthenPageKey>('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState<AuthenReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDb = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = buildDateRangeParams(dateFrom, dateTo);
      const res = await fetch(`/api/authen-report?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'โหลดรายงานไม่สำเร็จ');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadDb();
  }, [loadDb]);

  const typePie = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      color: ['#1a7a6d', '#0b3d4a', '#5c6b73', '#7dcdc0', '#c4a35a', '#b45309'],
      series: [
        {
          type: 'pie',
          radius: ['28%', '68%'],
          data: (data?.byAuthType || []).map((row) => ({ name: row.name, value: row.count })),
          label: { formatter: '{b}\n{d}%', fontSize: 11, color: '#3d4f5a' },
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
        },
      ],
    }),
    [data]
  );

  const verifyBar = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 32 },
      xAxis: {
        type: 'category',
        data: ['ทั้งหมด', 'ยืนยันตัวตน', 'ไม่ได้ยืนยันตัวตน'],
        axisLine: { lineStyle: { color: '#d8e0e5' } },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      series: [
        {
          type: 'bar',
          data: [
            { value: data?.kpis.total || 0, itemStyle: { color: '#0b3d4a' } },
            { value: data?.kpis.withCard || 0, itemStyle: { color: '#1a7a6d' } },
            { value: data?.kpis.noCard || 0, itemStyle: { color: '#b45309' } },
          ],
          barMaxWidth: 56,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
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
      xAxis: {
        type: 'category',
        data: data?.byMonth.map((row) => row.label) || [],
        axisLine: { lineStyle: { color: '#d8e0e5' } },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      series: [
        {
          name: 'ยืนยันตัวตน',
          type: 'bar',
          stack: 'v',
          itemStyle: { color: '#1a7a6d' },
          data: data?.byMonth.map((row) => row.withCard) || [],
        },
        {
          name: 'ไม่ได้ยืนยันตัวตน',
          type: 'bar',
          stack: 'v',
          itemStyle: { color: '#b45309' },
          data: data?.byMonth.map((row) => row.noCard) || [],
        },
      ],
    }),
    [data]
  );

  const topFacilityBar = useMemo(() => {
    const rows = [...(data?.byFacility || [])].slice(0, 15).reverse();
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { left: 140, right: 24, top: 36, bottom: 24 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      yAxis: {
        type: 'category',
        data: rows.map((row) => `${row.hcode} ${row.name}`.slice(0, 28)),
        axisLabel: { fontSize: 10, color: '#3d4f5a' },
      },
      series: [
        {
          name: 'ยืนยันตัวตน',
          type: 'bar',
          stack: 't',
          itemStyle: { color: '#1a7a6d' },
          data: rows.map((row) => row.withCard),
        },
        {
          name: 'ไม่ได้ยืนยันตัวตน',
          type: 'bar',
          stack: 't',
          itemStyle: { color: '#b45309' },
          data: rows.map((row) => row.noCard),
        },
      ],
    };
  }, [data]);

  const rangeLabel = getDateRangeSummary(dateFrom, dateTo);

  return (
    <ReportModuleShell
      active="authen"
      title="ชุดข้อมูลการยืนยันตน"
      subtitle="รายงานจากตาราง authen_code ในระบบ"
      sidebar={<ReportSidebarNav items={AUTHEN_PAGES} active={page} onChange={setPage} />}
      actions={<ReportActionButton onClick={loadDb}>รีเฟรช</ReportActionButton>}
    >
      <ReportPageHeader
        id="authen-dashboard"
        title="ชุดข้อมูลการยืนยันตัวตน"
        description={`ข้อมูลจากระบบ authen_code · ช่วงเวลา: ${rangeLabel}`}
        controls={
          <AuthDateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={({ dateFrom: from, dateTo: to }) => {
              setDateFrom(from);
              setDateTo(to);
            }}
            onClear={() => {
              setDateFrom('');
              setDateTo('');
            }}
          />
        }
        kpis={
          <>
            <ReportKpi label="รายการทั้งหมด" value={formatInt(data?.kpis.total || 0)} />
            <ReportKpi
              label="ยืนยันตัวตน"
              value={formatInt(data?.kpis.withCard || 0)}
              tone="green"
            />
            <ReportKpi
              label="ไม่ได้ยืนยันตัวตน"
              value={formatInt(data?.kpis.noCard || 0)}
              tone="red"
            />
            <ReportKpi
              label="% ยืนยันตัวตน"
              value={`${(data?.kpis.withCardPercent || 0).toFixed(1)}%`}
              tone="blue"
            />
          </>
        }
      />

      {error && <ReportAlert>{error}</ReportAlert>}
      {loading ? (
        <ReportLoading />
      ) : !data ? null : (
        <>
          {page === 'overview' && (
            <>
              <div className="report-grid-2">
                <ReportPanel title="สรุปการยืนยันตัวตน">
                  <SsopEChart option={verifyBar} height={300} />
                </ReportPanel>
                <ReportPanel title="สัดส่วนแยกประเภท Auth">
                  <SsopEChart option={typePie} height={300} />
                </ReportPanel>
              </div>
              <div className="report-grid-2">
                <ReportPanel title="แนวโน้มรายเดือน">
                  <SsopEChart option={monthOption} height={320} />
                </ReportPanel>
                <ReportPanel title="หน่วยบริการ Top 15">
                  <SsopEChart option={topFacilityBar} height={320} />
                </ReportPanel>
              </div>
              <div className="report-kpi-row">
                <ReportKpi label="จำนวนหน่วยบริการ" value={formatInt(data.kpis.facilities)} />
              </div>
            </>
          )}

          {page === 'facilities' && <FacilityTable rows={data.byFacility} />}
          {page === 'auth-type' && <TypeTable rows={data.byAuthType} />}
          {page === 'monthly' && (
            <ReportPanel title="สรุปรายเดือน">
              {data.byMonth.length === 0 ? (
                <p className="text-sm text-[#5c6b73] text-center py-8">ยังไม่มีข้อมูลรายเดือน</p>
              ) : (
                <ReportTable>
                  <thead>
                    <tr>
                      <th>เดือน</th>
                      <th className="text-right">ทั้งหมด</th>
                      <th className="text-right">ยืนยันตัวตน</th>
                      <th className="text-right">ไม่ได้ยืนยัน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byMonth.map((row) => (
                      <tr key={row.month}>
                        <td>{row.label}</td>
                        <td className="text-right tabular-nums">{formatInt(row.total)}</td>
                        <td className="text-right tabular-nums">{formatInt(row.withCard)}</td>
                        <td className="text-right tabular-nums">{formatInt(row.noCard)}</td>
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
    </ReportModuleShell>
  );
}

function FacilityTable({ rows }: { rows: AuthenFacilityRow[] }) {
  if (!rows.length) {
    return <ReportEmpty>ยังไม่มีข้อมูลหน่วยบริการ</ReportEmpty>;
  }
  return (
    <ReportPanel title="แยกหน่วยบริการ">
      <ReportTable>
        <thead>
          <tr>
            <th>#</th>
            <th>รหัส</th>
            <th>หน่วยบริการ</th>
            <th className="text-right">ทั้งหมด</th>
            <th className="text-right">ยืนยันตัวตน</th>
            <th className="text-right">ไม่ได้ยืนยัน</th>
            <th className="text-right">% ยืนยัน</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.hcode}>
              <td>{idx + 1}</td>
              <td>{row.hcode}</td>
              <td>{row.name}</td>
              <td className="text-right tabular-nums">{formatInt(row.total)}</td>
              <td className="text-right tabular-nums">{formatInt(row.withCard)}</td>
              <td className="text-right tabular-nums">{formatInt(row.noCard)}</td>
              <td className="text-right tabular-nums">{row.withCardPercent.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportPanel>
  );
}

function TypeTable({ rows }: { rows: AuthenNamedCount[] }) {
  if (!rows.length) {
    return <ReportEmpty>ยังไม่มีข้อมูลประเภท Auth</ReportEmpty>;
  }
  return (
    <ReportPanel title="แยกประเภท Auth">
      <ReportTable>
        <thead>
          <tr>
            <th>#</th>
            <th>ประเภท</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">ร้อยละ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.name}>
              <td>{idx + 1}</td>
              <td className="font-medium">{row.name}</td>
              <td className="text-right tabular-nums">{formatInt(row.count)}</td>
              <td className="text-right tabular-nums">{row.percent.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportPanel>
  );
}
