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
    color: 'bg-[#0b3d4a]',
  },
  {
    key: 'with_card' as const,
    label: 'ยืนยันตัวตน',
    subtitle: 'Auth_hospital · Auth_hosxp · Auth_OnSmartCard',
    color: 'bg-[#1a7a6d]',
  },
  {
    key: 'no_card' as const,
    label: 'ไม่ได้ยืนยันตัวตน',
    subtitle: 'Auth_card · Auth_manual · Auth_NoSmartCard',
    color: 'bg-[#b45309]',
  },
];

function FacilityMiniChart({ facility, highlight }: { facility: FacilityStats; highlight?: boolean }) {
  const maxValue = Math.max(facility.total, facility.with_card, facility.no_card, 1);

  return (
    <div
      className={`border bg-white p-4 transition-colors ${
        highlight ? 'border-[#1a7a6d] bg-[#f3faf8]' : 'border-[#d8e0e5] hover:border-[#a8b8c0]'
      }`}
    >
      <div className="mb-3 pb-3 border-b border-[#eef2f4]">
        <p
          className="text-sm font-semibold text-[#0b3d4a] leading-snug"
          style={{ fontFamily: 'var(--font-ibm-plex)' }}
        >
          {facility.facility_name}
        </p>
        <p className="text-xs text-[#5c6b73] mt-1 tracking-wide">รหัส {facility.hcode}</p>
      </div>

      <div className="flex items-end justify-center gap-3 h-36 pb-1">
        {BAR_CONFIG.map((bar) => {
          const value = facility[bar.key];
          const height = `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%`;
          return (
            <div key={bar.key} className="flex flex-col items-center h-full min-w-[44px] flex-1">
              <div className="flex-1 w-full flex flex-col justify-end items-center min-h-0">
                <span className="text-[11px] font-semibold text-[#15202b] mb-1">
                  {value.toLocaleString('th-TH')}
                </span>
                <div
                  className={`w-full max-w-[32px] ${bar.color}`}
                  style={{ height }}
                  title={`${bar.label}: ${value.toLocaleString('th-TH')}`}
                />
              </div>
              <p className="text-[10px] text-[#5c6b73] mt-2 text-center leading-tight">{bar.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuthVerificationFacilitiesChart({
  highlightHcode,
  title = 'สถิติการยืนยันตัวตนแต่ละหน่วยบริการ',
  subtitle = 'ทั้งหมด · ยืนยันตัวตน · ไม่ได้ยืนยันตัวตน',
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
    <div className="bg-white border border-[#d8e0e5] overflow-hidden">
      <div className="px-5 sm:px-6 py-5 border-b border-[#d8e0e5] bg-[#fafbfc] flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <h2
            className="text-lg font-semibold text-[#0b3d4a]"
            style={{ fontFamily: 'var(--font-ibm-plex)' }}
          >
            {title}
          </h2>
          <p className="text-sm text-[#5c6b73] mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 items-stretch xl:items-end">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัส / ชื่อหน่วยบริการ"
            className="px-3 py-2 border border-[#d8e0e5] rounded-md text-sm min-w-[220px] bg-white focus:outline-none focus:border-[#1a7a6d] focus:ring-1 focus:ring-[#1a7a6d]"
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
        <div className="mx-5 sm:mx-6 mt-4 border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-[#5c6b73] text-sm">กำลังโหลดข้อมูล...</div>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {BAR_CONFIG.map((bar) => (
              <div key={bar.key} className="border border-[#d8e0e5] px-4 py-3 bg-[#fafbfc]">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2 w-2 ${bar.color}`} />
                  <p className="text-xs font-medium text-[#5c6b73]">{bar.label}</p>
                </div>
                <p
                  className="text-2xl font-semibold text-[#0b3d4a] tabular-nums"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  {totals[bar.key].toLocaleString('th-TH')}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm text-[#5c6b73] mb-4">
            แสดง {filteredFacilities.length.toLocaleString('th-TH')} หน่วยบริการ
            {' · '}
            {getDateRangeSummary(dateFrom, dateTo)}
          </p>

          <AuthVerificationGroupedChart
            facilities={filteredFacilities}
            highlightHcode={highlightHcode}
          />

          {filteredFacilities.length === 0 ? (
            <div className="py-12 text-center text-[#5c6b73] text-sm">ไม่พบข้อมูลหน่วยบริการ</div>
          ) : (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4 border-b border-[#d8e0e5] pb-3">
                <h3
                  className="text-base font-semibold text-[#0b3d4a]"
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  รายละเอียดแต่ละหน่วย
                </h3>
                <p className="text-xs text-[#5c6b73]">เรียงตามจำนวนรายการ</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
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
