'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import ChronicDataUploadPanel from '@/app/components/ChronicDataUploadPanel';
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
  CHRONIC_PAGES,
  type ChronicNamedCount,
  type ChronicPageKey,
  type ChronicReportData,
} from '@/lib/chronic-types';

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
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
      color: ['#1a7a6d', '#c4a35a', '#0b3d4a'],
      series: [
        {
          type: 'pie',
          radius: ['28%', '68%'],
          data: (data?.byConfirm || []).map((row) => ({ name: row.name, value: row.count })),
          label: { formatter: '{b}\n{d}%', fontSize: 11, color: '#3d4f5a' },
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
        },
      ],
    }),
    [data]
  );

  const typeBar = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 48 },
      xAxis: {
        type: 'category',
        data: data?.byType.map((row) => row.name) || [],
        axisLine: { lineStyle: { color: '#d8e0e5' } },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      series: [
        {
          type: 'bar',
          data: data?.byType.map((row) => row.count) || [],
          itemStyle: { color: '#1a7a6d', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 48,
        },
      ],
    }),
    [data]
  );

  const diseaseBar = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 56, right: 24, top: 16, bottom: 32 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      yAxis: {
        type: 'category',
        data: [...(data?.byDisease || [])].slice(0, 15).reverse().map((row) => row.name),
        axisLabel: { color: '#3d4f5a' },
      },
      series: [
        {
          type: 'bar',
          data: [...(data?.byDisease || [])].slice(0, 15).reverse().map((row) => row.count),
          itemStyle: { color: '#0b3d4a', borderRadius: [0, 3, 3, 0] },
        },
      ],
    }),
    [data]
  );

  const monthOption = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 48, right: 16, top: 24, bottom: 32 },
      xAxis: {
        type: 'category',
        data: data?.byMonth.map((row) => row.label) || [],
        axisLine: { lineStyle: { color: '#d8e0e5' } },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      series: [
        {
          type: 'bar',
          data: data?.byMonth.map((row) => row.count) || [],
          itemStyle: { color: '#1a7a6d', borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 40,
        },
      ],
    }),
    [data]
  );

  return (
    <ReportModuleShell
      active="chronic"
      title="แดชบอร์ดโรคเรื้อรัง"
      subtitle="SSOP ACD — ยืนยันและรายละเอียดโรคเรื้อรัง"
      sidebar={<ReportSidebarNav items={CHRONIC_PAGES} active={page} onChange={setPage} />}
      actions={
        hasDashboard || page !== 'data' ? (
          <ReportActionButton onClick={() => loadDb(typeof year === 'number' ? year : undefined)}>
            รีเฟรช
          </ReportActionButton>
        ) : null
      }
    >
      {page === 'data' && <ChronicDataUploadPanel onImported={handleImported} />}

      {(page !== 'data' || hasDashboard) && (
        <>
          <ReportPageHeader
            id="chronic-dashboard"
            title={page === 'data' ? 'ภาพรวมข้อมูลหลังอัปโหลด' : 'รายงานโรคเรื้อรัง (ACD)'}
            description="ข้อมูลจาก ACDCONF / acddetail ที่อัปโหลดในระบบ"
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
                <ReportKpi label="เคสทั้งหมด" value={formatInt(data?.kpis.cases || 0)} />
                <ReportKpi label="ยืนยันแล้ว" value={formatInt(data?.kpis.confirmed || 0)} tone="green" />
                <ReportKpi label="รอยืนยัน" value={formatInt(data?.kpis.pending || 0)} />
                <ReportKpi label="NEW" value={formatInt(data?.kpis.newCases || 0)} tone="blue" />
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
                    <ReportPanel title="สถานะการยืนยัน">
                      <SsopEChart option={confirmPie} height={300} />
                    </ReportPanel>
                    <ReportPanel title="แยกประเภท (Type)">
                      <SsopEChart option={typeBar} height={300} />
                    </ReportPanel>
                  </div>
                  <div className="report-grid-2">
                    <ReportPanel title="รหัสโรคเรื้อรัง Top 15">
                      <SsopEChart option={diseaseBar} height={360} />
                    </ReportPanel>
                    <ReportPanel title="FirstDate แยกเดือน">
                      <SsopEChart option={monthOption} height={360} />
                    </ReportPanel>
                  </div>
                  <div className="report-kpi-row">
                    <ReportKpi label="รหัสโรคไม่ซ้ำ" value={formatInt(data.kpis.diseaseCodes)} />
                    <ReportKpi label="Visit ใน acddetail" value={formatInt(data.kpis.detailVisits)} />
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

function CountTable({ title, rows }: { title: string; rows: ChronicNamedCount[] }) {
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
