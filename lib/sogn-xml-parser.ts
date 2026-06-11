import { parseStringPromise } from 'xml2js';

export type FileType =
  | 'SOGNSTMM'
  | 'SOGNSTMP'
  | 'SOGNADJM'
  | 'SOGNADJP'
  | 'SOGNSUMM'
  | 'SOGNSUMP'
  | 'SIGNSTMM'
  | 'SIGNSTMS'
  | 'ADJLIST'
  | 'UNKNOWN';

export interface BillRecord {
  key: string;
  hn: string;
  an: string;
  pid: string;
  name: string;
  invno: string;
  total: number;
  rid: string;
  dateadm: string;
  datedsc: string;
  hcode: string;
  hproc: string;
  hmain: string;
  hcare: string;
  station: string;
  dttran: string;
  payplan: string;
  bp: string;
  bf: string;
  care: string;
  copay: string;
}

export interface ParsedFile {
  fileName: string;
  fileType: FileType;
  stmDoc: string;
  hcode: string;
  hname: string;
  period: string;
  headerCount: number | null;
  headerAmount: number | null;
  billCount: number;
  billTotal: number;
  bills: BillRecord[];
}

function detectFileType(fileName: string): FileType {
  const upper = fileName.toUpperCase();
  if (upper.includes('SOGNSTMM')) return 'SOGNSTMM';
  if (upper.includes('SOGNSTMP')) return 'SOGNSTMP';
  if (upper.includes('SOGNADJM')) return 'SOGNADJM';
  if (upper.includes('SOGNADJP')) return 'SOGNADJP';
  if (upper.includes('SOGNSUMM')) return 'SOGNSUMM';
  if (upper.includes('SOGNSUMP')) return 'SOGNSUMP';
  if (upper.includes('SIGNSTMM')) return 'SIGNSTMM';
  if (upper.includes('SIGNSTMS')) return 'SIGNSTMS';
  return 'UNKNOWN';
}

function xmlValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value === 'object' && value !== null && '_' in value) {
    return String((value as { _: unknown })._).trim();
  }
  return String(value).trim();
}

function xmlNumber(value: unknown): number {
  const parsed = parseFloat(xmlValue(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function buildBillKey(bill: {
  hn?: string;
  an?: string;
  pid?: string;
  invno?: string;
  rid?: string;
}): string {
  const hn = (bill.hn || '').trim();
  const pid = (bill.pid || '').trim();
  const invno = (bill.invno || '').trim();
  const an = (bill.an || '').trim();
  const rid = (bill.rid || '').trim();

  if (hn && pid && invno) return `${hn}|${pid}|${invno}`;
  if (hn && an && pid) return `${hn}|${an}|${pid}`;
  if (hn && pid && rid) return `${hn}|${pid}|${rid}`;
  if (hn && pid) return `${hn}|${pid}`;
  return `${hn}|${an}|${pid}|${invno}|${rid}`;
}

function normalizeBill(raw: Record<string, unknown>): BillRecord {
  const bill = {
    hn: xmlValue(raw.hn),
    an: xmlValue(raw.an),
    pid: xmlValue(raw.pid),
    name: xmlValue(raw.name),
    invno: xmlValue(raw.invno),
    total: xmlNumber(raw.total ?? raw.Reimb ?? raw.Nreimb),
    rid: xmlValue(raw.rid),
    dateadm: xmlValue(raw.dateadm),
    datedsc: xmlValue(raw.datedsc),
    hcode: xmlValue(raw.hcode),
    hproc: xmlValue(raw.hproc),
    hmain: xmlValue(raw.hmain),
    hcare: xmlValue(raw.hcare),
    station: xmlValue(raw.station),
    dttran: xmlValue(raw.dttran),
    payplan: xmlValue(raw.payplan),
    bp: xmlValue(raw.bp),
    bf: xmlValue(raw.bf),
    care: xmlValue(raw.care),
    copay: xmlValue(raw.copay),
  };

  return {
    key: buildBillKey(bill),
    ...bill,
  };
}

function extractTBills(root: Record<string, unknown>): BillRecord[] {
  const tbills = root.TBills as Record<string, unknown> | undefined;
  if (!tbills) return [];

  const st = tbills.ST as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const stList = toArray(st);
  const bills: BillRecord[] = [];

  for (const station of stList) {
    const hg = station.HG;
    if (!hg) continue;

    if (Array.isArray(hg)) {
      for (const item of hg) {
        const tbill = (item as Record<string, unknown>).TBill;
        for (const bill of toArray(tbill as Record<string, unknown>)) {
          bills.push(normalizeBill(bill as Record<string, unknown>));
        }
      }
      continue;
    }

    if (typeof hg === 'object') {
      const hgObj = hg as Record<string, unknown>;
      if (hgObj.TBill) {
        for (const bill of toArray(hgObj.TBill as Record<string, unknown>)) {
          bills.push(normalizeBill(bill as Record<string, unknown>));
        }
      } else {
        for (const val of Object.values(hgObj)) {
          const nested = val as Record<string, unknown>;
          if (nested?.TBill) {
            for (const bill of toArray(nested.TBill as Record<string, unknown>)) {
              bills.push(normalizeBill(bill as Record<string, unknown>));
            }
          }
        }
      }
    }
  }

  return bills;
}

function extractSTMLISTBills(root: Record<string, unknown>): BillRecord[] {
  const billsNode = root.Bills as Record<string, unknown> | undefined;
  if (!billsNode?.Bill) return [];
  return toArray(billsNode.Bill as Record<string, unknown>).map((bill) =>
    normalizeBill(bill as Record<string, unknown>)
  );
}

function extractADJLISTBills(root: Record<string, unknown>): BillRecord[] {
  const abills = root.ABills as Record<string, unknown> | undefined;
  if (!abills?.ABill) return [];

  const bills: BillRecord[] = [];
  for (const abill of toArray(abills.ABill as Record<string, unknown>)) {
    const abillRow = abill as Record<string, unknown>;
    const adjList = toArray(abillRow.ADJ as Record<string, unknown>);
    if (adjList.length > 0) {
      for (const adj of adjList) {
        const adjRow = adj as Record<string, unknown>;
        bills.push(
          normalizeBill({
            hn: abillRow.hn ?? adjRow.hn,
            an: abillRow.an ?? adjRow.an,
            pid: adjRow.pid,
            name: adjRow.name,
            invno: adjRow.invno,
            total: adjRow.adjrw ?? adjRow.rw,
            rid: adjRow.rid,
            dateadm: adjRow.dateadm,
            datedsc: adjRow.datedsc,
            hcode: adjRow.hcode,
            hproc: adjRow.hproc,
          })
        );
      }
    } else {
      bills.push(
        normalizeBill({
          hn: abillRow.hn,
          an: abillRow.an,
          pid: abillRow.pid,
          name: abillRow.name,
        })
      );
    }
  }
  return bills;
}

function readHeader(root: Record<string, unknown>) {
  return {
    stmDoc: xmlValue(root.STMdoc),
    hcode: xmlValue(root.hcode),
    hname: xmlValue(root.hname),
    period: xmlValue(root.AccPeriod ?? root.period),
    headerCount: root.acount != null ? xmlNumber(root.acount) : null,
    headerAmount: root.amount != null ? xmlNumber(root.amount) : null,
  };
}

function readSTMLISTHeader(root: Record<string, unknown>) {
  const stmdat = (root.stmdat || {}) as Record<string, unknown>;
  return {
    stmDoc: xmlValue(stmdat.stmno),
    hcode: xmlValue(stmdat.hcode),
    hname: xmlValue(stmdat.hname),
    period: xmlValue(stmdat.period),
    headerCount: stmdat.cases != null ? xmlNumber(stmdat.cases) : null,
    headerAmount: null,
  };
}

function readADJLISTHeader(root: Record<string, unknown>) {
  const stmdat = (root.stmdat || {}) as Record<string, unknown>;
  return {
    stmDoc: xmlValue(stmdat.stmno),
    hcode: xmlValue(stmdat.hcode),
    hname: xmlValue(stmdat.hname),
    period: xmlValue(stmdat.period),
    headerCount: stmdat.cases != null ? xmlNumber(stmdat.cases) : null,
    headerAmount: null,
  };
}

export async function parseXmlFile(fileName: string, xmlContent: string): Promise<ParsedFile> {
  const parsed = await parseStringPromise(xmlContent, { explicitArray: false });
  const fileType = detectFileType(fileName);
  const rootKey = Object.keys(parsed)[0];
  const root = (parsed[rootKey] || {}) as Record<string, unknown>;

  let header = readHeader(root);
  let bills: BillRecord[] = [];
  let resolvedType = fileType;

  if (rootKey === 'STMSTMM' || fileType === 'SOGNSTMM' || fileType === 'SOGNSUMM') {
    bills = extractTBills(root);
    header = readHeader(root);
    resolvedType = fileType === 'UNKNOWN' ? 'SOGNSTMM' : fileType;
  } else if (rootKey === 'STMSTMP' || fileType === 'SOGNSTMP' || fileType === 'SOGNSUMP') {
    bills = extractTBills(root);
    header = readHeader(root);
    resolvedType = fileType === 'UNKNOWN' ? 'SOGNSTMP' : fileType;
  } else if (rootKey === 'STMLIST' || fileType === 'SIGNSTMM' || fileType === 'SIGNSTMS') {
    bills = extractSTMLISTBills(root);
    header = readSTMLISTHeader(root);
    resolvedType = fileType === 'UNKNOWN' ? 'SIGNSTMM' : fileType;
  } else if (rootKey === 'ADJLIST' || fileType === 'SOGNADJM' || fileType === 'SOGNADJP') {
    bills = extractADJLISTBills(root);
    header = readADJLISTHeader(root);
    resolvedType = fileType === 'UNKNOWN' ? 'ADJLIST' : fileType;
  } else if (bills.length === 0) {
    bills = extractTBills(root);
    if (bills.length === 0) {
      bills = extractSTMLISTBills(root);
    }
    if (bills.length === 0) {
      bills = extractADJLISTBills(root);
    }
  }

  const billTotal = bills.reduce((sum, bill) => sum + bill.total, 0);

  return {
    fileName,
    fileType: resolvedType,
    stmDoc: header.stmDoc,
    hcode: header.hcode,
    hname: header.hname,
    period: header.period,
    headerCount: header.headerCount,
    headerAmount: header.headerAmount,
    billCount: bills.length,
    billTotal,
    bills,
  };
}

export interface FieldDiff {
  field: string;
  reference: string;
  compare: string;
}

export interface MatchResult {
  referenceFile: string;
  compareFile: string;
  referenceType: FileType;
  compareType: FileType;
  summary: {
    referenceCount: number;
    compareCount: number;
    matchedCount: number;
    onlyInReferenceCount: number;
    onlyInCompareCount: number;
    mismatchedCount: number;
    referenceTotal: number;
    compareTotal: number;
    referenceHeaderCount: number | null;
    compareHeaderCount: number | null;
    referenceHeaderAmount: number | null;
    compareHeaderAmount: number | null;
  };
  matched: Array<{ key: string; bill: BillRecord }>;
  onlyInReference: BillRecord[];
  onlyInCompare: BillRecord[];
  mismatched: Array<{
    key: string;
    reference: BillRecord;
    compare: BillRecord;
    diffs: FieldDiff[];
  }>;
}

const COMPARE_FIELDS: Array<keyof BillRecord> = [
  'hn',
  'an',
  'pid',
  'name',
  'invno',
  'total',
  'rid',
  'dateadm',
  'datedsc',
  'hcode',
  'hproc',
];

function compareBills(reference: BillRecord, compare: BillRecord): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  for (const field of COMPARE_FIELDS) {
    if (field === 'key') continue;

    const refValue = field === 'total'
      ? reference.total.toFixed(4)
      : String(reference[field] ?? '');
    const cmpValue = field === 'total'
      ? compare.total.toFixed(4)
      : String(compare[field] ?? '');

    if (refValue !== cmpValue) {
      diffs.push({
        field,
        reference: refValue,
        compare: cmpValue,
      });
    }
  }

  return diffs;
}

export function matchParsedFiles(reference: ParsedFile, compare: ParsedFile): MatchResult {
  const referenceMap = new Map(reference.bills.map((bill) => [bill.key, bill]));
  const compareMap = new Map(compare.bills.map((bill) => [bill.key, bill]));

  const matched: Array<{ key: string; bill: BillRecord }> = [];
  const onlyInReference: BillRecord[] = [];
  const onlyInCompare: BillRecord[] = [];
  const mismatched: MatchResult['mismatched'] = [];

  for (const [key, refBill] of referenceMap) {
    const cmpBill = compareMap.get(key);
    if (!cmpBill) {
      onlyInReference.push(refBill);
      continue;
    }

    const diffs = compareBills(refBill, cmpBill);
    if (diffs.length > 0) {
      mismatched.push({ key, reference: refBill, compare: cmpBill, diffs });
    } else {
      matched.push({ key, bill: refBill });
    }
  }

  for (const [key, cmpBill] of compareMap) {
    if (!referenceMap.has(key)) {
      onlyInCompare.push(cmpBill);
    }
  }

  return {
    referenceFile: reference.fileName,
    compareFile: compare.fileName,
    referenceType: reference.fileType,
    compareType: compare.fileType,
    summary: {
      referenceCount: reference.billCount,
      compareCount: compare.billCount,
      matchedCount: matched.length,
      onlyInReferenceCount: onlyInReference.length,
      onlyInCompareCount: onlyInCompare.length,
      mismatchedCount: mismatched.length,
      referenceTotal: reference.billTotal,
      compareTotal: compare.billTotal,
      referenceHeaderCount: reference.headerCount,
      compareHeaderCount: compare.headerCount,
      referenceHeaderAmount: reference.headerAmount,
      compareHeaderAmount: compare.headerAmount,
    },
    matched,
    onlyInReference,
    onlyInCompare,
    mismatched,
  };
}
