'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type RowCategory = 'matched' | 'mismatch' | 'only-authen' | 'only-stmm';

type CompareMetric = 'joined_total' | 'vm_match' | 'match_rate' | 'only_authen' | 'only_stmm';

interface ComparePoint {
  hcode: string;
  label: string;
  is_self: boolean;
  joined_total: number;
  vm_match: number;
  vm_mismatch: number;
  match_rate: number;
  only_authen: number;
  only_stmm: number;
}

interface CompareData {
  self_hcode: string | null;
  self: ComparePoint | null;
  others_avg: {
    joined_total: number;
    vm_match: number;
    vm_mismatch: number;
    match_rate: number;
    only_authen: number;
    only_stmm: number;
  };
  bars: ComparePoint[];
  total_facilities: number;
}

interface Summary {
  month: string | null;
  hcode: string | null;
  facilityName: string | null;
  authenTotal: number;
  stmmTotal: number;
  joinedTotal: number;
  vmInvnoMatch: number;
  vmInvnoMismatch: number;
  onlyAuthen: number;
  onlyStmm: number;
}

interface FacilityRow {
  hcode: string;
  facility_name: string;
  authen_total: number;
  stmm_total: number;
  joined_total: number;
  vm_match: number;
  vm_mismatch: number;
  only_authen: number;
  only_stmm: number;
}

interface DetailRow {
  hcode: string;
  cid: string;
  vstdate: string;
  pid: string;
  startdate: string;
  vm: string;
  invoid: string;
  vm_status: string;
  authen: string;
  authen_date: string;
  authen_time: string;
  hn_authen: string;
  hn_stmm: string;
  name_stmm: string;
  dttran: string;
  total: number;
}

const COMPARE_METRICS: { id: CompareMetric; label: string; suffix?: string }[] = [
  { id: 'joined_total', label: 'จับคู่ได้' },
  { id: 'vm_match', label: 'vm = invno' },
  { id: 'match_rate', label: 'อัตราตรง', suffix: '%' },
  { id: 'only_authen', label: 'มี authen ไม่มี stmm' },
  { id: 'only_stmm', label: 'มี stmm ไม่มี authen' },
];

const CATEGORY_TABS: { id: RowCategory; label: string }[] = [
  { id: 'matched', label: 'จับคู่แล้ว' },
  { id: 'mismatch', label: 'vm ไม่ตรง invno' },
  { id: 'only-authen', label: 'มี authen ไม่มี stmm' },
  { id: 'only-stmm', label: 'มี stmm ไม่มี authen' },
];


function buildAuthParams(auth: { userId?: number | string; userSks?: string }) {
  const params = new URLSearchParams();
  if (auth.userId) params.set('user_id', String(auth.userId));
  if (auth.userSks) params.set('user_sks', auth.userSks);
  return params;
}

export default function AuthenStmmMatchPanel({
  auth,
  isAdmin = false,
  title = 'เทียบ Authen กับ STMM',
  showMonthFilter = true,
  defaultMonth = '',
}: {
  auth: { userId?: number | string; userSks?: string };
  isAdmin?: boolean;
  title?: string;
  showMonthFilter?: boolean;
  defaultMonth?: string;
}) {
  const [month, setMonth] = useState(defaultMonth);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [comparison, setComparison] = useState<CompareData | null>(null);
  const [compareMetric, setCompareMetric] = useState<CompareMetric>('joined_total');
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [selectedHcode, setSelectedHcode] = useState<string | null>(null);
  const [category, setCategory] = useState<RowCategory>('matched');
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [rowTotal, setRowTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [error, setError] = useState('');

  const activeHcode = isAdmin ? selectedHcode : null;

  const exportUrl = useMemo(() => {
    const params = buildAuthParams(auth);
    if (month) params.set('month', month);
    if (activeHcode) params.set('hcode', activeHcode);
    return `/api/admin/authen-stmm-export?${params.toString()}`;
  }, [auth, month, activeHcode]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = buildAuthParams(auth);
      params.set('mode', 'summary');
      if (month) params.set('month', month);
      if (activeHcode) params.set('hcode', activeHcode);

      const res = await fetch(`/api/authen-stmm-match?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'โหลดสรุปไม่สำเร็จ');
      setSummary(data.summary);

      const compareParams = buildAuthParams(auth);
      compareParams.set('mode', 'compare');
      if (month) compareParams.set('month', month);
      const compareRes = await fetch(`/api/authen-stmm-match?${compareParams}`);
      const compareData = await compareRes.json();
      if (compareRes.ok && compareData.success) {
        setComparison(compareData.comparison || null);
      } else {
        setComparison(null);
      }

      if (isAdmin) {
        const facilityParams = buildAuthParams(auth);
        facilityParams.set('mode', 'facilities');
        if (month) facilityParams.set('month', month);
        const facilityRes = await fetch(`/api/authen-stmm-match?${facilityParams}`);
        const facilityData = await facilityRes.json();
        if (facilityRes.ok && facilityData.success) {
          setFacilities(facilityData.facilities || []);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setSummary(null);
      setComparison(null);
    } finally {
      setLoading(false);
    }
  }, [auth, month, activeHcode, isAdmin]);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    setError('');
    try {
      const params = buildAuthParams(auth);
      params.set('mode', 'rows');
      params.set('category', category);
      params.set('page', String(page));
      params.set('limit', '50');
      if (month) params.set('month', month);
      if (activeHcode) params.set('hcode', activeHcode);

      const res = await fetch(`/api/authen-stmm-match?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'โหลดรายละเอียดไม่สำเร็จ');
      setRows(data.rows || []);
      setRowTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setRows([]);
      setRowTotal(0);
    } finally {
      setRowsLoading(false);
    }
  }, [auth, month, activeHcode, category, page]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    setPage(1);
  }, [category, month, activeHcode]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const totalPages = Math.max(1, Math.ceil(rowTotal / 50));

  return (
    <div className="bg-white rounded-xl shadow-lg border-t-4 border-teal-500 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            จับคู่ hcode + cid + vstdate กับ STMM · เทียบ vn กับ invno
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {showMonthFilter && (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          )}
          <button
            type="button"
            onClick={() => setMonth('')}
            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
          >
            ทั้งหมด
          </button>
          <a
            href={exportUrl}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
          >
            ดาวน์โหลด Excel
          </a>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">กำลังโหลดสรุป...</div>
      ) : summary ? (
        <>
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="authen ทั้งหมด" value={summary.authenTotal} color="border-blue-500" />
            <StatCard label="stmm ทั้งหมด" value={summary.stmmTotal} color="border-indigo-500" />
            <StatCard label="จับคู่ได้" value={summary.joinedTotal} color="border-teal-500" />
            <StatCard label="vm = invno" value={summary.vmInvnoMatch} color="border-green-500" />
            <StatCard label="vm ≠ invno" value={summary.vmInvnoMismatch} color="border-orange-500" />
            <StatCard label="มี authen ไม่มี stmm" value={summary.onlyAuthen} color="border-yellow-500" />
          </div>

          {comparison && (
            <AuthenStmmCompareChart
              comparison={comparison}
              metric={compareMetric}
              onMetricChange={setCompareMetric}
            />
          )}

          {isAdmin && (
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">สรุปตามสถานบริการ</h3>
                <button
                  type="button"
                  onClick={() => setSelectedHcode(null)}
                  className={`text-sm font-semibold ${selectedHcode ? 'text-teal-700 hover:underline' : 'text-gray-400'}`}
                >
                  ดูทั้งหมด
                </button>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-72 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">สถานบริการ</th>
                      <th className="px-3 py-2 text-right">จับคู่</th>
                      <th className="px-3 py-2 text-right">vm=invno</th>
                      <th className="px-3 py-2 text-right">vm≠invno</th>
                      <th className="px-3 py-2 text-right">authen เฉพาะ</th>
                      <th className="px-3 py-2 text-right">stmm เฉพาะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {facilities.map((facility) => (
                      <tr
                        key={facility.hcode}
                        className={`cursor-pointer hover:bg-teal-50 ${selectedHcode === facility.hcode ? 'bg-teal-50' : ''}`}
                        onClick={() => setSelectedHcode(facility.hcode)}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{facility.facility_name}</div>
                          <div className="text-xs text-gray-500">{facility.hcode}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{facility.joined_total.toLocaleString('th-TH')}</td>
                        <td className="px-3 py-2 text-right text-green-700">{facility.vm_match.toLocaleString('th-TH')}</td>
                        <td className="px-3 py-2 text-right text-orange-700">{facility.vm_mismatch.toLocaleString('th-TH')}</td>
                        <td className="px-3 py-2 text-right">{facility.only_authen.toLocaleString('th-TH')}</td>
                        <td className="px-3 py-2 text-right">{facility.only_stmm.toLocaleString('th-TH')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedHcode && (
                <p className="text-sm text-teal-700 mt-2">
                  กำลังดูเฉพาะ hcode: <span className="font-mono font-bold">{selectedHcode}</span>
                </p>
              )}
            </div>
          )}

          <div className="px-6 pb-2 flex flex-wrap gap-2">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  category === tab.id ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="px-6 pb-6">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">hcode</th>
                    <th className="px-3 py-2 text-left">cid/pid</th>
                    <th className="px-3 py-2 text-left">vstdate</th>
                    <th className="px-3 py-2 text-left">vm</th>
                    <th className="px-3 py-2 text-left">invno</th>
                    <th className="px-3 py-2 text-left">สถานะ</th>
                    <th className="px-3 py-2 text-left">เวลา</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rowsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500">กำลังโหลด...</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500">ไม่พบข้อมูล</td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={`${row.authen}-${row.invoid}-${index}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono">{row.hcode}</td>
                        <td className="px-3 py-2 font-mono">{row.cid || row.pid || '-'}</td>
                        <td className="px-3 py-2">{row.vstdate || row.startdate || '-'}</td>
                        <td className="px-3 py-2 font-mono">{row.vm || '-'}</td>
                        <td className="px-3 py-2 font-mono">{row.invoid || '-'}</td>
                        <td className="px-3 py-2">
                          <StatusBadge status={row.vm_status} />
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {row.dttran || `${row.authen_date} ${row.authen_time}`.trim() || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-600">รวม {rowTotal.toLocaleString('th-TH')} รายการ</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || rowsLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
                >
                  ก่อนหน้า
                </button>
                <span className="px-2 py-1.5 text-sm font-semibold">หน้า {page} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages || rowsLoading}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded bg-gray-100 text-gray-700 disabled:opacity-50"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-lg border-t-4 ${color} bg-gray-50 p-4`}>
      <p className="text-xs font-semibold text-gray-600 uppercase">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value.toLocaleString('th-TH')}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ตรง'
      ? 'bg-green-100 text-green-800'
      : status === 'ไม่ตรง'
        ? 'bg-orange-100 text-orange-800'
        : 'bg-gray-100 text-gray-600';
  return <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{status}</span>;
}

function getMetricValue(point: ComparePoint, metric: CompareMetric) {
  return point[metric];
}

function formatMetricValue(value: number, metric: CompareMetric) {
  if (metric === 'match_rate') return `${value.toLocaleString('th-TH')}%`;
  return value.toLocaleString('th-TH');
}

function AuthenStmmCompareChart({
  comparison,
  metric,
  onMetricChange,
}: {
  comparison: CompareData;
  metric: CompareMetric;
  onMetricChange: (metric: CompareMetric) => void;
}) {
  const metricMeta = COMPARE_METRICS.find((item) => item.id === metric)!;
  const bars = [...comparison.bars].sort(
    (a, b) => getMetricValue(b, metric) - getMetricValue(a, metric)
  );
  const maxValue = Math.max(
    ...bars.map((bar) => getMetricValue(bar, metric)),
    getMetricValue(
      {
        hcode: 'avg',
        label: 'avg',
        is_self: false,
        joined_total: comparison.others_avg.joined_total,
        vm_match: comparison.others_avg.vm_match,
        vm_mismatch: comparison.others_avg.vm_mismatch,
        match_rate: comparison.others_avg.match_rate,
        only_authen: comparison.others_avg.only_authen,
        only_stmm: comparison.others_avg.only_stmm,
      },
      metric
    ),
    1
  );

  const selfValue = comparison.self ? getMetricValue(comparison.self, metric) : null;
  const avgValue = getMetricValue(
    {
      hcode: 'avg',
      label: 'avg',
      is_self: false,
      joined_total: comparison.others_avg.joined_total,
      vm_match: comparison.others_avg.vm_match,
      vm_mismatch: comparison.others_avg.vm_mismatch,
      match_rate: comparison.others_avg.match_rate,
      only_authen: comparison.others_avg.only_authen,
      only_stmm: comparison.others_avg.only_stmm,
    },
    metric
  );

  return (
    <div className="px-6 pb-6">
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">เปรียบเทียบกับสถานบริการอื่น</h3>
            <p className="text-sm text-gray-600 mt-1">
              แสดงเฉพาะรหัส hcode ไม่แสดงชื่อสถานบริการหรือชื่อ-นามสกุลผู้ป่วย
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {COMPARE_METRICS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onMetricChange(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  metric === item.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="rounded-lg bg-teal-600 text-white p-4">
            <p className="text-xs font-semibold uppercase opacity-90">ของฉัน</p>
            <p className="text-2xl font-bold mt-1">
              {selfValue !== null ? formatMetricValue(selfValue, metric) : '-'}
            </p>
            <p className="text-xs mt-1 opacity-90">{comparison.self_hcode || 'ไม่พบรหัสของคุณ'}</p>
          </div>
          <div className="rounded-lg bg-slate-600 text-white p-4">
            <p className="text-xs font-semibold uppercase opacity-90">ค่าเฉลี่ยของคนอื่น</p>
            <p className="text-2xl font-bold mt-1">{formatMetricValue(avgValue, metric)}</p>
            <p className="text-xs mt-1 opacity-90">
              จาก {Math.max(comparison.total_facilities - (comparison.self ? 1 : 0), 0)} รหัส
            </p>
          </div>
          <div className="rounded-lg bg-white border border-indigo-100 p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase">สรุป</p>
            <p className="text-sm text-gray-800 mt-2">
              {selfValue !== null && selfValue >= avgValue
                ? 'ของคุณสูงกว่าหรือเท่ากับค่าเฉลี่ยของคนอื่น'
                : selfValue !== null
                  ? 'ของคุณต่ำกว่าค่าเฉลี่ยของคนอื่น'
                  : 'ยังไม่พบข้อมูลของรหัสคุณในช่วงที่เลือก'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              แสดง {bars.length} จาก {comparison.total_facilities} รหัสที่มีข้อมูล
            </p>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[640px]">
            <div className="relative h-80">
              <div className="absolute inset-x-0 top-6 bottom-16">
                <div
                  className="absolute inset-x-0 border-t-2 border-dashed border-slate-500 z-10"
                  style={{ bottom: `${(avgValue / maxValue) * 100}%` }}
                >
                  <span className="absolute -top-4 right-0 text-xs font-semibold text-slate-600 bg-indigo-50 px-1 rounded">
                    เฉลี่ย {formatMetricValue(avgValue, metric)}
                  </span>
                </div>

                <div className="flex items-end justify-start gap-3 h-full px-2 border-b border-gray-200">
                  {bars.map((bar) => {
                    const value = getMetricValue(bar, metric);
                    const height = `${Math.max((value / maxValue) * 100, value > 0 ? 3 : 0)}%`;
                    return (
                      <div
                        key={bar.hcode}
                        className="flex flex-col items-center h-full min-w-[56px] flex-1 max-w-[88px]"
                      >
                        <div className="flex-1 w-full flex flex-col justify-end min-h-0">
                          <span className="text-xs font-bold text-gray-800 mb-1 text-center">
                            {formatMetricValue(value, metric)}
                          </span>
                          <div
                            className={`w-full rounded-t-md transition-all duration-500 ${
                              bar.is_self ? 'bg-teal-500 ring-2 ring-teal-300' : 'bg-indigo-400'
                            }`}
                            style={{ height }}
                            title={`${bar.label}: ${formatMetricValue(value, metric)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 flex justify-start gap-3 px-2 h-14">
                {bars.map((bar) => (
                  <div
                    key={`${bar.hcode}-label`}
                    className="min-w-[56px] flex-1 max-w-[88px] text-center"
                  >
                    <p
                      className={`text-xs font-semibold leading-tight ${
                        bar.is_self ? 'text-teal-800' : 'text-gray-600'
                      }`}
                    >
                      {bar.is_self ? 'ของฉัน' : bar.hcode}
                    </p>
                    {bar.is_self && (
                      <p className="text-[10px] text-teal-700 font-mono mt-0.5">{bar.hcode}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-indigo-100 flex items-center gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-teal-500" />
            ของฉัน
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-400" />
            รหัสอื่น
          </span>
          <span>เมตริก: {metricMeta.label}</span>
        </div>
      </div>
    </div>
  );
}
