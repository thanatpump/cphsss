import { getDB } from '@/lib/database';
import { parseEclaimWorkbook } from '@/lib/eclaim-parse';
import type { EclaimBatchRow } from '@/lib/eclaim-types';

export type EclaimImportStatus = 'imported' | 'skipped' | 'replaced' | 'error';

export interface EclaimImportResult {
  fileName: string;
  fileType: string;
  batchKey: string;
  docNo: string;
  hcode: string;
  period: string;
  status: EclaimImportStatus;
  rowCount: number;
  amount: number;
  message: string;
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function ensureEclaimTables() {
  const db = await getDB();
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS eclaim_stm (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        batch_key VARCHAR(80) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        doc_no VARCHAR(64) NOT NULL,
        owner_hcode VARCHAR(16) NOT NULL,
        period VARCHAR(16) NOT NULL,
        seq_no VARCHAR(32) NULL,
        rep VARCHAR(32) NULL,
        hmain VARCHAR(16) NULL,
        hcode VARCHAR(16) NULL,
        hsend VARCHAR(16) NULL,
        htype VARCHAR(8) NULL,
        hn VARCHAR(64) NULL,
        an VARCHAR(64) NULL,
        pid VARCHAR(32) NULL,
        patient_name VARCHAR(255) NULL,
        date_adm DATETIME NULL,
        date_dsc DATETIME NULL,
        projcode VARCHAR(32) NULL,
        drg VARCHAR(32) NULL,
        rw DECIMAL(12,5) NOT NULL DEFAULT 0,
        adjrw DECIMAL(12,5) NOT NULL DEFAULT 0,
        self_pay DECIMAL(14,2) NOT NULL DEFAULT 0,
        rate_pay DECIMAL(14,2) NOT NULL DEFAULT 0,
        claim_amt DECIMAL(14,2) NOT NULL DEFAULT 0,
        act_amt DECIMAL(14,2) NOT NULL DEFAULT 0,
        receive_total DECIMAL(14,2) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_eclaim_stm_batch (batch_key),
        INDEX idx_eclaim_stm_doc (doc_no),
        INDEX idx_eclaim_stm_period (period),
        INDEX idx_eclaim_stm_hcode (hcode),
        INDEX idx_eclaim_stm_rep (rep)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS eclaim_pay (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        batch_key VARCHAR(80) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        doc_no VARCHAR(64) NOT NULL,
        owner_hcode VARCHAR(16) NOT NULL,
        period VARCHAR(16) NOT NULL,
        hmain_code VARCHAR(16) NULL,
        hmain_name VARCHAR(255) NULL,
        htreat_code VARCHAR(16) NULL,
        htreat_name VARCHAR(255) NULL,
        hrecord_code VARCHAR(16) NULL,
        hrecord_name VARCHAR(255) NULL,
        pay_from VARCHAR(255) NULL,
        amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        remark VARCHAR(255) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_eclaim_pay_batch (batch_key),
        INDEX idx_eclaim_pay_doc (doc_no),
        INDEX idx_eclaim_pay_period (period),
        INDEX idx_eclaim_pay_treat (htreat_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS eclaim_summary (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        batch_key VARCHAR(80) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        doc_no VARCHAR(64) NOT NULL,
        owner_hcode VARCHAR(16) NOT NULL,
        period VARCHAR(16) NOT NULL,
        period_rep VARCHAR(32) NULL,
        hmain VARCHAR(16) NULL,
        hcode VARCHAR(16) NULL,
        hsend VARCHAR(16) NULL,
        rep_no VARCHAR(32) NULL,
        total_cases INT NOT NULL DEFAULT 0,
        pass_cases INT NOT NULL DEFAULT 0,
        fail_cases INT NOT NULL DEFAULT 0,
        claim_amt DECIMAL(14,2) NOT NULL DEFAULT 0,
        act_amt DECIMAL(14,2) NOT NULL DEFAULT 0,
        receive_total DECIMAL(14,2) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_eclaim_sum_batch (batch_key),
        INDEX idx_eclaim_sum_period (period)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } finally {
    await db.end();
  }
}

export async function importEclaimFile(
  fileName: string,
  buffer: ArrayBuffer | Buffer,
  options?: { replace?: boolean }
): Promise<EclaimImportResult> {
  const replace = Boolean(options?.replace);

  let parsed;
  try {
    parsed = parseEclaimWorkbook(fileName, buffer);
  } catch (err) {
    return {
      fileName,
      fileType: '?',
      batchKey: '',
      docNo: '',
      hcode: '',
      period: '',
      status: 'error',
      rowCount: 0,
      amount: 0,
      message: err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ',
    };
  }

  if (parsed.skipped) {
    return {
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      batchKey: parsed.batchKey,
      docNo: parsed.docNo,
      hcode: parsed.hcode,
      period: parsed.period,
      status: 'skipped',
      rowCount: 0,
      amount: 0,
      message: parsed.skipReason || 'ข้ามไฟล์นี้',
    };
  }

  if (!parsed.rowCount && !parsed.summaryRows.length) {
    return {
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      batchKey: parsed.batchKey,
      docNo: parsed.docNo,
      hcode: parsed.hcode,
      period: parsed.period,
      status: 'error',
      rowCount: 0,
      amount: 0,
      message: 'ไม่พบรายการในไฟล์',
    };
  }

  await ensureEclaimTables();
  const db = await getDB();

  try {
    if (parsed.fileType === 'STM') {
      const [existRows]: any[] = await db.query(
        `SELECT COUNT(*) AS cnt FROM eclaim_stm WHERE batch_key = ?`,
        [parsed.batchKey]
      );
      const exists = Number(existRows?.[0]?.cnt ?? 0) > 0;
      if (exists && !replace) {
        return {
          fileName: parsed.fileName,
          fileType: parsed.fileType,
          batchKey: parsed.batchKey,
          docNo: parsed.docNo,
          hcode: parsed.hcode,
          period: parsed.period,
          status: 'skipped',
          rowCount: Number(existRows?.[0]?.cnt ?? 0),
          amount: 0,
          message: `ชุด ${parsed.batchKey} มีในระบบแล้ว — เปิดแทนที่ถ้าต้องการอัปโหลดใหม่`,
        };
      }
      if (exists && replace) {
        await db.query(`DELETE FROM eclaim_stm WHERE batch_key = ?`, [parsed.batchKey]);
        await db.query(`DELETE FROM eclaim_summary WHERE batch_key = ?`, [`${parsed.docNo}_SUM`]);
      }

      for (const batch of chunk(parsed.stmRows, 200)) {
        const placeholders = batch
          .map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .join(',');
        const values: Array<string | number | null> = [];
        for (const row of batch) {
          values.push(
            parsed.batchKey,
            parsed.fileName,
            parsed.docNo,
            parsed.hcode,
            parsed.period,
            row.seq || null,
            row.rep || null,
            row.hmain || null,
            row.hcode || null,
            row.hsend || null,
            row.htype || null,
            row.hn || null,
            row.an || null,
            row.pid || null,
            row.patientName || null,
            row.dateAdm,
            row.dateDsc,
            row.projcode || null,
            row.drg || null,
            row.rw,
            row.adjrw,
            row.selfPay,
            row.ratePay,
            row.claimAmt,
            row.actAmt,
            row.receiveTotal
          );
        }
        await db.query(
          `INSERT INTO eclaim_stm (
            batch_key, file_name, doc_no, owner_hcode, period, seq_no, rep, hmain, hcode, hsend, htype,
            hn, an, pid, patient_name, date_adm, date_dsc, projcode, drg, rw, adjrw,
            self_pay, rate_pay, claim_amt, act_amt, receive_total
          ) VALUES ${placeholders}`,
          values
        );
      }

      if (parsed.summaryRows.length) {
        const sumBatchKey = `${parsed.docNo}_SUM`;
        await db.query(`DELETE FROM eclaim_summary WHERE batch_key = ?`, [sumBatchKey]);
        for (const batch of chunk(parsed.summaryRows, 100)) {
          const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
          const values: Array<string | number | null> = [];
          for (const row of batch) {
            values.push(
              sumBatchKey,
              parsed.fileName,
              parsed.docNo,
              parsed.hcode,
              parsed.period,
              row.periodRep || null,
              row.hmain || null,
              row.hcode || null,
              row.hsend || null,
              row.repNo || null,
              row.totalCases,
              row.passCases,
              row.failCases,
              row.claimAmt,
              row.actAmt,
              row.receiveTotal
            );
          }
          await db.query(
            `INSERT INTO eclaim_summary (
              batch_key, file_name, doc_no, owner_hcode, period, period_rep, hmain, hcode, hsend, rep_no,
              total_cases, pass_cases, fail_cases, claim_amt, act_amt, receive_total
            ) VALUES ${placeholders}`,
            values
          );
        }
      }

      return {
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        batchKey: parsed.batchKey,
        docNo: parsed.docNo,
        hcode: parsed.hcode,
        period: parsed.period,
        status: exists ? 'replaced' : 'imported',
        rowCount: parsed.rowCount,
        amount: parsed.amount,
        message: exists
          ? `แทนที่ ${parsed.rowCount.toLocaleString('th-TH')} รายการ STM`
          : `บันทึก ${parsed.rowCount.toLocaleString('th-TH')} รายการ STM`,
      };
    }

    // PAY
    const [existRows]: any[] = await db.query(
      `SELECT COUNT(*) AS cnt FROM eclaim_pay WHERE batch_key = ?`,
      [parsed.batchKey]
    );
    const exists = Number(existRows?.[0]?.cnt ?? 0) > 0;
    if (exists && !replace) {
      return {
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        batchKey: parsed.batchKey,
        docNo: parsed.docNo,
        hcode: parsed.hcode,
        period: parsed.period,
        status: 'skipped',
        rowCount: Number(existRows?.[0]?.cnt ?? 0),
        amount: 0,
        message: `ชุด ${parsed.batchKey} มีในระบบแล้ว — เปิดแทนที่ถ้าต้องการอัปโหลดใหม่`,
      };
    }
    if (exists && replace) {
      await db.query(`DELETE FROM eclaim_pay WHERE batch_key = ?`, [parsed.batchKey]);
    }

    for (const batch of chunk(parsed.payRows, 200)) {
      const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      const values: Array<string | number | null> = [];
      for (const row of batch) {
        values.push(
          parsed.batchKey,
          parsed.fileName,
          parsed.docNo,
          parsed.hcode,
          parsed.period,
          row.hmainCode || null,
          row.hmainName || null,
          row.htreatCode || null,
          row.htreatName || null,
          row.hrecordCode || null,
          row.hrecordName || null,
          row.payFrom || null,
          row.amount,
          row.remark || null
        );
      }
      await db.query(
        `INSERT INTO eclaim_pay (
          batch_key, file_name, doc_no, owner_hcode, period,
          hmain_code, hmain_name, htreat_code, htreat_name, hrecord_code, hrecord_name,
          pay_from, amount, remark
        ) VALUES ${placeholders}`,
        values
      );
    }

    return {
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      batchKey: parsed.batchKey,
      docNo: parsed.docNo,
      hcode: parsed.hcode,
      period: parsed.period,
      status: exists ? 'replaced' : 'imported',
      rowCount: parsed.rowCount,
      amount: parsed.amount,
      message: exists
        ? `แทนที่ ${parsed.rowCount.toLocaleString('th-TH')} รายการพึงจ่าย`
        : `บันทึก ${parsed.rowCount.toLocaleString('th-TH')} รายการพึงจ่าย`,
    };
  } finally {
    await db.end();
  }
}

export async function listEclaimBatches(limit = 40): Promise<EclaimBatchRow[]> {
  await ensureEclaimTables();
  const db = await getDB();
  try {
    const [rows]: any[] = await db.query(
      `
      SELECT * FROM (
        SELECT
          batch_key,
          'STM' AS file_type,
          MAX(file_name) AS file_name,
          owner_hcode AS hcode,
          period,
          doc_no,
          COUNT(*) AS row_count,
          COALESCE(SUM(receive_total), 0) AS amount,
          MAX(created_at) AS uploaded_at
        FROM eclaim_stm
        GROUP BY batch_key, owner_hcode, period, doc_no
        UNION ALL
        SELECT
          batch_key,
          'PAY' AS file_type,
          MAX(file_name) AS file_name,
          owner_hcode AS hcode,
          period,
          doc_no,
          COUNT(*) AS row_count,
          COALESCE(SUM(amount), 0) AS amount,
          MAX(created_at) AS uploaded_at
        FROM eclaim_pay
        GROUP BY batch_key, owner_hcode, period, doc_no
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
      docNo: String(row.doc_no || ''),
      rowCount: Number(row.row_count || 0),
      amount: Number(row.amount || 0),
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : null,
    }));
  } finally {
    await db.end();
  }
}
