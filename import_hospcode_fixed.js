const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const DB_PATH = path.resolve(__dirname, './sso.db');
const CSV_PATH = path.resolve(__dirname, '/Users/macbookpro16/Desktop/hospcode.csv');

const db = new sqlite3.Database(DB_PATH);

console.log('เริ่มต้นการนำเข้าข้อมูล hospcode (แก้ไขแล้ว)...');
console.log('ไฟล์ CSV:', CSV_PATH);

// ลบตารางเก่าและสร้างใหม่
const recreateTable = () => {
  return new Promise((resolve, reject) => {
    db.run('DROP TABLE IF EXISTS hospcode', (err) => {
      if (err) {
        console.error('Error dropping table:', err);
        reject(err);
        return;
      }
      
      db.run(`
        CREATE TABLE hospcode (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amp_name TEXT,
          amppart TEXT,
          chwpart TEXT,
          hospcode TEXT,
          name TEXT,
          tmbpart TEXT,
          moopart TEXT,
          hospital_type_id TEXT,
          bed_count TEXT,
          po_code TEXT,
          province_name TEXT,
          addr TEXT,
          area_code TEXT,
          zone TEXT,
          region_id TEXT,
          hospcode_5_digit TEXT,
          hospcode_9_digit TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        } else {
          console.log('สร้างตาราง hospcode ใหม่สำเร็จ');
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
      INSERT INTO hospcode (
        amp_name, amppart, chwpart, hospcode, name, tmbpart, moopart, 
        hospital_type_id, bed_count, po_code, province_name, addr, 
        area_code, zone, region_id, hospcode_5_digit, hospcode_9_digit
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      row.amp_name || '',
      row.amppart || '',
      row.chwpart || '',
      row.hospcode || '',
      row.name || '',
      row.tmbpart || '',
      row.moopart || '',
      row.hospital_type_id || '',
      row.bed_count || '',
      row.po_code || '',
      row.province_name || '',
      row.addr || '',
      row.area_code || '',
      row.zone || '',
      row.region_id || '',
      row.hospcode_5_digit || '',
      row.hospcode_9_digit || ''
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
    let rowCount = 0;
    
    console.log('เริ่มอ่านไฟล์ CSV...');
    
    fs.createReadStream(CSV_PATH)
      .pipe(csv({
        mapHeaders: ({ header, index }) => {
          // แมปคอลัมน์ตามลำดับที่ถูกต้อง
          const headers = [
            'amp_name', 'amppart', 'chwpart', 'hospcode', 'name', 'tmbpart', 'moopart',
            'hospital_type_id', 'bed_count', 'po_code', 'province_name', 'addr',
            'area_code', 'zone', 'region_id', 'hospcode_5_digit', 'hospcode_9_digit'
          ];
          return headers[index] || header;
        }
      }))
      .on('data', async (row) => {
        rowCount++;
        
        // ข้าม header rows
        if (rowCount <= 2) {
          console.log(`ข้าม header row ${rowCount}:`, Object.keys(row));
          return;
        }
        
        try {
          await insertRow(row);
          count++;
          
          if (count % 1000 === 0) {
            console.log(`นำเข้าข้อมูลแล้ว ${count} รายการ...`);
          }
          
          // แสดงตัวอย่างข้อมูล
          if (count <= 5) {
            console.log(`ตัวอย่างข้อมูล ${count}:`, {
              amp_name: row.amp_name,
              name: row.name,
              hospital_type_id: row.hospital_type_id
            });
          }
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
        db.get('SELECT COUNT(*) as total FROM hospcode', (err, result) => {
          if (err) {
            console.error('Error counting records:', err);
          } else {
            console.log(`จำนวนรายการในฐานข้อมูล: ${result.total}`);
          }
          
          // ตรวจสอบ amp_name
          db.get('SELECT COUNT(*) as amp_count FROM hospcode WHERE amp_name != ""', (err, ampResult) => {
            if (err) {
              console.error('Error counting amp_name:', err);
            } else {
              console.log(`จำนวนรายการที่มี amp_name: ${ampResult.amp_count}`);
            }
            
            // แสดงตัวอย่าง amp_name
            db.all('SELECT DISTINCT amp_name FROM hospcode WHERE amp_name != "" LIMIT 5', (err, ampExamples) => {
              if (err) {
                console.error('Error getting amp_name examples:', err);
              } else {
                console.log('ตัวอย่าง amp_name:', ampExamples.map(r => r.amp_name));
              }
              db.close();
            });
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