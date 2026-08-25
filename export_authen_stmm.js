/**
 * Export Excel: เทียบ authen_code กับ sognstmm
 *
 * จับคู่: hcode + cid(citizen_id) + vstdate  ↔  hcare + pid + DATE(dttran)
 * เทียบ: vn (vm) กับ invno (invoid)
 *
 * ใช้งาน:
 *   node export_authen_stmm.js
 *   node export_authen_stmm.js --month 2026-04
 *   node export_authen_stmm.js --month 2026-04 --hcode 03929
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');

function parseArgs(argv) {
  const args = { month: null, hcode: null, out: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--month' && argv[i + 1]) {
      args.month = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--hcode' && argv[i + 1]) {
      args.hcode = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--out' && argv[i + 1]) {
      args.out = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function parseMonthValue(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, mm] = month.split('-');
  return { year, mm };
}

function formatDate(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
}

function formatDttran(value) {
  if (!value) return '';
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.replace('T', ' ').slice(0, 19) : text;
}

function vmInvnoStatus(vm, invoid) {
  const v = String(vm ?? '').trim();
  const i = String(invoid ?? '').trim();
  if (!v) return 'ไม่มี vm';
  if (!i) return 'ไม่มี invoid';
  return v === i ? 'ตรง' : 'ไม่ตรง';
}

function rowToExcel(row) {
  return {
    hcode: row.hcode,
    cid: row.cid,
    vstdate: row.vstdate,
    pid: row.pid,
    startdate: row.startdate,
    vm: row.vm,
    invoid: row.invoid,
    'vm=invoid': row.vmInvnoMatch,
    authen: row.authen,
    authen_date: row.authen_date,
    authen_time: row.authen_time,
    hn_authen: row.hn_authen,
    hn_stmm: row.hn_stmm,
    name_stmm: row.name_stmm,
    dttran: row.dttran,
    total: row.total,
    hmain: row.hmain,
    STMdoc: row.STMdoc,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.month && !parseMonthValue(args.month)) {
    console.error('รูปแบบเดือนไม่ถูกต้อง ใช้ YYYY-MM');
    process.exit(1);
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  const joinCondition = `
    ac.hcode = s.hcare
    AND ac.citizen_id = s.pid
    AND ac.vstdate = DATE(s.dttran)
  `;

  console.log(args.month ? `กำลัง export เดือน ${args.month}...` : 'กำลัง export ข้อมูลทั้งหมด (ไม่กรองเดือน)...');

  const matchKeyParams = [];
  let matchKeyWhere = ' WHERE ac.vstdate IS NOT NULL';
  if (args.hcode) {
    matchKeyWhere += ' AND ac.hcode = ? AND s.hcare = ?';
    matchKeyParams.push(args.hcode, args.hcode);
  }
  if (args.month) {
    const parsed = parseMonthValue(args.month);
    matchKeyWhere += ' AND ac.vstdate >= ? AND ac.vstdate <= ? AND DATE(s.dttran) >= ? AND DATE(s.dttran) <= ?';
    matchKeyParams.push(
      `${parsed.year}-${parsed.mm}-01`,
      `${parsed.year}-${parsed.mm}-31`,
      `${parsed.year}-${parsed.mm}-01`,
      `${parsed.year}-${parsed.mm}-31`
    );
  }

  console.log('กำลังสร้าง index คีย์จับคู่...');
  await db.query('DROP TEMPORARY TABLE IF EXISTS tmp_authen_stmm_keys');
  await db.query(`
    CREATE TEMPORARY TABLE tmp_authen_stmm_keys (
      hcode VARCHAR(20) NOT NULL,
      pid VARCHAR(20) NOT NULL,
      vdate DATE NOT NULL,
      PRIMARY KEY (hcode, pid, vdate)
    ) ENGINE=MEMORY
  `);
  await db.query(
    `
    INSERT INTO tmp_authen_stmm_keys (hcode, pid, vdate)
    SELECT DISTINCT ac.hcode, s.pid, ac.vstdate
    FROM authen_code ac
    INNER JOIN sognstmm s ON ${joinCondition}
    ${matchKeyWhere}
    `,
    matchKeyParams
  );

  console.log('กำลังดึงข้อมูลจับคู่...');
  const [joinedRows] = await db.query(
    `
    SELECT
      ac.hcode,
      ac.citizen_id AS cid,
      DATE_FORMAT(ac.vstdate, '%Y-%m-%d') AS vstdate,
      s.pid,
      DATE_FORMAT(DATE(s.dttran), '%Y-%m-%d') AS startdate,
      ac.vn AS vm,
      s.invno AS invoid,
      ac.authen,
      ac.date AS authen_date,
      ac.time AS authen_time,
      ac.hn AS hn_authen,
      s.hn AS hn_stmm,
      s.name AS name_stmm,
      s.dttran,
      s.total,
      s.hmain,
      s.STMdoc
    FROM authen_code ac
    INNER JOIN sognstmm s ON ${joinCondition}
    ${matchKeyWhere}
    ORDER BY ac.vstdate DESC, ac.time DESC
    `,
    matchKeyParams
  );

  const rows = (joinedRows || []).map((row) => ({
    hcode: String(row.hcode ?? ''),
    cid: String(row.cid ?? ''),
    vstdate: formatDate(row.vstdate),
    pid: String(row.pid ?? ''),
    startdate: formatDate(row.startdate),
    vm: String(row.vm ?? ''),
    invoid: String(row.invoid ?? ''),
    vmInvnoMatch: vmInvnoStatus(row.vm, row.invoid),
    authen: String(row.authen ?? ''),
    authen_date: String(row.authen_date ?? ''),
    authen_time: String(row.authen_time ?? ''),
    hn_authen: String(row.hn_authen ?? ''),
    hn_stmm: String(row.hn_stmm ?? ''),
    name_stmm: String(row.name_stmm ?? ''),
    dttran: formatDttran(row.dttran),
    total: Number(row.total ?? 0),
    hmain: String(row.hmain ?? ''),
    STMdoc: String(row.STMdoc ?? ''),
  }));

  const onlyAuthenParams = [];
  let onlyAuthenWhere = ' WHERE ac.vstdate IS NOT NULL';
  if (args.hcode) {
    onlyAuthenWhere += ' AND ac.hcode = ?';
    onlyAuthenParams.push(args.hcode);
  }
  if (args.month) {
    const parsed = parseMonthValue(args.month);
    onlyAuthenParams.push(`${parsed.year}-${parsed.mm}-01`, `${parsed.year}-${parsed.mm}-31`);
    onlyAuthenWhere += ' AND ac.vstdate >= ? AND ac.vstdate <= ?';
  }
  console.log('กำลังดึง authen ที่ไม่มีใน stmm...');
  const [onlyAuthenRows] = await db.query(
    `
    SELECT
      ac.hcode,
      ac.citizen_id AS cid,
      DATE_FORMAT(ac.vstdate, '%Y-%m-%d') AS vstdate,
      ac.vn AS vm,
      ac.authen,
      ac.date AS authen_date,
      ac.time AS authen_time,
      ac.hn AS hn_authen
    FROM authen_code ac
    LEFT JOIN tmp_authen_stmm_keys mk
      ON ac.hcode = mk.hcode
      AND ac.citizen_id = mk.pid
      AND ac.vstdate = mk.vdate
    ${onlyAuthenWhere} AND mk.hcode IS NULL
    ORDER BY ac.vstdate DESC, ac.time DESC
    `,
    onlyAuthenParams
  );

  const onlyAuthen = (onlyAuthenRows || []).map((row) => ({
    hcode: String(row.hcode ?? ''),
    cid: String(row.cid ?? ''),
    vstdate: formatDate(row.vstdate),
    pid: '',
    startdate: '',
    vm: String(row.vm ?? ''),
    invoid: '',
    vmInvnoMatch: 'ไม่มี invoid',
    authen: String(row.authen ?? ''),
    authen_date: String(row.authen_date ?? ''),
    authen_time: String(row.authen_time ?? ''),
    hn_authen: String(row.hn_authen ?? ''),
    hn_stmm: '',
    name_stmm: '',
    dttran: '',
    total: 0,
    hmain: '',
    STMdoc: '',
  }));

  const onlyStmmParams = [];
  let onlyStmmWhere = ' WHERE s.dttran IS NOT NULL AND s.pid IS NOT NULL AND s.pid != ""';
  if (args.hcode) {
    onlyStmmWhere += ' AND s.hcare = ?';
    onlyStmmParams.push(args.hcode);
  }
  if (args.month) {
    const parsed = parseMonthValue(args.month);
    onlyStmmParams.push(`${parsed.year}-${parsed.mm}-01`, `${parsed.year}-${parsed.mm}-31`);
    onlyStmmWhere += ' AND DATE(s.dttran) >= ? AND DATE(s.dttran) <= ?';
  }
  console.log('กำลังดึง stmm ที่ไม่มีใน authen...');
  const [onlyStmmRows] = await db.query(
    `
    SELECT
      s.hcare AS hcode,
      s.pid,
      DATE_FORMAT(DATE(s.dttran), '%Y-%m-%d') AS startdate,
      s.invno AS invoid,
      s.hn AS hn_stmm,
      s.name AS name_stmm,
      s.dttran,
      s.total,
      s.hmain,
      s.STMdoc
    FROM sognstmm s
    LEFT JOIN tmp_authen_stmm_keys mk
      ON s.hcare = mk.hcode
      AND s.pid = mk.pid
      AND DATE(s.dttran) = mk.vdate
    ${onlyStmmWhere} AND mk.hcode IS NULL
    ORDER BY s.dttran DESC
    `,
    onlyStmmParams
  );

  await db.query('DROP TEMPORARY TABLE IF EXISTS tmp_authen_stmm_keys');

  const onlyStmm = (onlyStmmRows || []).map((row) => ({
    hcode: String(row.hcode ?? ''),
    cid: '',
    vstdate: formatDate(row.startdate),
    pid: String(row.pid ?? ''),
    startdate: formatDate(row.startdate),
    vm: '',
    invoid: String(row.invoid ?? ''),
    vmInvnoMatch: 'ไม่มี vm',
    authen: '',
    authen_date: '',
    authen_time: '',
    hn_authen: '',
    hn_stmm: String(row.hn_stmm ?? ''),
    name_stmm: String(row.name_stmm ?? ''),
    dttran: formatDttran(row.dttran),
    total: Number(row.total ?? 0),
    hmain: String(row.hmain ?? ''),
    STMdoc: String(row.STMdoc ?? ''),
  }));

  await db.end();

  const summary = {
    month: args.month || 'ทั้งหมด',
    hcode: args.hcode || 'ทั้งหมด',
    joinedTotal: rows.length,
    vmInvnoMatch: rows.filter((row) => row.vmInvnoMatch === 'ตรง').length,
    vmInvnoMismatch: rows.filter((row) => row.vmInvnoMatch === 'ไม่ตรง').length,
    onlyAuthen: onlyAuthen.length,
    onlyStmm: onlyStmm.length,
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { รายการ: 'เดือน', ค่า: summary.month },
      { รายการ: 'hcode', ค่า: summary.hcode },
      { รายการ: 'จับคู่ได้', ค่า: summary.joinedTotal },
      { รายการ: 'vm = invno', ค่า: summary.vmInvnoMatch },
      { รายการ: 'vm != invno', ค่า: summary.vmInvnoMismatch },
      { รายการ: 'มี authen ไม่มี stmm', ค่า: summary.onlyAuthen },
      { รายการ: 'มี stmm ไม่มี authen', ค่า: summary.onlyStmm },
    ]),
    'สรุป'
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.map(rowToExcel)), 'จับคู่แล้ว');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows.filter((row) => row.vmInvnoMatch === 'ไม่ตรง').map(rowToExcel)),
    'vm ไม่ตรง invno'
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(onlyAuthen.map(rowToExcel)), 'มี authen ไม่มี stmm');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(onlyStmm.map(rowToExcel)), 'มี stmm ไม่มี authen');

  const filename =
    args.out ||
    `authen-stmm-match_${args.month || 'all'}_${args.hcode || 'all'}.xlsx`;
  const outPath = path.resolve(process.cwd(), filename);
  XLSX.writeFile(wb, outPath);

  console.log('สร้างไฟล์สำเร็จ:', outPath);
  console.log(summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
