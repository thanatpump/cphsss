'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReportModuleShell from '@/app/components/ReportModuleShell';
import Icd10DataUploadPanel from '@/app/components/Icd10DataUploadPanel';
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
  ICD10_PAGES,
  type Icd10NamedCount,
  type Icd10PageKey,
  type Icd10ReportData,
} from '@/lib/icd10-types';

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
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
          label: { formatter: '{b}\n{d}%', fontSize: 11, color: '#3d4f5a' },
          itemStyle: { borderColor: '#fff', borderWidth: 2 },
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

  const topBar = useMemo(() => {
    const rows = [...(data?.topCodes || [])].reverse();
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ dataIndex: number; value: number }>) => {
          const row = rows[params?.[0]?.dataIndex ?? -1];
          if (!row) return '';
          const disease = row.description || row.name;
          return `${disease}<br/>${row.name}<br/>${row.count.toLocaleString('th-TH')} ครั้ง`;
        },
      },
      grid: { left: 16, right: 24, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      yAxis: {
        type: 'category',
        data: rows.map((row) => row.description || row.name),
        axisLabel: { width: 280, overflow: 'truncate', fontSize: 11, color: '#3d4f5a' },
      },
      series: [
        {
          type: 'bar',
          data: rows.map((row) => row.count),
          itemStyle: { color: '#1a7a6d', borderRadius: [0, 3, 3, 0] },
        },
      ],
    };
  }, [data]);

  return (
    <ReportModuleShell
      active="icd10"
      title="แดชบอร์ด ICD-10"
      subtitle="วิเคราะห์รหัสโรคจากไฟล์ OPD / IPD"
      sidebar={<ReportSidebarNav items={ICD10_PAGES} active={page} onChange={setPage} />}
      actions={
        hasDashboard || page !== 'data' ? (
          <ReportActionButton onClick={() => loadDb(typeof year === 'number' ? year : undefined)}>
            รีเฟรช
          </ReportActionButton>
        ) : null
      }
    >
      {page === 'data' && <Icd10DataUploadPanel onImported={handleImported} />}

      {(page !== 'data' || hasDashboard) && (
        <>
          <ReportPageHeader
            id="icd10-dashboard"
            title={page === 'data' ? 'ภาพรวมข้อมูลหลังอัปโหลด' : 'รายงานรหัสโรค ICD-10'}
            description="ข้อมูลจากไฟล์ OPD*.TXT / IPD*.TXT ที่อัปโหลดในระบบ"
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
                <ReportKpi label="Visit ทั้งหมด" value={formatInt(data?.kpis.visits || 0)} />
                <ReportKpi label="OPD" value={formatInt(data?.kpis.opdVisits || 0)} />
                <ReportKpi label="IPD" value={formatInt(data?.kpis.ipdVisits || 0)} />
                <ReportKpi label="รหัสโรคไม่ซ้ำ" value={formatInt(data?.kpis.uniqueCodes || 0)} />
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
                    <ReportPanel title="สัดส่วน Visit แยก OPD / IPD">
                      <SsopEChart option={typePie} height={320} />
                    </ReportPanel>
                    <ReportPanel title="จำนวน Visit แยกเดือน">
                      <SsopEChart option={monthOption} height={320} />
                    </ReportPanel>
                  </div>
                  <ReportPanel title="โรคที่พบบ่อย (Top 25)" description="ชื่อโรคจาก ICD-10-TM ชี้ที่แท่งเพื่อดูรหัส">
                    <SsopEChart option={topBar} height={640} />
                  </ReportPanel>
                </>
              )}

              {page === 'top' && <CodeTable title="รหัสโรคยอดนิยม" rows={data.topCodes} />}
              {page === 'opd' && <CodeTable title="Top ICD — OPD" rows={data.topOpd} />}
              {page === 'ipd' && <CodeTable title="Top ICD — IPD" rows={data.topIpd} />}
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

function CodeTable({ title, rows }: { title: string; rows: Icd10NamedCount[] }) {
  if (!rows.length) {
    return <ReportEmpty>ยังไม่มีข้อมูล</ReportEmpty>;
  }
  return (
    <ReportPanel title={title}>
      <ReportTable>
        <thead>
          <tr>
            <th>#</th>
            <th>ICD-10</th>
            <th>คำอธิบาย ICD-10-TM</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">ร้อยละ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.name}>
              <td>{idx + 1}</td>
              <td className="font-medium">{row.name}</td>
              <td>{row.description || '-'}</td>
              <td className="text-right tabular-nums">{formatInt(row.count)}</td>
              <td className="text-right tabular-nums">{row.percent.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportPanel>
  );
}
