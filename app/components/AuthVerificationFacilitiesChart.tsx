'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthVerificationGroupedChart from './AuthVerificationGroupedChart';
import AuthDateRangeFilter, { buildDateRangeParams, getDateRangeSummary } from './AuthDateRangeFilter';

interface FacilityStats {
  hcode: string;
  facility_name: string;
  total: number;
  with_card: number;
  no_card: number;
}

const BAR_CONFIG = [
  {
    key: 'total' as const,
    label: 'ทั้งหมด',
    subtitle: 'รายการทั้งหมด',
    color: 'bg-purple-500',
    ring: 'ring-purple-300',
  },
  {
    key: 'with_card' as const,
    label: 'ยืนยันตัวตน',
    subtitle: 'Auth_hospital · Auth_hosxp · Auth_OnSmartCard',
    color: 'bg-teal-500',
    ring: 'ring-teal-300',
  },
  {
    key: 'no_card' as const,
    label: 'ไม่ได้ยืนยันตัวตน',
    subtitle: 'Auth_card · Auth_manual · Auth_NoSmartCard · NoSmartcard',
    color: 'bg-orange-500',
    ring: 'ring-orange-300',
  },
];

function FacilityMiniChart({ facility, highlight }: { facility: FacilityStats; highlight?: boolean }) {
  const maxValue = Math.max(facility.total, facility.with_card, facility.no_card, 1);

  return (
    <div
      className={`rounded-xl border p-4 bg-white shadow-sm ${
        highlight ? 'border-purple-400 ring-2 ring-purple-200' : 'border-gray-200'
      }`}
    >
      <div className="mb-3">
        <p className="text-sm font-bold text-gray-900 leading-tight">{facility.facility_name}</p>
        <p className="text-xs text-gray-500 mt-1">รหัส {facility.hcode}</p>
      </div>

      <div className="flex items-end justify-center gap-3 h-36 border-b border-gray-100 pb-2">
        {BAR_CONFIG.map((bar) => {
          const value = facility[bar.key];
          const height = `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%`;
          return (
            <div key={bar.key} className="flex flex-col items-center h-full min-w-[44px] flex-1">
              <div className="flex-1 w-full flex flex-col justify-end items-center min-h-0">
                <span className="text-[11px] font-bold text-gray-800 mb-1">{value.toLocaleString('th-TH')}</span>
                <div
                  className={`w-full max-w-[36px] rounded-t-md ${bar.color} ring-1 ${bar.ring}`}
                  style={{ height }}
                  title={`${bar.label}: ${value.toLocaleString('th-TH')}`}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-2 text-center leading-tight">{bar.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuthVerificationFacilitiesChart({
  highlightHcode,
  title = 'สถิติการยืนยันตัวตนแต่ละ รพสต.',
  subtitle = 'กราฟ 3 แท่ง: ทั้งหมด · ยืนยันตัวตน · ไม่ได้ยืนยันตัวตน',
}: {
  highlightHcode?: string;
  title?: string;
  subtitle?: string;
}) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [facilities, setFacilities] = useState<FacilityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = buildDateRangeParams(dateFrom, dateTo);
      params.set('mode', 'facilities');
      const res = await fetch(`/api/authen-code/auth-stats?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'โหลดสถิติไม่สำเร็จ');
      }
      setFacilities(data.facilities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const filteredFacilities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter(
      (item) =>
        item.hcode.toLowerCase().includes(q) ||
        item.facility_name.toLowerCase().includes(q)
    );
  }, [facilities, search]);

  const totals = useMemo(
    () =>
      filteredFacilities.reduce(
        (sum, item) => ({
          total: sum.total + item.total,
          with_card: sum.with_card + item.with_card,
          no_card: sum.no_card + item.no_card,
        }),
        { total: 0, with_card: 0, no_card: 0 }
      ),
    [filteredFacilities]
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border-t-4 border-purple-500 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัส / ชื่อ รพสต."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[220px]"
          />
          <AuthDateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={({ dateFrom: nextFrom, dateTo: nextTo }) => {
              setDateFrom(nextFrom);
              setDateTo(nextTo);
            }}
            onClear={() => {
              setDateFrom('');
              setDateTo('');
            }}
          />
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">กำลังโหลดกราฟ...</div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {BAR_CONFIG.map((bar) => (
              <div key={bar.key} className="rounded-lg bg-gray-50 p-3 text-center border border-gray-100">
                <p className="text-xs font-semibold text-gray-600">{bar.label} (รวม)</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{bar.subtitle}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {totals[bar.key].toLocaleString('th-TH')}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600 mb-4">
            แสดง {filteredFacilities.length.toLocaleString('th-TH')} รพสต.
            {' · '}
            {getDateRangeSummary(dateFrom, dateTo)}
          </p>

          <AuthVerificationGroupedChart
            facilities={filteredFacilities}
            highlightHcode={highlightHcode}
          />

          {filteredFacilities.length === 0 ? (
            <div className="py-10 text-center text-gray-500">ไม่พบข้อมูล รพสต.</div>
          ) : (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">รายละเอียดแต่ละ รพสต.</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFacilities.map((facility) => (
                <FacilityMiniChart
                  key={facility.hcode}
                  facility={facility}
                  highlight={!!highlightHcode && facility.hcode === highlightHcode}
                />
              ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
