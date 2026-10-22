'use client';

import { useEffect, useMemo, useState } from 'react';
import SsopEChart from '@/app/components/SsopEChart';
import {
  ReportAlert,
  ReportEmpty,
  ReportKpi,
  ReportLoading,
  ReportPageHeader,
  ReportPanel,
  ReportTable,
  ReportYearSelect,
} from '@/app/components/ReportUi';

interface FacilityBar {
  hcode: string;
  name: string;
  kind: 'hospital' | 'pcu';
  count: number;
  amount: number;
}

interface AuditCase {
  id: string;
  statement: string;
  hcode: string;
  hname: string;
  patient: string;
  hn: string;
  visitAt: string;
  amount: number;
  primaryCode: string;
  primaryDesc: string;
  secondary: string;
  late: string;
  sameDay: number;
  sameMonth: number;
  authen: string;
  reasons: string;
}

interface AuditData {
  total: number;
  amount: number;
  page: number;
  pageSize: number;
  caseTotal?: number;
  hospitals: FacilityBar[];
  pcus: FacilityBar[];
  cases: AuditCase[];
}

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
}

function formatAmount(value: number, digits: number) {
  return value.toLocaleString('th-TH', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function FacilityList({
  rows,
  digits,
  active,
  onPick,
}: {
  rows: FacilityBar[];
  digits: number;
  active: string;
  onPick: (hcode: string) => void;
}) {
  const ordered = [...rows].sort((a, b) => a.hcode.localeCompare(b.hcode, 'th'));
  return (
    <ReportTable>
      <thead>
        <tr>
          <th>รหัส</th>
          <th>ชื่อ</th>
          <th className="text-right">ครั้ง</th>
          <th className="text-right">ยอด</th>
        </tr>
      </thead>
      <tbody>
        {ordered.map((row) => (
          <tr
            key={row.hcode}
            className={`cursor-pointer ${active === row.hcode ? 'bg-[#e8f4f2]' : ''}`}
            onClick={() => onPick(active === row.hcode ? '' : row.hcode)}
          >
            <td>{row.hcode}</td>
            <td>{row.name}</td>
            <td className="text-right tabular-nums">{formatInt(row.count)}</td>
            <td className="text-right tabular-nums">{formatAmount(row.amount, digits)}</td>
          </tr>
        ))}
      </tbody>
    </ReportTable>
  );
}

function barOption(rows: FacilityBar[], digits: number) {
  const ordered = [...rows].reverse();
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const row = ordered[params?.[0]?.dataIndex ?? -1];
        if (!row) return '';
        return `${row.hcode} ${row.name}<br/>${formatInt(row.count)} ครั้ง<br/>${formatAmount(row.amount, digits)}`;
      },
    },
    grid: { left: 16, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f4' } } },
    yAxis: {
      type: 'category',
      data: ordered.map((row) => `${row.hcode} ${row.name}`),
      axisLabel: { width: 180, overflow: 'truncate', color: '#3d4f5a' },
    },
    series: [
      {
        type: 'bar',
        data: ordered.map((row) => row.amount),
        itemStyle: { color: '#1a7a6d', borderRadius: [0, 4, 4, 0] },
        barMaxWidth: 22,
      },
    ],
  };
}

export default function AllocationBoard({
  title,
  description,
  endpoint,
  query,
  year,
  years,
  onYearChange,
  amountLabel,
  countLabel = 'จำนวนครั้ง',
  digits = 2,
  variant = 'ssop',
  primaryTitle = 'โรงพยาบาล',
  secondaryTitle = 'รพ.สต.',
  hideEmptyGroup = false,
}: {
  title: string;
  description: string;
  endpoint: string;
  query: Record<string, string>;
  year: number;
  years: number[];
  onYearChange: (year: number) => void;
  amountLabel: string;
  countLabel?: string;
  digits?: number;
  variant?: 'ssop' | 'simple';
  primaryTitle?: string;
  secondaryTitle?: string;
  hideEmptyGroup?: boolean;
}) {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hcode, setHcode] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setHcode('');
    setPage(1);
  }, [year, endpoint, JSON.stringify(query)]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ ...query, year: String(year), page: String(page) });
    if (hcode) params.set('hcode', hcode);
    setLoading(true);
    setError('');
    fetch(`${endpoint}?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'โหลดไม่สำเร็จ');
        setData(json.data);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'โหลดไม่สำเร็จ');
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, year, page, hcode, JSON.stringify(query)]);

  const pick = (label: string) => {
    const code = label.split(' ')[0];
    setPage(1);
    setHcode((current) => (current === code ? '' : code));
  };

  const hospitalOption = useMemo(() => barOption(data?.hospitals || [], digits), [data, digits]);
  const pcuOption = useMemo(() => barOption(data?.pcus || [], digits), [data, digits]);
  const caseTotal = data?.caseTotal ?? data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(caseTotal / (data?.pageSize || 80)));

  return (
    <div className="space-y-4">
      <ReportPageHeader
        title={title}
        description={description}
        controls={<ReportYearSelect year={year} years={years} onChange={onYearChange} />}
        kpis={
          <>
            <ReportKpi label={countLabel} value={formatInt(data?.total || 0)} />
            <ReportKpi label={amountLabel} value={formatAmount(data?.amount || 0, digits)} />
            <ReportKpi
              label="หน่วยที่แสดง"
              value={formatInt((data?.hospitals.length || 0) + (data?.pcus.length || 0))}
            />
          </>
        }
      />
      {error && <ReportAlert>{error}</ReportAlert>}
      {loading && !data ? (
        <ReportLoading />
      ) : !data || data.total === 0 ? (
        <ReportEmpty>ไม่พบรายการในปีนี้ตามเงื่อนไขของเมนู</ReportEmpty>
      ) : (
        <>
          <div className="report-grid-2">
            <ReportPanel title={primaryTitle} description="กราฟเรียงจากมากไปน้อย กดแท่งหรือแถวเพื่อดูรายตัว">
              {data.hospitals.length === 0 ? (
                <ReportEmpty>ไม่มีรายการโรงพยาบาล</ReportEmpty>
              ) : (
                <>
                  <SsopEChart
                    option={hospitalOption}
                    height={Math.max(240, data.hospitals.length * 28)}
                    onPointClick={pick}
                  />
                  <FacilityList
                    rows={data.hospitals}
                    digits={digits}
                    active={hcode}
                    onPick={(code) => {
                      setPage(1);
                      setHcode(code);
                    }}
                  />
                </>
              )}
            </ReportPanel>
            {!hideEmptyGroup || data.pcus.length > 0 ? (
            <ReportPanel title={secondaryTitle} description="แยกจากโรงพยาบาล ตารางเรียงตามรหัส">
              {data.pcus.length === 0 ? (
                <ReportEmpty>ไม่มีรายการ รพ.สต.</ReportEmpty>
              ) : (
                <>
                  <SsopEChart option={pcuOption} height={Math.max(240, data.pcus.length * 28)} onPointClick={pick} />
                  <FacilityList
                    rows={data.pcus}
                    digits={digits}
                    active={hcode}
                    onPick={(code) => {
                      setPage(1);
                      setHcode(code);
                    }}
                  />
                </>
              )}
            </ReportPanel>
            ) : null}
          </div>

          <ReportPanel
            title={hcode ? `รายตัวของ ${hcode}` : 'รายตัว'}
            description="Statement คือเลขที่เอกสาร STM / STMdoc"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              {hcode && (
                <button type="button" className="text-[#1a7a6d] font-semibold" onClick={() => setHcode('')}>
                  ดูทุกรายการ
                </button>
              )}
              <span className="text-[#5c6b73]">{formatInt(caseTotal)} รายการ</span>
            </div>
            <ReportTable>
              <thead>
                <tr>
                  <th>Statement</th>
                  <th>หน่วย</th>
                  <th>ผู้รับบริการ</th>
                  <th>วันที่</th>
                  <th>รหัสหลัก</th>
                  <th>คำอธิบาย</th>
                  <th>รหัสรอง</th>
                  {variant === 'ssop' && (
                    <>
                      <th>เกิน 366 วัน</th>
                      <th className="text-right">ซ้ำในวัน</th>
                      <th className="text-right">ซ้ำในเดือน</th>
                      <th>Authen</th>
                    </>
                  )}
                  <th>เหตุผล</th>
                  <th className="text-right">{amountLabel}</th>
                </tr>
              </thead>
              <tbody>
                {data.cases.map((row) => (
                  <tr key={row.id}>
                    <td>{row.statement || '-'}</td>
                    <td>
                      <span className="text-[#5c6b73] mr-1">{row.hcode}</span>
                      {row.hname}
                    </td>
                    <td>
                      {row.patient || '-'}
                      {row.hn ? <span className="block text-xs text-[#5c6b73]">HN {row.hn}</span> : null}
                    </td>
                    <td>{row.visitAt || '-'}</td>
                    <td>{row.primaryCode || '-'}</td>
                    <td>{row.primaryDesc || '-'}</td>
                    <td className="max-w-sm whitespace-normal align-top">
                      {row.secondary ? (
                        <div className="-my-1">
                          {row.secondary.split(' | ').map((item, index) => (
                            <div
                              key={`${row.id}-${index}`}
                              className={index > 0 ? 'mt-1.5 border-t border-[#c5d4da] pt-1.5' : ''}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    {variant === 'ssop' && (
                      <>
                        <td>{row.late}</td>
                        <td className="text-right tabular-nums">{row.sameDay || '-'}</td>
                        <td className="text-right tabular-nums">{row.sameMonth || '-'}</td>
                        <td>{row.authen}</td>
                      </>
                    )}
                    <td className="max-w-xs whitespace-normal">{row.reasons || '-'}</td>
                    <td className="text-right tabular-nums">{formatAmount(row.amount, digits)}</td>
                  </tr>
                ))}
              </tbody>
            </ReportTable>
            {pageCount > 1 && (
              <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                <button
                  type="button"
                  className="px-3 py-1 border border-[#d8e0e5] rounded disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  ก่อนหน้า
                </button>
                <span>
                  {page} / {pageCount}
                </span>
                <button
                  type="button"
                  className="px-3 py-1 border border-[#d8e0e5] rounded disabled:opacity-40"
                  disabled={page >= pageCount}
                  onClick={() => setPage((value) => value + 1)}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </ReportPanel>
        </>
      )}
    </div>
  );
}
