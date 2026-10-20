'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import SsopEChart from '@/app/components/SsopEChart';
import SsopDataUploadPanel from '@/app/components/SsopDataUploadPanel';
import ReportModuleShell from '@/app/components/ReportModuleShell';
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

  const districtNames = useMemo(() => data?.byDistrict.map((row) => row.name) || [], [data]);

  const pieOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      color: DISTRICT_COLORS,
      series: [
        {
          type: 'pie',
          radius: ['28%', '68%'],
          data: (data?.byDistrict || []).map((row) => ({ name: row.name, value: row.count })),
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
      legend: { type: 'scroll', bottom: 0 },
      color: DISTRICT_COLORS,
      grid: { left: 48, right: 16, top: 24, bottom: 64 },
      xAxis: {
        type: 'category',
        data: data?.byMonth.map((row) => row.label) || [],
        axisLine: { lineStyle: { color: '#d8e0e5' } },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
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
      xAxis: {
        type: 'category',
        data: data?.byFacilityType.map((row) => row.name) || [],
        axisLine: { lineStyle: { color: '#d8e0e5' } },
      },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
      series: [
        {
          type: 'bar',
          data: data?.byFacilityType.map((row) => row.count) || [],
          itemStyle: { color: '#1a7a6d', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 48,
        },
      ],
    }),
    [data]
  );

  const districtsByCount = [...(data?.byDistrict || [])]
    .filter((row) => row.name !== 'ไม่ระบุอำเภอ')
    .sort((a, b) => b.count - a.count);
  const topDistricts = districtsByCount.slice(0, 10);
  const bottomDistricts = [...districtsByCount].reverse().slice(0, 10);
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

  return (
    <ReportModuleShell
      active="ssop"
      title="แดชบอร์ด SSOP"
      subtitle="รายงานผลการส่งข้อมูลผู้ป่วยนอกสิทธิประกันสังคม"
      sidebar={<ReportSidebarNav items={SSOP_PAGES} active={page} onChange={setPage} />}
      actions={
        showReportChrome ? (
          <>
            <ReportActionButton onClick={download}>ดาวน์โหลด</ReportActionButton>
            <ReportActionButton onClick={() => loadDb(typeof year === 'number' ? year : undefined)}>
              รีเฟรช
            </ReportActionButton>
          </>
        ) : null
      }
    >
      {page === 'data' && <SsopDataUploadPanel onImported={handleImported} />}

      {(page !== 'data' || hasDashboard) && (
        <>
          <ReportPageHeader
            id="ssop-dashboard"
            title={
              page === 'data'
                ? 'ภาพรวมข้อมูลหลังอัปโหลด'
                : 'รายงานผลการส่งข้อมูลผู้ป่วยนอก สิทธิประกันสังคม'
            }
            description="ข้อมูลจากไฟล์ SSOP ที่อัปโหลดในระบบ (SOGNSTMM / SOGNSTMP)"
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
                <ReportKpi label="จำนวนคนไข้ทั้งหมด" value={formatInt(data?.kpis.patients || 0)} />
                <ReportKpi label="จำนวนเงินเฉลี่ย" value={formatMoney(data?.kpis.avgAmount || 0)} />
                <ReportKpi label="จำนวนหน่วยบริการ" value={formatInt(data?.kpis.facilities || 0)} />
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
                    <ReportPanel title="สัดส่วนที่ส่งข้อมูลแยกอำเภอ">
                      <SsopEChart option={pieOption} height={360} />
                    </ReportPanel>
                    <ReportPanel title="จำนวนที่ส่งข้อมูลแยกเดือน">
                      <SsopEChart option={monthOption} height={360} />
                    </ReportPanel>
                  </div>
                  <div className="report-grid-2">
                    <RankTable title="ส่งข้อมูลสูงสุด" rows={topDistricts} />
                    <RankTable title="ส่งข้อมูลต่ำสุด" rows={bottomDistricts} />
                  </div>
                  <ReportPanel title="จำนวนส่งข้อมูลแยกประเภทหน่วยบริการ">
                    <SsopEChart option={typeOption} height={280} />
                  </ReportPanel>
                </>
              )}

              {page === 'district' && <RankTable title="สรุปแยกอำเภอ" rows={data.byDistrict} showAmount />}
              {page === 'facility' && <FacilityTable rows={data.facilities} />}
              {page === 'facility-month' && <FacilityMonthTable rows={data.facilityMonths} />}
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
  showAmount = false,
}: {
  title: string;
  rows: Array<{ name: string; count: number; percent: number; amount: number }>;
  showAmount?: boolean;
}) {
  return (
    <ReportPanel title={title}>
      <ReportTable>
        <thead>
          <tr>
            <th>#</th>
            <th>อำเภอ</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">ร้อยละ</th>
            {showAmount && <th className="text-right">จำนวนเงิน</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.name}>
              <td>{idx + 1}</td>
              <td>{row.name}</td>
              <td className="text-right tabular-nums">{formatInt(row.count)}</td>
              <td className="text-right tabular-nums">{row.percent.toFixed(1)}</td>
              {showAmount && (
                <td className="text-right tabular-nums">{formatMoney(row.amount)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportPanel>
  );
}

function FacilityTable({ rows, empty }: { rows: SsopReportData['facilities']; empty?: string }) {
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
            <th>อำเภอ</th>
            <th>ประเภท</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.hcode}>
              <td>{row.hcode}</td>
              <td>{row.name}</td>
              <td>{row.district}</td>
              <td>{row.type}</td>
              <td className="text-right tabular-nums">{formatInt(row.visits)}</td>
              <td className="text-right tabular-nums">{formatMoney(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportPanel>
  );
}

function FacilityMonthTable({ rows }: { rows: SsopReportData['facilityMonths'] }) {
  return (
    <ReportPanel title="แยกหน่วยบริการรายเดือน">
      <ReportTable>
        <thead>
          <tr>
            <th>เดือน</th>
            <th>รหัส</th>
            <th>หน่วยบริการ</th>
            <th>อำเภอ</th>
            <th className="text-right">จำนวน</th>
            <th className="text-right">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.hcode}-${row.month}`}>
              <td>{row.monthLabel}</td>
              <td>{row.hcode}</td>
              <td>{row.name}</td>
              <td>{row.district}</td>
              <td className="text-right tabular-nums">{formatInt(row.visits)}</td>
              <td className="text-right tabular-nums">{formatMoney(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </ReportTable>
    </ReportPanel>
  );
}
