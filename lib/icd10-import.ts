import { getDB } from '@/lib/database';
import { parseIcd10TextFile } from '@/lib/icd10-parse';
import type { Icd10BatchRow, Icd10FileType } from '@/lib/icd10-types';

export type Icd10ImportStatus = 'imported' | 'skipped' | 'replaced' | 'error';

export interface Icd10ImportResult {
  fileName: string;
  fileType: Icd10FileType | string;
  batchKey: string;
  hcode: string;
  period: string;
  status: Icd10ImportStatus;
  visitCount: number;
  diagCount: number;
  message: string;
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function ensureIcd10Tables() {
  const db = await getDB();
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS icd10_diag (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        batch_key VARCHAR(64) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(8) NOT NULL,
        hcode VARCHAR(16) NOT NULL,
        period VARCHAR(16) NOT NULL,
        visit_key VARCHAR(96) NOT NULL,
        clinic VARCHAR(32) NULL,
        ref1 VARCHAR(64) NULL,
        hn VARCHAR(64) NULL,
        visit_no VARCHAR(64) NULL,
        cid VARCHAR(32) NULL,
        visit_at DATETIME NULL,
        seq INT NOT NULL,
        icd_code VARCHAR(16) NOT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_icd10_batch (batch_key),
        INDEX idx_icd10_code (icd_code),
        INDEX idx_icd10_type_code (file_type, icd_code),
        INDEX idx_icd10_hcode_period (hcode, period),
        INDEX idx_icd10_visit_key (visit_key),
        INDEX idx_icd10_visit_at (visit_at),
        INDEX idx_icd10_primary (is_primary, icd_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } finally {
    await db.end();
  }
}

export async function importIcd10TextFile(
  fileName: string,
  content: string,
  options?: { replace?: boolean }
): Promise<Icd10ImportResult> {
  const replace = Boolean(options?.replace);

  let parsed;
  try {
    parsed = parseIcd10TextFile(fileName, content);
  } catch (err) {
    return {
      fileName,
      fileType: '?',
      batchKey: '',
      hcode: '',
      period: '',
      status: 'error',
      visitCount: 0,
      diagCount: 0,
      message: err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ',
    };
  }

  await ensureIcd10Tables();
  const db = await getDB();

  try {
    const [existRows]: any[] = await db.query(
      `SELECT COUNT(DISTINCT visit_key) AS visits, COUNT(*) AS diags FROM icd10_diag WHERE batch_key = ?`,
      [parsed.batchKey]
    );
    const exists = Number(existRows?.[0]?.diags ?? 0) > 0;

    if (exists && !replace) {
      return {
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        batchKey: parsed.batchKey,
        hcode: parsed.hcode,
        period: parsed.period,
        status: 'skipped',
        visitCount: Number(existRows?.[0]?.visits ?? 0),
        diagCount: Number(existRows?.[0]?.diags ?? 0),
        message: `ชุด ${parsed.batchKey} มีในระบบแล้ว — เปิดแทนที่ถ้าต้องการอัปโหลดใหม่`,
      };
    }

    if (exists && replace) {
      await db.query(`DELETE FROM icd10_diag WHERE batch_key = ?`, [parsed.batchKey]);
    }

    type Row = Array<string | number | null>;
    const rows: Row[] = [];
    parsed.visits.forEach((visit, visitIdx) => {
      const visitKey = `${parsed.batchKey}_${visitIdx}`;
      visit.codes.forEach((code, seqIdx) => {
        rows.push([
          parsed.batchKey,
          parsed.fileName,
          parsed.fileType,
          visit.hcode || parsed.hcode,
          parsed.period,
          visitKey,
          visit.clinic || null,
          visit.ref1 || null,
          visit.hn || null,
          visit.visitNo || null,
          visit.cid || null,
          visit.visitAt,
          seqIdx + 1,
          code,
          seqIdx === 0 ? 1 : 0,
        ]);
      });
    });

    for (const batch of chunk(rows, 400)) {
      const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      const values = batch.flat();
      await db.query(
        `INSERT INTO icd10_diag (
          batch_key, file_name, file_type, hcode, period, visit_key,
          clinic, ref1, hn, visit_no, cid, visit_at, seq, icd_code, is_primary
        ) VALUES ${placeholders}`,
        values
      );
    }

    return {
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      batchKey: parsed.batchKey,
      hcode: parsed.hcode,
      period: parsed.period,
      status: exists ? 'replaced' : 'imported',
      visitCount: parsed.visitCount,
      diagCount: parsed.diagCount,
      message: exists
        ? `แทนที่ ${parsed.visitCount.toLocaleString('th-TH')} visit / ${parsed.diagCount.toLocaleString('th-TH')} รหัสโรค`
        : `บันทึก ${parsed.visitCount.toLocaleString('th-TH')} visit / ${parsed.diagCount.toLocaleString('th-TH')} รหัสโรค`,
    };
  } finally {
    await db.end();
  }
}

export async function listIcd10Batches(limit = 40): Promise<Icd10BatchRow[]> {
  await ensureIcd10Tables();
  const db = await getDB();
  try {
    const [rows]: any[] = await db.query(
      `
      SELECT
        batch_key,
        file_type,
        MAX(file_name) AS file_name,
        hcode,
        period,
        COUNT(DISTINCT visit_key) AS visit_count,
        COUNT(*) AS diag_count,
        MAX(created_at) AS uploaded_at,
        MIN(DATE(visit_at)) AS date_from,
        MAX(DATE(visit_at)) AS date_to
      FROM icd10_diag
      GROUP BY batch_key, file_type, hcode, period
      ORDER BY MAX(created_at) DESC
      LIMIT ?
      `,
      [limit]
    );

    return (rows || []).map((row: any) => ({
      batchKey: String(row.batch_key),
      fileType: String(row.file_type) as Icd10FileType,
      fileName: String(row.file_name || ''),
      hcode: String(row.hcode || ''),
      period: String(row.period || ''),
      visitCount: Number(row.visit_count || 0),
      diagCount: Number(row.diag_count || 0),
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
      dateFrom: row.date_from ? String(row.date_from).slice(0, 10) : null,
      dateTo: row.date_to ? String(row.date_to).slice(0, 10) : null,
    }));
  } finally {
    await db.end();
  }
}
