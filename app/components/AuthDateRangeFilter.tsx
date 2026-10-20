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

const inputClass =
  "px-3 py-2 border border-[#d8e0e5] rounded-md text-sm bg-white text-[#15202b] focus:outline-none focus:border-[#1a7a6d] focus:ring-1 focus:ring-[#1a7a6d]";
const btnClass =
  "px-3 py-2 rounded-md border border-[#d8e0e5] bg-white text-[#0b3d4a] text-sm font-medium hover:border-[#1a7a6d] hover:text-[#1a7a6d] transition-colors";

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
        <span className="text-[11px] font-medium tracking-wide text-[#5c6b73]">ตั้งแต่</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onChange({ dateFrom: e.target.value, dateTo })}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium tracking-wide text-[#5c6b73]">ถึง</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onChange({ dateFrom, dateTo: e.target.value })}
          className={inputClass}
        />
      </label>
      <button type="button" onClick={() => onChange(getTodayRange())} className={btnClass}>
        วันนี้
      </button>
      <button type="button" onClick={() => onChange(getThisMonthRange())} className={btnClass}>
        เดือนนี้
      </button>
      <button type="button" onClick={onClear} className={btnClass}>
        ทั้งหมด
      </button>
      {hasRange && dateFrom && dateTo && (
        <span className="text-xs text-[#5c6b73] pb-2">{formatDateRangeLabel(dateFrom, dateTo)}</span>
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
