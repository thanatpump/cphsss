import fs from 'fs';
import path from 'path';
import type { Connection } from 'mysql2/promise';
import { getDB } from '@/lib/database';

type IcdMap = Record<string, string>;
type ChronicLevel = { name: string; weight: number };

let icdCache: IcdMap | null = null;
let chronicCache: Record<string, ChronicLevel> | null = null;
let icdReady: Promise<void> | null = null;

function readJson<T>(file: string): T {
  const full = path.join(process.cwd(), 'data', file);
  return JSON.parse(fs.readFileSync(full, 'utf8')) as T;
}

function readIcdFile(): IcdMap {
  return readJson<IcdMap>('icd10-tm.json');
}

async function seedIcdCodes(db: Connection, book: IcdMap) {
  const entries = Object.entries(book);
  const size = 400;
  for (let i = 0; i < entries.length; i += size) {
    const batch = entries.slice(i, i + size);
    const placeholders = batch.map(() => '(?,?)').join(',');
    const values: string[] = [];
    for (const [code, description] of batch) values.push(code, description);
    await db.query(
      `INSERT INTO icd10_code (code, description) VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      values
    );
  }
}

/** สร้างตารางรหัส ICD-10-TM และเติมให้ครบทุกโรคจากแฟ้มคำอธิบาย */
export function ensureIcd10Codebook() {
  if (!icdReady) {
    icdReady = (async () => {
      const book = readIcdFile();
      const db = await getDB();
      try {
        await db.query(`
          CREATE TABLE IF NOT EXISTS icd10_code (
            code VARCHAR(16) NOT NULL PRIMARY KEY,
            description VARCHAR(400) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        const [countRows]: any[] = await db.query(`SELECT COUNT(*) AS c FROM icd10_code`);
        const count = Number(countRows?.[0]?.c || 0);
        if (count < Object.keys(book).length) await seedIcdCodes(db, book);
        const [rows]: any[] = await db.query(`SELECT code, description FROM icd10_code`);
        const map: IcdMap = {};
        for (const row of rows || []) map[String(row.code)] = String(row.description || '');
        icdCache = Object.keys(map).length ? map : book;
      } finally {
        await db.end();
      }
    })().catch((error) => {
      icdReady = null;
      icdCache = readIcdFile();
      throw error;
    });
  }
  return icdReady;
}

export function icdDescription(code: string): string {
  if (!icdCache) icdCache = readJson<IcdMap>('icd10-tm.json');
  const key = code.replace(/\./g, '').trim().toUpperCase();
  if (!key) return '';
  return icdCache[key] || icdCache[key.slice(0, 4)] || '';
}

export function chronicLevel(code: string): ChronicLevel | null {
  if (!chronicCache) chronicCache = readJson<Record<string, ChronicLevel>>('chronic-level.json');
  const key = String(code || '').trim().padStart(3, '0');
  return chronicCache[key] || null;
}

export function formatIcdList(codes: string[]): string {
  return codes
    .map((code) => {
      const desc = icdDescription(code);
      return desc ? `${code} ${desc}` : code;
    })
    .join(' | ');
}
