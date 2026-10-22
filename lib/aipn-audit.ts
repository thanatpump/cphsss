import { parseSignPeriod } from '@/lib/aipn-report';
import { getDB } from '@/lib/database';
import { ensureIcd10Codebook, formatIcdList, icdDescription } from '@/lib/codebook';
import { facilityKind, isWideFacility } from '@/lib/facility-scope';
import { hospitalName, loadHospitalDirectory } from '@/lib/hospital-names';

export type AipnAuditMode = 'cases' | 'allocate' | 'reject';

function ymd(value: Date | null): string {
  if (!value) return '';
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function fetchAipnAudit(options: {
  year: number;
  mode: AipnAuditMode;
  minRw?: number;
  hcode?: string;
  page?: number;
}) {
  await ensureIcd10Codebook();
  const db = await getDB();
  try {
    const [periodRows]: any[] = await db.query(
      `SELECT DISTINCT period FROM signstmm WHERE period IS NOT NULL AND period != ''`
    );
    const periods = (periodRows || [])
      .map((row: { period: string }) => String(row.period || ''))
      .filter((period: string) => parseSignPeriod(period)?.year === options.year);
    if (periods.length === 0) {
      return {
        year: options.year,
        mode: options.mode,
        total: 0,
        amount: 0,
        page: 1,
        pageSize: 80,
        hospitals: [],
        pcus: [],
        cases: [],
        caseTotal: 0,
      };
    }
    const [rows]: any[] = await db.query(
      `
      SELECT id, stmno, hproc, hcode, hn, an, name, dateadm, ft, rw, adjrw
      FROM signstmm
      WHERE period IN (${periods.map(() => '?').join(',')})
      `,
      periods
    );
    const [diagRows]: any[] = await db.query(
      `
      SELECT ref1, hn, icd_code, is_primary, seq
      FROM icd10_diag
      WHERE file_type = 'IPD'
      `
    );
    const names = await loadHospitalDirectory(db);
    const byRef = new Map<string, Array<{ code: string; primary: boolean; seq: number }>>();
    const byHn = new Map<string, Array<{ code: string; primary: boolean; seq: number }>>();
    for (const row of diagRows || []) {
      const item = {
        code: String(row.icd_code || '').trim().toUpperCase(),
        primary: Number(row.is_primary) === 1 || Number(row.seq) === 1,
        seq: Number(row.seq || 0),
      };
      if (!item.code) continue;
      const ref = String(row.ref1 || '').trim();
      const hn = String(row.hn || '').trim();
      if (ref) {
        const list = byRef.get(ref) || [];
        list.push(item);
        byRef.set(ref, list);
      }
      if (hn) {
        const list = byHn.get(hn) || [];
        list.push(item);
        byHn.set(hn, list);
      }
    }

    type AipnRow = {
      id: string;
      statement: string;
      hcode: string;
      hname: string;
      kind: 'hospital' | 'pcu';
      patient: string;
      hn: string;
      visitAt: string;
      amount: number;
      visits: number;
      rw: number;
      ft: string;
      primaryCode: string;
      primaryDesc: string;
      secondary: string;
    };
    let list: AipnRow[] = (rows || []).map((row: any) => {
      const hcode = String(row.hproc || row.hcode || '').trim();
      const hname = hospitalName(names, hcode, hcode);
      const diags = (byRef.get(String(row.an || '').trim()) || byHn.get(String(row.hn || '').trim()) || [])
        .slice()
        .sort((a, b) => a.seq - b.seq);
      const primary = diags.find((item) => item.primary) || diags[0];
      const secondary = diags.filter((item) => item !== primary).map((item) => item.code);
      return {
        id: String(row.id),
        statement: String(row.stmno || ''),
        hcode,
        hname,
        kind: facilityKind(hname),
        patient: String(row.name || ''),
        hn: String(row.hn || ''),
        visitAt: ymd(asDate(row.dateadm)),
        amount: Number(row.adjrw || 0),
        visits: 1,
        rw: Number(row.rw || 0),
        ft: String(row.ft || '').toUpperCase(),
        primaryCode: primary?.code || '',
        primaryDesc: icdDescription(primary?.code || ''),
        secondary: formatIcdList(secondary),
      };
    });

    list = list.filter((row) => isWideFacility(row.hcode));
    if (options.minRw) list = list.filter((row) => row.rw >= options.minRw!);
    if (options.mode === 'allocate') list = list.filter((row) => row.ft !== 'N');
    if (options.mode === 'reject') list = list.filter((row) => row.ft === 'N');
    const facilities = new Map<string, { hcode: string; name: string; kind: 'hospital' | 'pcu'; count: number; amount: number }>();
    for (const row of list) {
      const current = facilities.get(row.hcode) || {
        hcode: row.hcode,
        name: row.hname,
        kind: row.kind,
        count: 0,
        amount: 0,
      };
      current.count += 1;
      current.amount += row.amount;
      facilities.set(row.hcode, current);
    }
    const grouped = [...facilities.values()].sort((a, b) => b.amount - a.amount);
    const cases = options.hcode ? list.filter((row) => row.hcode === options.hcode) : list;
    const page = Math.max(1, options.page || 1);
    const pageSize = 80;
    const start = (page - 1) * pageSize;

    return {
      year: options.year,
      mode: options.mode,
      total: list.length,
      amount: list.reduce((sum, row) => sum + row.amount, 0),
      page,
      pageSize,
      hospitals: grouped.filter((row) => row.kind === 'hospital'),
      pcus: grouped.filter((row) => row.kind === 'pcu'),
      caseTotal: cases.length,
      cases: cases.slice(start, start + pageSize).map((row) => ({
        id: row.id,
        statement: row.statement,
        hcode: row.hcode,
        hname: row.hname,
        kind: row.kind,
        patient: row.patient,
        hn: row.hn,
        visitAt: row.visitAt,
        amount: row.amount,
        primaryCode: row.primaryCode,
        primaryDesc: row.primaryDesc,
        secondary: row.secondary,
        late: '-' as const,
        sameDay: 0,
        sameMonth: 0,
        authen: '-' as const,
        reasons: row.ft === 'N' ? 'ft = N' : '',
      })),
    };
  } finally {
    await db.end();
  }
}
