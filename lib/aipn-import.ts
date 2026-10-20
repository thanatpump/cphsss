import { parseStringPromise } from 'xml2js';
import { getDB } from '@/lib/database';
import type { AipnBatchRow, AipnFileType } from '@/lib/aipn-types';

export type AipnImportStatus = 'imported' | 'skipped' | 'replaced' | 'error';

export interface AipnImportResult {
  fileName: string;
  fileType: AipnFileType | string;
  stmno: string;
  hcode: string;
  period: string;
  status: AipnImportStatus;
  rowCount: number;
  amount: number;
  message: string;
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function xmlText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value === 'object' && value !== null && '_' in value) {
    return String((value as { _: unknown })._).trim();
  }
  return String(value).trim();
}

function xmlNumber(value: unknown): number {
  const n = parseFloat(xmlText(value));
  return Number.isFinite(n) ? n : 0;
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function detectAipnFileType(fileName: string): AipnFileType | null {
  const upper = fileName.toUpperCase();
  if (upper.includes('SIGNSTMM')) return 'SIGNSTMM';
  if (upper.includes('SIGNSTMS')) return 'SIGNSTMS';
  if (upper.includes('SIGNSUMM')) return 'SIGNSUMM';
  if (upper.includes('SIGNSUMS')) return 'SIGNSUMS';
  if (upper.includes('SIGNSUPM')) return 'SIGNSUPM';
  if (upper.includes('SIGNSUPS')) return 'SIGNSUPS';
  return null;
}

export async function importAipnXmlFile(
  fileName: string,
  xmlContent: string,
  options?: { replace?: boolean }
): Promise<AipnImportResult> {
  const replace = Boolean(options?.replace);
  const fileType = detectAipnFileType(fileName);
  const baseName = fileName.split(/[/\\]/).pop() || fileName;

  if (!fileType) {
    return {
      fileName: baseName,
      fileType: '?',
      stmno: '',
      hcode: '',
      period: '',
      status: 'error',
      rowCount: 0,
      amount: 0,
      message: 'ไม่รู้จักชนิดไฟล์ — รองรับ SIGNSTMM / SIGNSTMS จากชุด SIGNSTM',
    };
  }

  if (
    fileType === 'SIGNSUMM' ||
    fileType === 'SIGNSUMS' ||
    fileType === 'SIGNSUPM' ||
    fileType === 'SIGNSUPS'
  ) {
    return {
      fileName: baseName,
      fileType,
      stmno: '',
      hcode: '',
      period: '',
      status: 'skipped',
      rowCount: 0,
      amount: 0,
      message:
        fileType.startsWith('SIGNSUM')
          ? 'ไฟล์สรุป (SUM) — ใช้ดูยอดรวม ไม่บันทึกรายบรรทัด'
          : 'ไฟล์สนับสนุน (SUP) — ยังไม่รองรับบันทึกในรอบนี้',
    };
  }

  let parsed: any;
  try {
    parsed = await parseStringPromise(xmlContent, { explicitArray: false });
  } catch {
    return {
      fileName: baseName,
      fileType,
      stmno: '',
      hcode: '',
      period: '',
      status: 'error',
      rowCount: 0,
      amount: 0,
      message: 'อ่านไฟล์ XML ไม่สำเร็จ',
    };
  }

  const root = parsed?.STMLIST;
  if (!root?.stmdat) {
    return {
      fileName: baseName,
      fileType,
      stmno: '',
      hcode: '',
      period: '',
      status: 'error',
      rowCount: 0,
      amount: 0,
      message: 'รูปแบบไม่ใช่ STMLIST (SIGNSTMM/SIGNSTMS)',
    };
  }

  const stmno = xmlText(root.stmdat.stmno);
  const hcode = xmlText(root.stmdat.hcode);
  const period = xmlText(root.stmdat.period);
  const dateDue = xmlText(root.stmdat.dateDue);
  const bills = toArray(root.Bills?.Bill);

  if (!stmno) {
    return {
      fileName: baseName,
      fileType,
      stmno: '',
      hcode,
      period,
      status: 'error',
      rowCount: 0,
      amount: 0,
      message: 'ไม่พบ stmno ในไฟล์',
    };
  }

  if (!bills.length) {
    return {
      fileName: baseName,
      fileType,
      stmno,
      hcode,
      period,
      status: 'error',
      rowCount: 0,
      amount: 0,
      message: 'ไม่พบรายการ Bill ในไฟล์',
    };
  }

  const table = fileType === 'SIGNSTMM' ? 'signstmm' : 'signstms';
  const db = await getDB();

  try {
    const [existRows]: any[] = await db.query(`SELECT COUNT(*) AS cnt FROM ${table} WHERE stmno = ?`, [
      stmno,
    ]);
    const exists = Number(existRows?.[0]?.cnt ?? 0) > 0;

    if (exists && !replace) {
      return {
        fileName: baseName,
        fileType,
        stmno,
        hcode,
        period,
        status: 'skipped',
        rowCount: Number(existRows?.[0]?.cnt ?? 0),
        amount: 0,
        message: `stmno ${stmno} มีในระบบแล้ว — เปิดแทนที่ถ้าต้องการอัปโหลดใหม่`,
      };
    }

    if (exists && replace) {
      await db.query(`DELETE FROM ${table} WHERE stmno = ?`, [stmno]);
    }

    let inserted = 0;
    let amount = 0;

    if (table === 'signstmm') {
      for (const batch of chunk(bills, 100)) {
        const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
        const values: Array<string | number> = [];
        for (const bill of batch) {
          const reimb = xmlNumber(bill.Reimb);
          amount += reimb;
          values.push(
            period,
            stmno,
            dateDue,
            xmlText(bill.hmain),
            xmlText(bill.hcode) || hcode,
            xmlText(bill.hproc),
            xmlText(bill.hn),
            xmlText(bill.an),
            xmlText(bill.pid),
            xmlText(bill.name),
            xmlText(bill.dateadm),
            xmlText(bill.datedsc),
            xmlText(bill.ft),
            xmlText(bill.bf),
            xmlText(bill.drg),
            xmlNumber(bill.rw),
            xmlNumber(bill.adjrw),
            Math.trunc(xmlNumber(bill.due)),
            Math.trunc(xmlNumber(bill.ptype)),
            xmlText(bill.rwtype),
            xmlText(bill.rptype),
            xmlText(bill.rid),
            Math.trunc(xmlNumber(bill.pstm)),
            xmlText(bill.careas),
            Math.trunc(xmlNumber(bill.sc)),
            Math.trunc(xmlNumber(bill.ed)),
            reimb,
            xmlNumber(bill.Nreimb),
            xmlNumber(bill.Copay),
            xmlText(bill.CP),
            xmlText(bill.PP)
          );
        }
        await db.query(
          `INSERT INTO signstmm (
            period, stmno, dateDue, hmain, hcode, hproc, hn, an, pid, name,
            dateadm, datedsc, ft, bf, drg, rw, adjrw, due, ptype, rwtype, rptype,
            rid, pstm, careas, sc, ed, Reimb, Nreimb, Copay, CP, PP
          ) VALUES ${placeholders}`,
          values
        );
        inserted += batch.length;
      }
    } else {
      for (const batch of chunk(bills, 100)) {
        const placeholders = batch
          .map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .join(',');
        const values: Array<string | number> = [];
        for (const bill of batch) {
          const reimb = xmlNumber(bill.Reimb);
          amount += reimb;
          values.push(
            period,
            stmno,
            dateDue,
            xmlText(bill.hcode) || hcode,
            xmlText(bill.hmain),
            xmlText(bill.hproc),
            xmlText(bill.hn),
            xmlText(bill.an),
            xmlText(bill.pid),
            xmlText(bill.name),
            xmlText(bill.dateadm),
            xmlText(bill.datedsc),
            xmlText(bill.ft),
            xmlText(bill.bf),
            xmlText(bill.drg),
            xmlNumber(bill.rw),
            xmlNumber(bill.adjrw),
            Math.trunc(xmlNumber(bill.due)),
            Math.trunc(xmlNumber(bill.ptype)),
            xmlText(bill.rwtype),
            xmlText(bill.mtype),
            xmlText(bill.rptype),
            xmlText(bill.rid),
            Math.trunc(xmlNumber(bill.pstm)),
            xmlText(bill.careas),
            Math.trunc(xmlNumber(bill.sc)),
            Math.trunc(xmlNumber(bill.ed)),
            reimb,
            xmlNumber(bill.Nreimb),
            xmlNumber(bill.Copay),
            xmlText(bill.CP),
            xmlText(bill.PP)
          );
        }
        await db.query(
          `INSERT INTO signstms (
            period, stmno, dateDue, hcode, hmain, hproc, hn, an, pid, name,
            dateadm, datedsc, ft, bf, drg, rw, adjrw, due, ptype, rwtype, mtype, rptype,
            rid, pstm, careas, sc, ed, Reimb, Nreimb, Copay, CP, PP
          ) VALUES ${placeholders}`,
          values
        );
        inserted += batch.length;
      }
    }

    return {
      fileName: baseName,
      fileType,
      stmno,
      hcode,
      period,
      status: exists ? 'replaced' : 'imported',
      rowCount: inserted,
      amount,
      message: exists
        ? `แทนที่ ${inserted.toLocaleString('th-TH')} รายการ`
        : `บันทึก ${inserted.toLocaleString('th-TH')} รายการ`,
    };
  } finally {
    await db.end();
  }
}

export async function listAipnBatches(limit = 40): Promise<AipnBatchRow[]> {
  const db = await getDB();
  try {
    const [rows]: any[] = await db.query(
      `
      SELECT * FROM (
        SELECT
          stmno,
          'SIGNSTMM' AS file_type,
          MAX(hcode) AS hcode,
          MAX(period) AS period,
          COUNT(*) AS row_count,
          COALESCE(SUM(Reimb), 0) AS amount,
          COALESCE(SUM(adjrw), 0) AS adjrw,
          MAX(created_at) AS uploaded_at,
          MIN(DATE(dateadm)) AS date_from,
          MAX(DATE(datedsc)) AS date_to
        FROM signstmm
        WHERE stmno IS NOT NULL AND stmno != ''
        GROUP BY stmno
        UNION ALL
        SELECT
          stmno,
          'SIGNSTMS' AS file_type,
          MAX(hcode) AS hcode,
          MAX(period) AS period,
          COUNT(*) AS row_count,
          COALESCE(SUM(Reimb), 0) AS amount,
          COALESCE(SUM(adjrw), 0) AS adjrw,
          MAX(created_at) AS uploaded_at,
          MIN(DATE(dateadm)) AS date_from,
          MAX(DATE(datedsc)) AS date_to
        FROM signstms
        WHERE stmno IS NOT NULL AND stmno != ''
        GROUP BY stmno
      ) t
      ORDER BY uploaded_at DESC
      LIMIT ?
      `,
      [limit]
    );

    return (rows || []).map((row: any) => ({
      stmno: String(row.stmno || ''),
      fileType: String(row.file_type || ''),
      hcode: String(row.hcode || ''),
      period: String(row.period || ''),
      rowCount: Number(row.row_count || 0),
      amount: Number(row.amount || 0),
      adjrw: Number(row.adjrw || 0),
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
      dateFrom: row.date_from ? String(row.date_from).slice(0, 10) : null,
      dateTo: row.date_to ? String(row.date_to).slice(0, 10) : null,
    }));
  } finally {
    await db.end();
  }
}
