import { getDB } from '@/lib/database';
import { parseXmlFile, type FileType, type ParsedFile } from '@/lib/sogn-xml-parser';

export type SsopImportStatus = 'imported' | 'skipped' | 'replaced' | 'error';

export interface SsopImportFileResult {
  fileName: string;
  fileType: FileType | string;
  stmDoc: string;
  hcode: string;
  hname: string;
  period: string;
  status: SsopImportStatus;
  count: number;
  amount: number;
  message: string;
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function xmlText(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (typeof value === 'object' && value !== null && '_' in value) {
    return String((value as { _: unknown })._).trim();
  }
  return String(value).trim();
}

export async function importSsopXmlFile(
  fileName: string,
  xmlContent: string,
  options?: { replace?: boolean }
): Promise<SsopImportFileResult> {
  const parsed = await parseXmlFile(fileName, xmlContent);
  const replace = Boolean(options?.replace);

  if (parsed.fileType === 'SOGNSUMM' || parsed.fileType === 'SOGNSUMP') {
    return {
      fileName,
      fileType: parsed.fileType,
      stmDoc: parsed.stmDoc || fileName,
      hcode: parsed.hcode,
      hname: parsed.hname,
      period: parsed.period,
      status: 'skipped',
      count: parsed.headerCount || 0,
      amount: parsed.headerAmount || 0,
      message: 'ไฟล์สรุป (SUMM) — ใช้ดูยอดรวม ไม่บันทึกรายบรรทัด',
    };
  }

  if (parsed.fileType === 'SOGNADJM' || parsed.fileType === 'SOGNADJP' || parsed.fileType === 'ADJLIST') {
    return {
      fileName,
      fileType: parsed.fileType,
      stmDoc: parsed.stmDoc || fileName,
      hcode: parsed.hcode,
      hname: parsed.hname,
      period: parsed.period,
      status: 'skipped',
      count: parsed.billCount,
      amount: parsed.billTotal,
      message: 'ไฟล์ปรับแก้ (ADJ) — ยังไม่รองรับบันทึกในรอบนี้',
    };
  }

  if (parsed.fileType !== 'SOGNSTMM' && parsed.fileType !== 'SOGNSTMP') {
    return {
      fileName,
      fileType: parsed.fileType,
      stmDoc: parsed.stmDoc || fileName,
      hcode: parsed.hcode,
      hname: parsed.hname,
      period: parsed.period,
      status: 'error',
      count: 0,
      amount: 0,
      message: `ชนิดไฟล์ไม่รองรับ (${parsed.fileType}) รองรับ SOGNSTMM / SOGNSTMP`,
    };
  }

  if (!parsed.stmDoc) {
    return {
      fileName,
      fileType: parsed.fileType,
      stmDoc: '',
      hcode: parsed.hcode,
      hname: parsed.hname,
      period: parsed.period,
      status: 'error',
      count: 0,
      amount: 0,
      message: 'ไม่พบ STMdoc ในไฟล์',
    };
  }

  if (parsed.billCount === 0) {
    return {
      fileName,
      fileType: parsed.fileType,
      stmDoc: parsed.stmDoc,
      hcode: parsed.hcode,
      hname: parsed.hname,
      period: parsed.period,
      status: 'error',
      count: 0,
      amount: 0,
      message: 'ไม่พบรายการ TBill ในไฟล์',
    };
  }

  const table = parsed.fileType === 'SOGNSTMM' ? 'sognstmm' : 'sognstmp';
  const db = await getDB();

  try {
    const [existRows]: any[] = await db.query(`SELECT COUNT(*) AS cnt FROM ${table} WHERE STMdoc = ?`, [
      parsed.stmDoc,
    ]);
    const exists = Number(existRows?.[0]?.cnt ?? 0) > 0;

    if (exists && !replace) {
      return {
        fileName,
        fileType: parsed.fileType,
        stmDoc: parsed.stmDoc,
        hcode: parsed.hcode,
        hname: parsed.hname,
        period: parsed.period,
        status: 'skipped',
        count: Number(existRows?.[0]?.cnt ?? 0),
        amount: parsed.billTotal,
        message: `STMdoc ${parsed.stmDoc} มีในระบบแล้ว — เปิดแทนที่ถ้าต้องการอัปโหลดใหม่`,
      };
    }

    if (exists && replace) {
      await db.query(`DELETE FROM ${table} WHERE STMdoc = ?`, [parsed.stmDoc]);
    }

    const dateStart = '';
    const dateEnd = '';
    const dateDue = '';
    const dateIssue = '';

    // header dates from re-parse for accuracy
    const { parseStringPromise } = await import('xml2js');
    const raw = await parseStringPromise(xmlContent, { explicitArray: false });
    const rootKey = Object.keys(raw)[0];
    const root = raw[rootKey] || {};
    const headerDates = {
      dateStart: xmlText(root.dateStart),
      dateEnd: xmlText(root.dateEnd),
      dateDue: xmlText(root.dateDue),
      dateIssue: xmlText(root.dateIssue),
    };

    let inserted = 0;

    if (table === 'sognstmm') {
      for (const batch of chunk(parsed.bills, 200)) {
        const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
        const values: Array<string | number> = [];
        for (const bill of batch) {
          values.push(
            parsed.stmDoc,
            headerDates.dateStart || dateStart,
            headerDates.dateEnd || dateEnd,
            headerDates.dateDue || dateDue,
            headerDates.dateIssue || dateIssue,
            bill.station || '',
            bill.hmain || '',
            bill.hproc || '',
            bill.hcare || '',
            bill.hn || '',
            bill.pid || '',
            bill.name || '',
            bill.bf || '',
            '',
            bill.care || '',
            bill.payplan || '',
            bill.bp || '',
            bill.invno || '',
            bill.dttran || '',
            bill.copay || '',
            '',
            bill.total || 0,
            bill.rid || ''
          );
        }
        await db.query(
          `INSERT INTO sognstmm (
            STMdoc, dateStart, dateEnd, dateDue, dateIssue, station,
            hmain, hproc, hcare, hn, pid, name, bf, pcode, care,
            payplan, bp, invno, dttran, copay, cfh, total, rid
          ) VALUES ${placeholders}`,
          values
        );
        inserted += batch.length;
      }
    } else {
      for (const batch of chunk(parsed.bills, 200)) {
        const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
        const values: Array<string | number> = [];
        for (const bill of batch) {
          values.push(
            parsed.stmDoc,
            headerDates.dateStart || dateStart,
            headerDates.dateEnd || dateEnd,
            headerDates.dateDue || dateDue,
            headerDates.dateIssue || dateIssue,
            bill.station || '',
            bill.hmain || '',
            bill.hproc || '',
            bill.hcare || '',
            bill.hn || '',
            bill.pid || '',
            bill.name || '',
            bill.invno || '',
            bill.bf || '',
            '',
            bill.care || '',
            bill.payplan || '',
            bill.bp || '',
            bill.dttran || '',
            bill.copay || '',
            '',
            bill.total || 0,
            '',
            bill.rid || ''
          );
        }
        await db.query(
          `INSERT INTO sognstmp (
            STMdoc, dateStart, dateEnd, dateDue, dateIssue, station,
            hmain, hproc, hcare, hn, pid, name, invno, bf, pcode, care,
            payplan, bp, dttran, copay, cfh, total, ExtP, rid
          ) VALUES ${placeholders}`,
          values
        );
        inserted += batch.length;
      }
    }

    return {
      fileName,
      fileType: parsed.fileType,
      stmDoc: parsed.stmDoc,
      hcode: parsed.hcode,
      hname: parsed.hname,
      period: parsed.period,
      status: exists ? 'replaced' : 'imported',
      count: inserted,
      amount: parsed.billTotal,
      message: exists
        ? `แทนที่และบันทึก ${inserted.toLocaleString('th-TH')} รายการ`
        : `บันทึก ${inserted.toLocaleString('th-TH')} รายการ`,
    };
  } finally {
    await db.end();
  }
}

export async function listRecentSsopBatches(limit = 30) {
  const db = await getDB();
  try {
    const [rows]: any[] = await db.query(
      `
      SELECT * FROM (
        SELECT
          STMdoc AS stm_doc,
          'SOGNSTMM' AS file_type,
          COUNT(*) AS row_count,
          COALESCE(SUM(total), 0) AS amount,
          MAX(created_at) AS uploaded_at,
          MIN(DATE(dttran)) AS date_from,
          MAX(DATE(dttran)) AS date_to
        FROM sognstmm
        WHERE STMdoc IS NOT NULL AND STMdoc != ''
        GROUP BY STMdoc
        UNION ALL
        SELECT
          STMdoc AS stm_doc,
          'SOGNSTMP' AS file_type,
          COUNT(*) AS row_count,
          COALESCE(SUM(total), 0) AS amount,
          MAX(created_at) AS uploaded_at,
          MIN(DATE(dttran)) AS date_from,
          MAX(DATE(dttran)) AS date_to
        FROM sognstmp
        WHERE STMdoc IS NOT NULL AND STMdoc != ''
        GROUP BY STMdoc
      ) batches
      ORDER BY uploaded_at DESC
      LIMIT ?
      `,
      [limit]
    );

    return (rows || []).map((row: any) => ({
      stmDoc: String(row.stm_doc ?? ''),
      fileType: String(row.file_type ?? ''),
      rowCount: Number(row.row_count ?? 0),
      amount: Number(row.amount ?? 0),
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
      dateFrom: row.date_from ? String(row.date_from).slice(0, 10) : null,
      dateTo: row.date_to ? String(row.date_to).slice(0, 10) : null,
    }));
  } finally {
    await db.end();
  }
}

export type { ParsedFile };
