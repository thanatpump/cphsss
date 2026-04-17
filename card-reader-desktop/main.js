/**
 * SSO Card Reader Desktop Application
 * 
 * โปรแกรม Desktop ที่อ่านบัตรประชาชนและส่งข้อมูลไปยังระบบ SSO
 * 
 * วิธีใช้:
 * 1. รันโปรแกรม: node main.js
 * 2. ใส่บัตรประชาชนเข้าเครื่องอ่านบัตร
 * 3. โปรแกรมจะอ่านข้อมูลและส่งไปยัง Next.js API อัตโนมัติ
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
app.use(express.json());

// สร้าง https agent ที่ ignore SSL certificate (สำหรับ localhost)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Configuration
// อ่าน config จากไฟล์ config.json หรือ environment variable
let configFile = {};
try {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.log('⚠️  ไม่พบไฟล์ config.json - ใช้ค่า default');
}

const CONFIG = {
  SSO_API_URL: process.env.SSO_API_URL || configFile.sso_api_url || 'http://localhost:3000',
  PORT: process.env.PORT || configFile.port || 3001,
  DATA_FILE: path.join(__dirname, 'card-data.json'),
  THAIID_READER_URL: process.env.THAIID_READER_URL || configFile.thaiid_reader_url || 'https://localhost:8443/smartcard/data/',
  THAIID_READER_PATH: path.join(__dirname, 'ThaiIDCardReader', 'ThaiIDCardReader.exe')
};

console.log('⚙️  Configuration:');
console.log(`   SSO API URL: ${CONFIG.SSO_API_URL}`);
console.log(`   Port: ${CONFIG.PORT}`);
console.log(`   ThaiIDCardReader URL: ${CONFIG.THAIID_READER_URL}`);

// ใช้ ThaiIDCardReader.exe เท่านั้น (ไม่ใช้ smartcard library)
console.log('💡 ใช้ ThaiIDCardReader.exe สำหรับอ่านบัตร');
console.log('💡 ตรวจสอบว่าโปรแกรม ThaiIDCardReader.exe รันอยู่ที่ https://localhost:8443');
console.log('');

// Poll อ่านบัตรอัตโนมัติทุก 2 วินาที
let isReading = false;
let lastCardId = null;

async function autoReadCard() {
  if (isReading) return;
  
  try {
    isReading = true;
    const url = new URL(CONFIG.THAIID_READER_URL);
    const fetchOptions = {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
    
    if (url.protocol === 'https:') {
      fetchOptions.agent = httpsAgent;
    }
    
    const response = await fetch(CONFIG.THAIID_READER_URL, fetchOptions);
    
    if (response.ok) {
      const cardData = await response.json();
      const currentCardId = cardData.citizenId || cardData.citizen_id || cardData.pid || cardData.PID;
      
      // ถ้าเป็นบัตรใหม่ (ไม่ใช่บัตรเดิม)
      if (currentCardId && currentCardId !== lastCardId) {
        // แปลง citizen_id เป็น string และ trim
        const citizenId = String(currentCardId).trim();
        
        // ตรวจสอบความยาวของ citizen_id (ต้องเป็น 13 หลัก)
        if (citizenId.length !== 13 || !/^\d+$/.test(citizenId)) {
          console.log('⚠️  เลขบัตรประชาชนไม่ถูกต้อง:', citizenId, '(ต้องเป็นตัวเลข 13 หลัก)');
          return;
        }
        
        console.log('🎴 พบบัตรใหม่ - กำลังอ่านข้อมูล...');
        lastCardId = citizenId;
        
        // แปลงข้อมูลให้ตรงกับ format ที่ต้องการ
        const formattedData = {
          citizen_id: citizenId,
          title_th: (cardData.titleTh || cardData.title_th || cardData.title || '').trim(),
          first_name_th: (cardData.firstNameTh || cardData.first_name_th || cardData.firstName || cardData.first_name || '').trim(),
          last_name_th: (cardData.lastNameTh || cardData.last_name_th || cardData.lastName || cardData.last_name || '').trim(),
          birth_date: (cardData.birthDate || cardData.birth_date || '').trim(),
          address: (cardData.address || cardData.Address || '').trim(),
          issue_date: (cardData.issueDate || cardData.issue_date || '').trim(),
          expire_date: (cardData.expireDate || cardData.expire_date || '').trim()
        };
        
        await sendToSSO(formattedData);
        console.log('✅ ส่งข้อมูลไปยัง Server สำเร็จ:', formattedData.citizen_id);
      }
    }
  } catch (error) {
    // ไม่พบบัตรหรือ ThaiIDCardReader ไม่ทำงาน - ไม่เป็นไร
  } finally {
    isReading = false;
  }
}

// เริ่ม poll อ่านบัตรอัตโนมัติทุก 2 วินาที
setInterval(autoReadCard, 2000);
console.log('🔄 เริ่มการอ่านบัตรอัตโนมัติ (ทุก 2 วินาที)');
console.log('💡 เสียบบัตรประชาชนแล้ว Desktop App จะอ่านและส่งข้อมูลไปยัง Server อัตโนมัติ');

/**
 * อ่านข้อมูลจากบัตรประชาชน (ใช้ ThaiIDCardReader.exe)
 */
async function readCardData(card) {
  console.log('📖 กำลังอ่านข้อมูลจากบัตรด้วย ThaiIDCardReader...');
  
  try {
    // วิธีที่ 1: เรียกใช้ Web API ของ ThaiIDCardReader (ถ้ารันอยู่)
    try {
      const url = new URL(CONFIG.THAIID_READER_URL);
      const fetchOptions = {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      };
      
      // ถ้าเป็น HTTPS ให้ใช้ agent ที่ ignore SSL
      if (url.protocol === 'https:') {
        fetchOptions.agent = httpsAgent;
      }
      
      const response = await fetch(CONFIG.THAIID_READER_URL, fetchOptions);
      
      if (response.ok) {
        const cardData = await response.json();
        console.log('✅ อ่านบัตรสำเร็จจาก ThaiIDCardReader API');
        
        // แปลงข้อมูลให้ตรงกับ format ที่ต้องการ
        const citizenId = String(cardData.citizenId || cardData.citizen_id || cardData.pid || cardData.PID || '').trim();
        
        // ตรวจสอบความยาวของ citizen_id (ต้องเป็น 13 หลัก)
        if (citizenId.length !== 13 || !/^\d+$/.test(citizenId)) {
          throw new Error(`เลขบัตรประชาชนไม่ถูกต้อง: ${citizenId} (ต้องเป็นตัวเลข 13 หลัก)`);
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
      }
    } catch (apiError) {
      console.log('⚠️  ไม่สามารถเชื่อมต่อ ThaiIDCardReader API ได้:', apiError.message);
      console.log('💡 ตรวจสอบว่าโปรแกรม ThaiIDCardReader.exe รันอยู่หรือไม่');
      throw new Error('ไม่สามารถเชื่อมต่อ ThaiIDCardReader ได้ - กรุณารันโปรแกรม ThaiIDCardReader.exe ก่อน');
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    throw error;
  }
}

/**
 * ส่งข้อมูลไปยัง SSO API
 */
async function sendToSSO(cardData) {
  try {
    console.log('📤 กำลังส่งข้อมูลไปยัง SSO...');
    
    // บันทึกลงไฟล์ (สำหรับ fallback)
    const dir = path.dirname(CONFIG.DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(cardData, null, 2));
    console.log('✅ บันทึกข้อมูลลงไฟล์:', CONFIG.DATA_FILE);
    
    // ส่งไปยัง API (ถ้า Next.js รันอยู่)
    try {
      const response = await fetch(`${CONFIG.SSO_API_URL}/api/card-reader`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cardData)
      });
      
      if (response.ok) {
        console.log('✅ ส่งข้อมูลไปยัง SSO สำเร็จ');
      } else {
        console.log('⚠️  SSO ไม่ตอบกลับ แต่ข้อมูลถูกบันทึกในไฟล์แล้ว');
      }
    } catch (error) {
      console.log('⚠️  ไม่สามารถเชื่อมต่อ SSO ได้ แต่ข้อมูลถูกบันทึกในไฟล์แล้ว');
      console.log('💡 ข้อมูลถูกบันทึกที่:', CONFIG.DATA_FILE);
      console.log('💡 ระบบ SSO จะอ่านข้อมูลจากไฟล์อัตโนมัติ');
    }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

/**
 * API Endpoint สำหรับอ่านข้อมูลจากไฟล์
 */
app.get('/get-card-data', (req, res) => {
  try {
    if (fs.existsSync(CONFIG.DATA_FILE)) {
      const data = fs.readFileSync(CONFIG.DATA_FILE, 'utf8');
      const cardData = JSON.parse(data);
      res.json({ success: true, data: cardData });
    } else {
      res.json({ success: false, error: 'ยังไม่มีข้อมูลบัตร' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API Endpoint สำหรับลบข้อมูล
 */
app.post('/clear-card-data', (req, res) => {
  try {
    if (fs.existsSync(CONFIG.DATA_FILE)) {
      fs.unlinkSync(CONFIG.DATA_FILE);
    }
    res.json({ success: true, message: 'ลบข้อมูลแล้ว' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API Endpoint สำหรับอ่านบัตรผ่าน ThaiIDCardReader (Manual trigger)
 */
app.post('/read-card', async (req, res) => {
  try {
    console.log('📖 รับคำขออ่านบัตร...');
    const cardData = await readCardData(null);
    await sendToSSO(cardData);
    res.json({ success: true, data: cardData });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API Endpoint สำหรับตรวจสอบสถานะ ThaiIDCardReader
 */
app.get('/thaiid-status', async (req, res) => {
  try {
    const url = new URL(CONFIG.THAIID_READER_URL);
    const fetchOptions = {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
    
    // ถ้าเป็น HTTPS ให้ใช้ agent ที่ ignore SSL
    if (url.protocol === 'https:') {
      fetchOptions.agent = httpsAgent;
    }
    
    const response = await fetch(CONFIG.THAIID_READER_URL, fetchOptions);
    
    if (response.ok) {
      res.json({ 
        success: true, 
        status: 'connected',
        message: 'ThaiIDCardReader กำลังทำงาน'
      });
    } else {
      res.json({ 
        success: false, 
        status: 'not_connected',
        message: 'ไม่สามารถเชื่อมต่อ ThaiIDCardReader ได้'
      });
    }
  } catch (error) {
    res.json({ 
      success: false, 
      status: 'not_connected',
      message: `ไม่พบ ThaiIDCardReader: ${error.message}`,
      note: 'กรุณารันโปรแกรม ThaiIDCardReader.exe ก่อน'
    });
  }
});

// เริ่ม Server
app.listen(CONFIG.PORT, () => {
  console.log('🚀 SSO Card Reader Desktop App กำลังทำงาน');
  console.log(`📍 Port: ${CONFIG.PORT}`);
  console.log(`🌐 SSO API: ${CONFIG.SSO_API_URL}`);
  console.log('');
  console.log('📋 วิธีใช้งาน:');
  console.log('   1. ใส่บัตรประชาชนเข้าเครื่องอ่านบัตร');
  console.log('   2. โปรแกรมจะอ่านและส่งข้อมูลอัตโนมัติ');
  console.log('');
  console.log('⏳ รอบัตรประชาชน...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 ปิดโปรแกรม...');
  process.exit(0);
});

