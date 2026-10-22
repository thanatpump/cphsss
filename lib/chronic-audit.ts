import { getDB } from '@/lib/database';
import { chronicLevel } from '@/lib/codebook';
import { facilityKind, isShortFacility } from '@/lib/facility-scope';
import { hospitalName, loadHospitalDirectory } from '@/lib/hospital-names';

export async function fetchChronicAudit(options: {
  year: number;
  hcode?: string;
  page?: number;
}) {
  const db = await getDB();
  try {
    const [rows]: any[] = await db.query(
      `
      SELECT id, hcode, disease_code, service_count, pid, case_id, period, first_date
      FROM acd_conf
      WHERE period LIKE ?
      `,
      [`${options.year}%`]
    );
    const names = await loadHospitalDirectory(db);
    type ChronicRow = {
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
      primaryCode: string;
      primaryDesc: string;
      secondary: string;
      reasons: string;
    };
    let list: ChronicRow[] = (rows || []).map((row: any) => {
      const hcode = String(row.hcode || '').trim();
      const hname = hospitalName(names, hcode, hcode);
      const level = chronicLevel(String(row.disease_code || ''));
      const visits = Number(row.service_count || 0);
      return {
        id: String(row.id),
        statement: String(row.case_id || row.period || ''),
        hcode,
        hname,
        kind: facilityKind(hname),
        patient: String(row.pid || ''),
        hn: '',
        visitAt: row.first_date ? String(row.first_date).slice(0, 10) : '',
        amount: visits * (level?.weight || 0),
        visits,
        primaryCode: String(row.disease_code || ''),
        primaryDesc: level?.name || '',
        secondary: level ? `น้ำหนัก ${level.weight}` : '',
        reasons: visits <= 0 ? 'จำนวนครั้ง = 0' : '',
      };
    });
    list = list.filter((row) => isShortFacility(row.hcode) && row.visits > 0);

    const facilities = new Map<string, { hcode: string; name: string; kind: 'hospital' | 'pcu'; count: number; amount: number }>();
    for (const row of list) {
      const current = facilities.get(row.hcode) || {
        hcode: row.hcode,
        name: row.hname,
        kind: row.kind,
        count: 0,
        amount: 0,
      };
      current.count += row.visits;
      current.amount += row.amount;
      facilities.set(row.hcode, current);
    }
    const grouped = [...facilities.values()].sort((a, b) => b.amount - a.amount);
    const cases = options.hcode ? list.filter((row) => row.hcode === options.hcode) : list;
    const page = Math.max(1, options.page || 1);
    const start = (page - 1) * 80;
    return {
      year: options.year,
      mode: 'allocate',
      total: list.length,
      amount: list.reduce((sum, row) => sum + row.amount, 0),
      page,
      pageSize: 80,
      hospitals: grouped.filter((row) => row.kind === 'hospital'),
      pcus: grouped.filter((row) => row.kind === 'pcu'),
      caseTotal: cases.length,
      cases: cases.slice(start, start + 80).map((row) => ({
        ...row,
        late: '-' as const,
        sameDay: 0,
        sameMonth: 0,
        authen: '-' as const,
      })),
    };
  } finally {
    await db.end();
  }
}
