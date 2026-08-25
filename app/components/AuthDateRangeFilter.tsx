'use client';

import { formatDateRangeLabel, getThisMonthRange, getTodayRange } from '@/lib/auth-date-range';

export interface DateRangeValue {
  dateFrom: string;
  dateTo: string;
}

interface AuthDateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onChange: (value: DateRangeValue) => void;
  onClear: () => void;
}

export default function AuthDateRangeFilter({
  dateFrom,
  dateTo,
  onChange,
  onClear,
}: AuthDateRangeFilterProps) {
  const hasRange = Boolean(dateFrom || dateTo);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-600">ตั้งแต่</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value, dateTo })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-600">ถึง</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </label>
      <button
        type="button"
        onClick={() => onChange(getTodayRange())}
        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100"
      >
        วันนี้
      </button>
      <button
        type="button"
        onClick={() => onChange(getThisMonthRange())}
        className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100"
      >
        เดือนนี้
      </button>
      <button
        type="button"
        onClick={onClear}
        className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
      >
        ทั้งหมด
      </button>
      {hasRange && dateFrom && dateTo && (
        <span className="text-xs text-gray-500 pb-2">{formatDateRangeLabel(dateFrom, dateTo)}</span>
      )}
    </div>
  );
}

export function buildDateRangeParams(dateFrom: string, dateTo: string) {
  const params = new URLSearchParams();
  if (dateFrom) params.set('start', dateFrom);
  if (dateTo) params.set('end', dateTo);
  return params;
}

export function getDateRangeSummary(dateFrom: string, dateTo: string) {
  if (dateFrom && dateTo) return formatDateRangeLabel(dateFrom, dateTo);
  if (dateFrom) return `ตั้งแต่ ${dateFrom.split('-').reverse().join('/')}`;
  if (dateTo) return `ถึง ${dateTo.split('-').reverse().join('/')}`;
  return 'ทุกช่วงเวลา';
}
