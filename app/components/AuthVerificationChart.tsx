'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthDateRangeFilter, { buildDateRangeParams, getDateRangeSummary } from './AuthDateRangeFilter';

interface AuthVerificationStats {
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
    label: 'เอาบัตรมา',
    subtitle: 'Auth_hospital · Auth_hosxp · Auth_OnSmartCard',
    color: 'bg-teal-500',
    ring: 'ring-teal-300',
  },
  {
    key: 'no_card' as const,
    label: 'ไม่มีบัตร',
    subtitle: 'Auth_card · Auth_manual',
    color: 'bg-orange-500',
    ring: 'ring-orange-300',
  },
];

function buildAuthParams(auth: { userId?: number | string; userSks?: string }) {
  const params = new URLSearchParams();
  if (auth.userId) params.set('user_id', String(auth.userId));
  if (auth.userSks) params.set('user_sks', auth.userSks);
  return params;
}

export default function AuthVerificationChart({
  auth,
  facilityHcode,
  title = 'สถิติการยืนยันตัวตน',
  subtitle,
}: {
  auth: { userId?: number | string; userSks?: string };
  facilityHcode?: string;
  title?: string;
  subtitle?: string;
}) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState<AuthVerificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = buildAuthParams(auth);
      const rangeParams = buildDateRangeParams(dateFrom, dateTo);
      rangeParams.forEach((value, key) => params.set(key, value));
      if (facilityHcode) params.set('hcode', facilityHcode);
      const res = await fetch(`/api/authen-code/auth-stats?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'โหลดสถิติไม่สำเร็จ');
      }
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [auth, dateFrom, dateTo, facilityHcode]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const maxValue = useMemo(() => {
    if (!stats) return 1;
    return Math.max(stats.total, stats.with_card, stats.no_card, 1);
  }, [stats]);

  return (
    <div className="bg-white rounded-xl shadow-lg border-t-4 border-purple-500 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {subtitle || 'กราฟ 3 แท่ง: ทั้งหมด · เอาบัตรมา · ไม่มีบัตร'}
          </p>
        </div>
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

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500">กำลังโหลดกราฟ...</div>
      ) : stats ? (
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {BAR_CONFIG.map((bar) => (
              <div key={bar.key} className="rounded-lg bg-gray-50 p-3 text-center border border-gray-100">
                <p className="text-xs font-semibold text-gray-600">{bar.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{bar.subtitle}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats[bar.key].toLocaleString('th-TH')}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-purple-100 bg-gradient-to-b from-purple-50 to-white p-4">
            <div className="flex items-end justify-center gap-8 sm:gap-12 h-64 px-4 pb-2 border-b border-gray-200">
              {BAR_CONFIG.map((bar) => {
                const value = stats[bar.key];
                const height = `${Math.max((value / maxValue) * 100, value > 0 ? 6 : 0)}%`;
                return (
                  <div key={bar.key} className="flex flex-col items-center h-full min-w-[88px] max-w-[140px] flex-1">
                    <div className="flex-1 w-full flex flex-col justify-end min-h-0 items-center">
                      <span className="text-sm font-bold text-gray-900 mb-2">
                        {value.toLocaleString('th-TH')}
                      </span>
                      <div
                        className={`w-full max-w-[72px] rounded-t-lg transition-all duration-500 ${bar.color} ring-2 ${bar.ring}`}
                        style={{ height }}
                        title={`${bar.label}: ${value.toLocaleString('th-TH')}`}
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-sm font-bold text-gray-900 leading-tight">{bar.label}</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-tight">{bar.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4 text-center">
            {getDateRangeSummary(dateFrom, dateTo)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
