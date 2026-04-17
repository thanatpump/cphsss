const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

const CSV_PATH = path.resolve(__dirname, '../../Desktop/hospcode.csv');
const DB_PATH = path.resolve(__dirname, './sso.db');

const db = new sqlite3.Database(DB_PATH);

// สร้างตาราง hospcode ถ้ายังไม่มี
const createTable = () => {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS hospcode (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hospcode_5_digit TEXT,
        name TEXT,
        amp_name TEXT,
        amppart TEXT,
        chwpart TEXT,
        hospital_type_id TEXT
      )`,
      (err) => { if (err) reject(err); else resolve(); }
    );
  });
};

// ลบข้อมูลเดิม (ถ้าต้องการ)
const clearTable = () => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM hospcode', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// เพิ่มข้อมูลใหม่
const insertRow = (hospcode_5_digit, name, amp_name, amppart, chwpart, hospital_type_id) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO hospcode (hospcode_5_digit, name, amp_name, amppart, chwpart, hospital_type_id) VALUES (?, ?, ?, ?, ?, ?)',
      [hospcode_5_digit, name, amp_name, amppart, chwpart, hospital_type_id],
      (err) => { if (err) reject(err); else resolve(); }
    );
  });
};

async function importCSV() {
  await createTable();
  await clearTable();
  console.log('เริ่มนำเข้าข้อมูลจาก CSV...');

  let count = 0;
  let rowCount = 0;
  fs.createReadStream(CSV_PATH)
    .pipe(csv({ mapHeaders: ({ header, index }) => index === 0 ? 'amp_name' : header }))
    .on('data', async (row) => {
      // ไม่ข้ามแถวใด ๆ ทั้งสิ้น
      try {
        await insertRow(row.hospcode_5_digit, row.name, row.amp_name, row.amppart, row.chwpart, row.hospital_type_id);
        count++;
      } catch (err) {
        console.error('Error insert:', err);
      }
    })
    .on('end', () => {
      console.log(`นำเข้าข้อมูลเสร็จสิ้น! ทั้งหมด ${count} แถว`);
      db.close();
    });
}

importCSV(); 