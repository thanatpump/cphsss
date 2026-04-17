const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const DB_PATH = path.resolve(__dirname, './sso.db');
const CSV_PATH = path.resolve(__dirname, '/Users/macbookpro16/Desktop/amppart.csv');

const db = new sqlite3.Database(DB_PATH);

console.log('เริ่มต้นการนำเข้าข้อมูล amppart (สุดท้าย)...');
console.log('ไฟล์ CSV:', CSV_PATH);

// ลบตารางเก่าและสร้างใหม่
const recreateTable = () => {
  return new Promise((resolve, reject) => {
    db.run('DROP TABLE IF EXISTS amppart', (err) => {
      if (err) {
        console.error('Error dropping table:', err);
        reject(err);
        return;
      }
      
      db.run(`
        CREATE TABLE amppart (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amppart TEXT,
          chwpart TEXT,
          name TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        } else {
          console.log('สร้างตาราง amppart ใหม่สำเร็จ');
          resolve();
        }
      });
    });
  });
};

// เพิ่มข้อมูล
const insertRow = (row) => {
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO amppart (amppart, chwpart, name) VALUES (?, ?, ?)
    `, [
      row.amppart || '',
      row.chwpart || '',
      row.name || ''
    ], (err) => {
      if (err) {
        console.error('Error inserting row:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// ฟังก์ชันหลัก
const importData = async () => {
  try {
    await recreateTable();
    
    let count = 0;
    let errorCount = 0;
    
    console.log('เริ่มอ่านไฟล์ CSV...');
    
    fs.createReadStream(CSV_PATH)
      .pipe(csv({
        mapHeaders: ({ header, index }) => {
          // แมปคอลัมน์ตามลำดับที่ถูกต้อง
          const headers = ['amppart', 'chwpart', 'name'];
          return headers[index] || header;
        }
      }))
      .on('data', async (row) => {
        try {
          await insertRow(row);
          count++;
          
          console.log(`นำเข้าข้อมูล ${count}:`, {
            amppart: row.amppart,
            chwpart: row.chwpart,
            name: row.name
          });
        } catch (err) {
          errorCount++;
          console.error('Error processing row:', err);
        }
      })
      .on('end', () => {
        console.log('\n=== สรุปการนำเข้าข้อมูล ===');
        console.log(`นำเข้าสำเร็จ: ${count} รายการ`);
        console.log(`เกิดข้อผิดพลาด: ${errorCount} รายการ`);
        console.log('การนำเข้าข้อมูลเสร็จสิ้น');
        
        // ตรวจสอบข้อมูลที่นำเข้า
        db.get('SELECT COUNT(*) as total FROM amppart', (err, result) => {
          if (err) {
            console.error('Error counting records:', err);
          } else {
            console.log(`จำนวนรายการในฐานข้อมูล: ${result.total}`);
          }
          
          // แสดงข้อมูลทั้งหมด
          db.all('SELECT * FROM amppart ORDER BY amppart', (err, rows) => {
            if (err) {
              console.error('Error getting records:', err);
            } else {
              console.log('\nข้อมูลทั้งหมด:');
              rows.forEach(row => {
                console.log(`${row.amppart} - ${row.name} (จังหวัด: ${row.chwpart})`);
              });
            }
            db.close();
          });
        });
      })
      .on('error', (err) => {
        console.error('Error reading CSV file:', err);
        db.close();
      });
      
  } catch (error) {
    console.error('Error in import process:', error);
    db.close();
  }
};

// เริ่มการนำเข้าข้อมูล
importData(); 