import * as XLSX from 'xlsx';

export interface ExcelMatchRow {
  invno: string;
  hcare: string;
  hmain: string;
  station: string;
  hn: string;
  pid: string;
  name: string;
  dttran: string;
  payplan: string;
  bp: string;
  bf: string;
  care: string;
  rid: string;
  copay: string;
  total: number;
  authen: {
    authen: string;
    authenHcare: string;
    authenInvNo: string;
  } | null;
}

export interface ExcelHcareGroup {
  hcare: string;
  hosname: string;
  hmain: string;
  rowCount: number;
  totalAmount: number;
  rows: ExcelMatchRow[];
}

function hospitalLabel(group: Pick<ExcelHcareGroup, 'hcare' | 'hosname'>) {
  if (group.hosname) return group.hosname;
  if (group.hcare && group.hcare !== '-') return `HCare ${group.hcare}`;
  return 'ไม่ระบุ HCare';
}

function safeSheetName(name: string) {
  return name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
}

function buildSummarySheet(groups: ExcelHcareGroup[]) {
  const sorted = [...groups].sort((a, b) =>
    hospitalLabel(a).localeCompare(hospitalLabel(b), 'th')
  );

  return sorted.map((group, index) => ({
    ลำดับ: index + 1,
    ชื่อสถานบริการ: hospitalLabel(group),
    HCare: group.hcare,
    HMain: group.hmain,
    'จำนวน (พบ authen)': group.rowCount,
    ยอดรวม: group.totalAmount,
  }));
}

function buildDetailRows(groups: ExcelHcareGroup[], formatDttran: (value: string) => string) {
  return groups.flatMap((group) =>
    group.rows.map((row) => ({
      ชื่อสถานบริการ: hospitalLabel(group),
      HCare: row.hcare || group.hcare,
      HMain: row.hmain || group.hmain,
      HN: row.hn,
      InvNo: row.invno,
      PID: row.pid,
      ชื่อ: row.name,
      DTtran: formatDttran(row.dttran),
      CP: row.payplan,
      BP: row.bp,
      BF: row.bf,
      CA: row.care,
      RID: row.rid,
      Copay: row.copay,
      Amount: row.total,
      'authen (เต็ม)': row.authen?.authen ?? '',
      'HCare ใน authen': row.authen?.authenHcare ?? '',
      'InvNo ใน authen': row.authen?.authenInvNo ?? '',
    }))
  );
}

export function downloadDataMatchExcel(options: {
  month: string;
  groups: ExcelHcareGroup[];
  formatDttran: (value: string) => string;
  hospitalOnly?: ExcelHcareGroup | null;
}) {
  const { month, groups, formatDttran, hospitalOnly } = options;
  if (groups.length === 0 && !hospitalOnly) return;

  const wb = XLSX.utils.book_new();
  const exportGroups = hospitalOnly ? [hospitalOnly] : groups;

  const summarySheet = XLSX.utils.json_to_sheet(buildSummarySheet(exportGroups));
  XLSX.utils.book_append_sheet(wb, summarySheet, hospitalOnly ? 'สรุป' : 'สรุปตามสถานบริการ');

  const detailRows = buildDetailRows(exportGroups, formatDttran);
  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(
    wb,
    detailSheet,
    hospitalOnly ? safeSheetName(hospitalLabel(hospitalOnly)) : 'รายละเอียด'
  );

  const filename = hospitalOnly
    ? `data-match_${month}_${hospitalOnly.hcare}.xlsx`
    : `data-match_${month}.xlsx`;

  XLSX.writeFile(wb, filename);
}
