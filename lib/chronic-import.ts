import { getDB } from '@/lib/database';
import { parseChronicWorkbook } from '@/lib/chronic-parse';
import type { ChronicBatchRow, ChronicFileType } from '@/lib/chronic-types';

export type ChronicImportStatus = 'imported' | 'skipped' | 'replaced' | 'error';

export interface ChronicImportResult {
  fileName: string;
  fileType: ChronicFileType | string;
  batchKey: string;
  hcode: string;
  period: string;
  status: ChronicImportStatus;
  rowCount: number;
  message: string;
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function ensureChronicTables() {
  const db = await getDB();
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS acd_conf (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        batch_key VARCHAR(64) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        hcode VARCHAR(16) NOT NULL,
        period VARCHAR(16) NOT NULL,
        ln VARCHAR(32) NULL,
        case_type VARCHAR(16) NULL,
        disease_code VARCHAR(16) NOT NULL,
        case_id VARCHAR(64) NULL,
        pid VARCHAR(32) NULL,
        first_date DATE NULL,
        service_count INT NOT NULL DEFAULT 0,
        service_from DATE NULL,
        service_to DATE NULL,
        dx_count INT NOT NULL DEFAULT 0,
        dx_last DATE NULL,
        drug_count INT NOT NULL DEFAULT 0,
        drug_last DATE NULL,
        confirmed VARCHAR(8) NULL,
        confirm_period VARCHAR(32) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_acd_conf_batch (batch_key),
        INDEX idx_acd_conf_hcode_period (hcode, period),
        INDEX idx_acd_conf_disease (disease_code),
        INDEX idx_acd_conf_type (case_type),
        INDEX idx_acd_conf_confirmed (confirmed),
        INDEX idx_acd_conf_first_date (first_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS acd_detail (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        batch_key VARCHAR(64) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        owner_hcode VARCHAR(16) NOT NULL,
        period VARCHAR(16) NOT NULL,
        hcode VARCHAR(16) NULL,
        hproc VARCHAR(16) NULL,
        dttran DATE NULL,
        hn VARCHAR(64) NULL,
        pid VARCHAR(32) NULL,
        rid VARCHAR(64) NULL,
        invno VARCHAR(64) NULL,
        disease_code VARCHAR(16) NULL,
        case_id VARCHAR(64) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_acd_detail_batch (batch_key),
        INDEX idx_acd_detail_owner_period (owner_hcode, period),
        INDEX idx_acd_detail_hcode (hcode),
        INDEX idx_acd_detail_disease (disease_code),
        INDEX idx_acd_detail_dttran (dttran)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } finally {
    await db.end();
  }
}

export async function importChronicFile(
  fileName: string,
  buffer: ArrayBuffer | Buffer,
  options?: { replace?: boolean }
): Promise<ChronicImportResult> {
  const replace = Boolean(options?.replace);

  let parsed;
  try {
    parsed = parseChronicWorkbook(fileName, buffer);
  } catch (err) {
    return {
      fileName,
      fileType: '?',
      batchKey: '',
      hcode: '',
      period: '',
      status: 'error',
      rowCount: 0,
      message: err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ',
    };
  }

  if (parsed.skipped) {
    return {
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      batchKey: parsed.batchKey,
      hcode: parsed.hcode,
      period: parsed.period,
      status: 'skipped',
      rowCount: 0,
      message: parsed.skipReason || 'ข้ามไฟล์นี้',
    };
  }

  if (!parsed.rowCount) {
    return {
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      batchKey: parsed.batchKey,
      hcode: parsed.hcode,
      period: parsed.period,
      status: 'error',
      rowCount: 0,
      message: 'ไม่พบรายการในไฟล์',
    };
  }

  await ensureChronicTables();
  const db = await getDB();

  try {
    const table = parsed.fileType === 'ACDCONF' ? 'acd_conf' : 'acd_detail';
    const [existRows]: any[] = await db.query(
      `SELECT COUNT(*) AS cnt FROM ${table} WHERE batch_key = ?`,
      [parsed.batchKey]
    );
    const exists = Number(existRows?.[0]?.cnt ?? 0) > 0;

    if (exists && !replace) {
      return {
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        batchKey: parsed.batchKey,
        hcode: parsed.hcode,
        period: parsed.period,
        status: 'skipped',
        rowCount: Number(existRows?.[0]?.cnt ?? 0),
        message: `ชุด ${parsed.batchKey} มีในระบบแล้ว — เปิดแทนที่ถ้าต้องการอัปโหลดใหม่`,
      };
    }

    if (exists && replace) {
      await db.query(`DELETE FROM ${table} WHERE batch_key = ?`, [parsed.batchKey]);
    }

    if (parsed.fileType === 'ACDCONF') {
      for (const batch of chunk(parsed.confRows, 300)) {
        const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
        const values: Array<string | number | null> = [];
        for (const row of batch) {
          values.push(
            parsed.batchKey,
            parsed.fileName,
            parsed.hcode,
            parsed.period,
            row.ln || null,
            row.type || null,
            row.diseaseCode,
            row.caseId || null,
            row.pid || null,
            row.firstDate,
            row.serviceCount,
            row.serviceFrom,
            row.serviceTo,
            row.dxCount,
            row.dxLast,
            row.drugCount,
            row.drugLast,
            row.confirmed || null,
            row.confirmPeriod || null
          );
        }
        await db.query(
          `INSERT INTO acd_conf (
            batch_key, file_name, hcode, period, ln, case_type, disease_code, case_id, pid,
            first_date, service_count, service_from, service_to, dx_count, dx_last,
            drug_count, drug_last, confirmed, confirm_period
          ) VALUES ${placeholders}`,
          values
        );
      }
    } else {
      for (const batch of chunk(parsed.detailRows, 300)) {
        const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
        const values: Array<string | number | null> = [];
        for (const row of batch) {
          values.push(
            parsed.batchKey,
            parsed.fileName,
            parsed.hcode,
            parsed.period,
            row.hcode || null,
            row.hproc || null,
            row.dttran,
            row.hn || null,
            row.pid || null,
            row.rid || null,
            row.invno || null,
            row.diseaseCode || null,
            row.caseId || null
          );
        }
        await db.query(
          `INSERT INTO acd_detail (
            batch_key, file_name, owner_hcode, period, hcode, hproc, dttran,
            hn, pid, rid, invno, disease_code, case_id
          ) VALUES ${placeholders}`,
          values
        );
      }
    }

    return {
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      batchKey: parsed.batchKey,
      hcode: parsed.hcode,
      period: parsed.period,
      status: exists ? 'replaced' : 'imported',
      rowCount: parsed.rowCount,
      message: exists
        ? `แทนที่ ${parsed.rowCount.toLocaleString('th-TH')} รายการ`
        : `บันทึก ${parsed.rowCount.toLocaleString('th-TH')} รายการ`,
    };
  } finally {
    await db.end();
  }
}

export async function listChronicBatches(limit = 40): Promise<ChronicBatchRow[]> {
  await ensureChronicTables();
  const db = await getDB();
  try {
    const [rows]: any[] = await db.query(
      `
      SELECT * FROM (
        SELECT
          batch_key,
          'ACDCONF' AS file_type,
          MAX(file_name) AS file_name,
          hcode,
          period,
          COUNT(*) AS row_count,
          MAX(created_at) AS uploaded_at,
          MIN(first_date) AS date_from,
          MAX(first_date) AS date_to
        FROM acd_conf
        GROUP BY batch_key, hcode, period
        UNION ALL
        SELECT
          batch_key,
          'ACDDETAIL' AS file_type,
          MAX(file_name) AS file_name,
          owner_hcode AS hcode,
          period,
          COUNT(*) AS row_count,
          MAX(created_at) AS uploaded_at,
          MIN(dttran) AS date_from,
          MAX(dttran) AS date_to
        FROM acd_detail
        GROUP BY batch_key, owner_hcode, period
      ) t
      ORDER BY uploaded_at DESC
      LIMIT ?
      `,
      [limit]
    );

    return (rows || []).map((row: any) => ({
      batchKey: String(row.batch_key),
      fileType: String(row.file_type),
      fileName: String(row.file_name || ''),
      hcode: String(row.hcode || ''),
      period: String(row.period || ''),
      rowCount: Number(row.row_count || 0),
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
      dateFrom: row.date_from ? String(row.date_from).slice(0, 10) : null,
      dateTo: row.date_to ? String(row.date_to).slice(0, 10) : null,
    }));
  } finally {
    await db.end();
  }
}
