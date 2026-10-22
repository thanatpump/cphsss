import { getDB } from '@/lib/database';
import { facilityKind, isShortFacility } from '@/lib/facility-scope';
import { hospitalName, loadHospitalDirectory } from '@/lib/hospital-names';

export async function fetchEclaimAudit(options: {
  year: number;
  mode: 'category' | 'allocate' | 'reject';
  hcode?: string;
  page?: number;
}) {
  const db = await getDB();
  try {
    const [rows]: any[] = await db.query(
      `
      SELECT id, doc_no AS statement, hcode, htype, patient_name, hn, receive_total, claim_amt, date_adm
      FROM eclaim_stm
      WHERE period LIKE ?
      `,
      [`${options.year}%`]
    );
    const names = await loadHospitalDirectory(db);
    type EclaimRow = {
      id: string;
      statement: string;
      hcode: string;
      hname: string;
      kind: 'hospital' | 'pcu';
      patient: string;
      hn: string;
      visitAt: string;
      amount: number;
      claim: number;
      category: string;
      primaryCode: string;
      primaryDesc: string;
      secondary: string;
    };
    let list: EclaimRow[] = (rows || []).map((row: any) => {
      const hcode = String(row.hcode || '').trim();
      const hname = hospitalName(names, hcode, hcode);
      return {
        id: String(row.id),
        statement: String(row.statement || ''),
        hcode,
        hname,
        kind: facilityKind(hname),
        patient: String(row.patient_name || ''),
        hn: String(row.hn || ''),
        visitAt: row.date_adm ? String(row.date_adm).slice(0, 10) : '',
        amount: Number(row.receive_total || 0),
        claim: Number(row.claim_amt || 0),
        category: String(row.htype || '-'),
        primaryCode: String(row.htype || ''),
        primaryDesc: 'หมวด HTYPE',
        secondary: '',
      };
    });

    list = list.filter((row) => isShortFacility(row.hcode));
    if (options.mode === 'allocate') list = list.filter((row) => row.amount > 0);
    if (options.mode === 'reject') list = list.filter((row) => row.amount <= 0);

    const page = Math.max(1, options.page || 1);
    const pageSize = 80;
    const start = (page - 1) * pageSize;

    if (options.mode === 'category') {
      const cats = new Map<string, { hcode: string; name: string; kind: 'hospital'; count: number; amount: number }>();
      for (const row of list) {
        const current = cats.get(row.category) || {
          hcode: row.category,
          name: `หมวด ${row.category}`,
          kind: 'hospital' as const,
          count: 0,
          amount: 0,
        };
        current.count += 1;
        current.amount += row.amount;
        cats.set(row.category, current);
      }
      const cases = options.hcode ? list.filter((row) => row.category === options.hcode) : list;
      return {
        year: options.year,
        mode: options.mode,
        total: list.length,
        amount: list.reduce((sum, row) => sum + row.amount, 0),
        page,
        pageSize,
        hospitals: [...cats.values()].sort((a, b) => b.amount - a.amount),
        pcus: [],
        caseTotal: cases.length,
        cases: cases.slice(start, start + pageSize).map(toCase),
      };
    }

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
      cases: cases.slice(start, start + pageSize).map(toCase),
    };
  } finally {
    await db.end();
  }
}

function toCase(row: {
  id: string;
  statement: string;
  hcode: string;
  hname: string;
  kind: 'hospital' | 'pcu';
  patient: string;
  hn: string;
  visitAt: string;
  amount: number;
  primaryCode: string;
  primaryDesc: string;
  secondary: string;
}) {
  return {
    ...row,
    late: '-' as const,
    sameDay: 0,
    sameMonth: 0,
    authen: '-' as const,
    reasons: row.amount <= 0 ? 'จ่าย 0 บาท' : '',
  };
}
