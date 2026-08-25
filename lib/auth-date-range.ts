export function formatBangkokDate(date: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function parseDateParam(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

export function validateDateRange(dateFrom: string | null, dateTo: string | null): string | null {
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด';
  }
  return null;
}

export function getTodayRange() {
  const today = formatBangkokDate();
  return { dateFrom: today, dateTo: today };
}

export function getThisMonthRange() {
  const today = formatBangkokDate();
  const [year, month] = today.split('-');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return {
    dateFrom: `${year}-${month}-01`,
    dateTo: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function formatDateRangeLabel(dateFrom: string, dateTo: string) {
  const fmt = (value: string) => {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  };
  if (dateFrom === dateTo) return fmt(dateFrom);
  return `${fmt(dateFrom)} – ${fmt(dateTo)}`;
}
