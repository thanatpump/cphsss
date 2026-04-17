/**
 * Card Reader Service - อ่านบัตรประชาชนจาก Smart Card Reader
 * ใช้ Windows Smart Card API
 */

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;

const https = require('https');
const THAIID_READER_URL = process.env.THAIID_READER_URL || 'https://localhost:8443/smartcard/data/';

// สร้าง HTTPS agent ที่ ignore SSL certificate
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * อ่านบัตรประชาชนจาก Smart Card Reader
 * ลำดับความสำคัญ:
 * 1. ใช้ ThaiIDCardReader.exe (ถ้ามี)
 * 2. ใช้ Windows Smart Card API โดยตรง
 */
async function readThaiIDCard() {
  try {
    // วิธีที่ 1: ลองใช้ ThaiIDCardReader.exe ก่อน (เป็นวิธีหลัก)
    console.log('📖 กำลังเชื่อมต่อกับ ThaiIDCardReader.exe...');
    
    try {
      const url = new URL(THAIID_READER_URL);
      const response = await new Promise((resolve, reject) => {
        const options = {
          hostname: url.hostname,
          port: url.port || 8443,
          path: url.pathname,
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          agent: httpsAgent,
          timeout: 15000 // เพิ่ม timeout เป็น 15 วินาที
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                json: async () => jsonData
              });
            } catch (parseError) {
              reject(new Error(`ไม่สามารถ parse JSON ได้: ${parseError.message}`));
            }
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('หมดเวลารอการตอบกลับจาก ThaiIDCardReader (15 วินาที)'));
        });

        req.end();
      });

      if (response.ok) {
        const cardData = await response.json();
        console.log('✅ อ่านบัตรสำเร็จจาก ThaiIDCardReader.exe');

        // แปลงข้อมูลให้ตรงกับ format ที่ต้องการ
        const citizenId = String(cardData.citizenId || cardData.citizen_id || cardData.pid || cardData.PID || '').trim();

        if (!citizenId || citizenId.length !== 13 || !/^\d+$/.test(citizenId)) {
          throw new Error(`เลขบัตรประชาชนไม่ถูกต้อง: "${citizenId}" (ต้องเป็นตัวเลข 13 หลัก)`);
        }

        return {
          citizen_id: citizenId,
          title_th: (cardData.titleTh || cardData.title_th || cardData.title || '').trim(),
          first_name_th: (cardData.firstNameTh || cardData.first_name_th || cardData.firstName || cardData.first_name || '').trim(),
          last_name_th: (cardData.lastNameTh || cardData.last_name_th || cardData.lastName || cardData.last_name || '').trim(),
          birth_date: (cardData.birthDate || cardData.birth_date || '').trim(),
          address: (cardData.address || cardData.Address || '').trim(),
          issue_date: (cardData.issueDate || cardData.issue_date || '').trim(),
          expire_date: (cardData.expireDate || cardData.expire_date || '').trim()
        };
      } else {
        throw new Error(`ThaiIDCardReader.exe ตอบกลับด้วย status code: ${response.status}`);
      }
    } catch (apiError) {
      console.log('❌ ไม่สามารถเชื่อมต่อ ThaiIDCardReader.exe ได้:', apiError.message);
      
      // ตรวจสอบว่าเป็น connection error หรือไม่
      if (apiError.message.includes('ECONNREFUSED') || 
          apiError.message.includes('connect') || 
          apiError.message.includes('timeout') ||
          apiError.code === 'ECONNREFUSED') {
        throw new Error('ไม่สามารถเชื่อมต่อกับ ThaiIDCardReader.exe ได้\n\nกรุณาตรวจสอบว่า:\n1. ThaiIDCardReader.exe กำลังรันอยู่หรือไม่\n2. ดับเบิลคลิก start-thaiid-reader.bat เพื่อรัน ThaiIDCardReader.exe\n3. รอให้ ThaiIDCardReader.exe เริ่มทำงาน (https://localhost:8443)\n4. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n5. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง');
      }
      
      // ถ้าเป็น error อื่นๆ
      throw new Error(`ไม่สามารถอ่านบัตรได้: ${apiError.message}\n\nกรุณาตรวจสอบว่า:\n1. ThaiIDCardReader.exe กำลังรันอยู่\n2. บัตรประชาชนเสียบเข้าเครื่องอ่านบัตรแล้ว\n3. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง`);
    }

  } catch (error) {
    throw error;
  }
}

/**
 * POST /read-card - อ่านบัตรประชาชน
 */
app.post('/read-card', async (req, res) => {
  try {
    console.log('\n📖 รับคำขออ่านบัตร...');

    const cardData = await readThaiIDCard();

    res.json({
      success: true,
      data: cardData
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /status - ตรวจสอบสถานะ
 */
app.get('/status', async (req, res) => {
  try {
    // ตรวจสอบว่า ThaiIDCardReader.exe ทำงานอยู่หรือไม่ (เป็นหลัก)
    let thaiIDReaderRunning = false;
    let thaiIDReaderError = null;
    
    try {
      const https = require('https');
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
      
      await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'localhost',
          port: 8443,
          path: '/smartcard/data/',
          method: 'GET',
          agent: httpsAgent,
          timeout: 2000
        }, (res) => {
          thaiIDReaderRunning = true;
          resolve(true);
        });
        
        req.on('error', (error) => {
          thaiIDReaderRunning = false;
          thaiIDReaderError = error.message;
          resolve(false);
        });
        
        req.on('timeout', () => {
          req.destroy();
          thaiIDReaderRunning = false;
          thaiIDReaderError = 'Connection timeout';
          resolve(false);
        });
        
        req.end();
      });
    } catch (httpsError) {
      thaiIDReaderRunning = false;
      thaiIDReaderError = httpsError.message;
    }

    // ลองตรวจสอบ certutil (เป็นตัวเสริม)
    let stdout = '';
    let hasCard = false;
    let hasReader = false;
    let certutilError = null;

    try {
      const result = await execAsync('certutil -scinfo', {
        timeout: 3000,
        encoding: 'utf8'
      });
      stdout = result.stdout;

      // ตรวจสอบว่ามีบัตรหรือไม่
      hasCard = stdout.includes('SCARD_STATE_PRESENT') || 
                stdout.includes('The card is available') ||
                stdout.includes('ATR:');
      
      hasReader = stdout.includes('Readers:') || stdout.includes('Reader:');

    } catch (certutilErrorObj) {
      // ถ้า certutil error ไม่เป็นไร เพราะเราจะใช้ ThaiIDCardReader.exe เป็นหลัก
      certutilError = certutilErrorObj.message;
      console.log('⚠️  certutil error (ไม่เป็นไร - ใช้ ThaiIDCardReader.exe แทน):', certutilError);
    }

    // กำหนดสถานะและข้อความ
    let status = 'not_connected';
    let message = 'ไม่พบเครื่องอ่านบัตร';
    let finalHasCard = false;

    if (thaiIDReaderRunning) {
      // ถ้า ThaiIDCardReader.exe ทำงานอยู่ ให้ถือว่าพร้อมอ่านบัตร
      status = 'thaiid_reader_running';
      message = 'ThaiIDCardReader.exe กำลังทำงานอยู่ - พร้อมอ่านบัตร';
      finalHasCard = true;
    } else if (hasCard) {
      status = 'card_inserted';
      message = 'พบบัตรประชาชนในเครื่องอ่านบัตร (แต่ควรรัน ThaiIDCardReader.exe)';
      finalHasCard = true;
    } else if (hasReader) {
      status = 'ready';
      message = 'เครื่องอ่านบัตรพร้อมใช้งาน - กรุณาเสียบบัตรประชาชน\n\n⚠️ หมายเหตุ: ควรรัน ThaiIDCardReader.exe เพื่ออ่านบัตรได้';
    } else {
      status = 'not_connected';
      message = 'ไม่พบเครื่องอ่านบัตร\n\nกรุณา:\n1. เสียบเครื่องอ่านบัตรเข้า USB\n2. รัน ThaiIDCardReader.exe (ดับเบิลคลิก start-thaiid-reader.bat)';
    }

    res.json({
      success: true,
      status,
      hasCard: finalHasCard,
      hasReader,
      thaiIDReaderRunning,
      message,
      debug: {
        certutilError: certutilError || null,
        thaiIDReaderError: thaiIDReaderError || null,
        hasSCARD_STATE_PRESENT: stdout.includes('SCARD_STATE_PRESENT'),
        hasATR: stdout.includes('ATR:'),
        hasReader: stdout.includes('Reader:')
      }
    });

  } catch (error) {
    res.json({
      success: false,
      status: 'error',
      hasCard: false,
      hasReader: false,
      thaiIDReaderRunning: false,
      message: 'ไม่สามารถตรวจสอบสถานะได้',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎴 Card Reader Service');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔍 Status: http://localhost:${PORT}/status`);
  console.log('='.repeat(60));
  console.log('\n🔍 กำลังรอเครื่องอ่านบัตร...');
  console.log('📌 เสียบเครื่องอ่านบัตรเข้า USB port\n');
});
