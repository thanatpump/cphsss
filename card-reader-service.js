/**
 * Card Reader Service
 * รัน Local Service สำหรับอ่านบัตรประชาชน
 * Port: 8080
 */

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8080;

// ตรวจสอบว่ามี smartcard library หรือไม่
let SmartCard;
try {
  SmartCard = require('smartcard');
  console.log('✅ พบ smartcard library');
} catch (error) {
  console.log('⚠️  ไม่พบ smartcard library - จะใช้ Mock Mode');
  console.log('💡 ติดตั้งด้วย: npm install smartcard');
}

// Initialize SmartCard devices
let devices = null;
if (SmartCard) {
  try {
    const Devices = SmartCard.Devices;
    devices = new Devices();
    
    devices.on('device-activated', (event) => {
      console.log('🎴 พบเครื่องอ่านบัตร:', event.device.name);
    });

    devices.on('device-deactivated', (event) => {
      console.log('⚠️  เครื่องอ่านบัตรถูกถอดออก:', event.device.name);
    });

    devices.on('card-inserted', (event) => {
      console.log('✅ พบบัตร ATR:', event.card.getAtr());
    });

    devices.on('card-removed', (event) => {
      console.log('⚠️  บัตรถูกถอดออก');
    });
  } catch (error) {
    console.log('⚠️  ไม่สามารถเชื่อมต่อเครื่องอ่านบัตรได้:', error.message);
  }
}

/**
 * อ่านข้อมูลจากบัตรประชาชน
 * ในระบบจริง ต้องใช้ Thai ID Card library หรือ APDU commands
 */
async function readThaiIDCard(card) {
  // TODO: ใช้ Thai ID Card library จริง
  // ตัวอย่างนี้เป็น placeholder
  
  // ในระบบจริงจะใช้ APDU commands อ่านข้อมูลจาก chip
  // เช่น:
  // - SELECT MOI applet
  // - READ RECORD เพื่ออ่านข้อมูล
  // - Parse response
  
  console.log('📖 กำลังอ่านข้อมูลจากบัตร...');
  
  // จำลองการอ่านข้อมูล (ในระบบจริงจะอ่านจาก chip จริง)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return structure ตามมาตรฐานบัตรประชาชนไทย
  return {
    citizenId: '3101234567890', // 13 หลัก
    titleTh: 'นาย',
    firstNameTh: 'สมชาย',
    lastNameTh: 'ใจดี',
    titleEn: 'Mr.',
    firstNameEn: 'Somchai',
    lastNameEn: 'Jaidee',
    birthDate: '1990-05-15',
    address: '123 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ชัยภูมิ 36000',
    issueDate: '2020-01-01',
    expireDate: '2027-01-01',
    photo: null // base64 encoded photo (ถ้ามี)
  };
}

/**
 * Endpoint: POST /read-card
 * อ่านบัตรประชาชน
 */
app.post('/read-card', async (req, res) => {
  try {
    console.log('\n📖 รับคำขออ่านบัตร...');

    if (!devices) {
      console.log('⚠️  ไม่พบเครื่องอ่านบัตร - ใช้ Mock Data');
      
      // Mock data สำหรับทดสอบ
      const mockData = {
        citizenId: '3101234567890',
        titleTh: 'นาย',
        firstNameTh: 'สมชาย',
        lastNameTh: 'ใจดี',
        titleEn: 'Mr.',
        firstNameEn: 'Somchai',
        lastNameEn: 'Jaidee',
        birthDate: '1990-05-15',
        address: '123 ถ.มิตรภาพ ต.ในเมือง อ.เมือง จ.ชัยภูมิ 36000',
        issueDate: '2020-01-01',
        expireDate: '2027-01-01',
      };

      return res.json({
        success: true,
        data: {
          citizen_id: mockData.citizenId,
          title_th: mockData.titleTh,
          first_name_th: mockData.firstNameTh,
          last_name_th: mockData.lastNameTh,
          birth_date: mockData.birthDate,
          address: mockData.address,
          issue_date: mockData.issueDate,
          expire_date: mockData.expireDate,
        },
        source: 'mock',
        note: 'ใช้ข้อมูล Mock เนื่องจากไม่พบเครื่องอ่านบัตร'
      });
    }

    // รอให้มีบัตรใส่เข้ามา
    console.log('⏳ รอบัตรประชาชน... (รอสูงสุด 30 วินาที)');
    
    const card = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('หมดเวลารอบัตร กรุณาใส่บัตรประชาชนแล้วลองใหม่อีกครั้ง'));
      }, 30000); // รอ 30 วินาที

      devices.on('card-inserted', (event) => {
        clearTimeout(timeout);
        resolve(event.card);
      });

      // ถ้ามีบัตรอยู่แล้ว
      const deviceList = devices.listDevices();
      if (deviceList.length > 0) {
        const device = deviceList[0];
        if (device.card) {
          clearTimeout(timeout);
          resolve(device.card);
        }
      }
    });

    console.log('✅ พบบัตร ATR:', card.getAtr());

    // อ่านข้อมูลจากบัตร
    const cardData = await readThaiIDCard(card);

    console.log('✅ อ่านบัตรสำเร็จ:', cardData.citizenId);

    res.json({
      success: true,
      data: {
        citizen_id: cardData.citizenId,
        title_th: cardData.titleTh,
        first_name_th: cardData.firstNameTh,
        last_name_th: cardData.lastNameTh,
        birth_date: cardData.birthDate,
        address: cardData.address,
        issue_date: cardData.issueDate,
        expire_date: cardData.expireDate,
      },
      source: 'real'
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
 * Endpoint: GET /status
 * ตรวจสอบสถานะเครื่องอ่านบัตร
 */
app.get('/status', (req, res) => {
  try {
    if (!devices) {
      return res.json({
        success: true,
        status: 'not_connected',
        message: 'ไม่พบ smartcard library',
        devices: []
      });
    }

    const deviceList = devices.listDevices();
    
    res.json({
      success: true,
      status: deviceList.length > 0 ? 'connected' : 'not_connected',
      message: deviceList.length > 0 
        ? 'เครื่องอ่านบัตรพร้อมใช้งาน' 
        : 'ไม่พบเครื่องอ่านบัตร',
      devices: deviceList.map(d => ({
        name: d.name,
        hasCard: d.card ? true : false
      }))
    });
  } catch (error) {
    res.json({
      success: false,
      status: 'error',
      message: error.message,
      devices: []
    });
  }
});

/**
 * Endpoint: GET /health
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Card Reader Service',
    version: '1.0.0',
    status: 'running'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎴 Card Reader Service');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔍 Status: http://localhost:${PORT}/status`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
  
  if (!SmartCard) {
    console.log('⚠️  WARNING: smartcard library ไม่ได้ติดตั้ง');
    console.log('💡 ติดตั้งด้วย: npm install smartcard');
    console.log('💡 ระบบจะใช้ Mock Data แทน');
    console.log('='.repeat(60));
  }
  
  console.log('\n🔍 กำลังรอเครื่องอ่านบัตร...');
  console.log('📌 เสียบเครื่องอ่านบัตรเข้า USB port\n');
});

// Error handlers
app.on('error', (error) => {
  console.error('❌ Server Error:', error);
});

process.on('SIGINT', () => {
  console.log('\n👋 กำลังปิด Card Reader Service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 กำลังปิด Card Reader Service...');
  process.exit(0);
});





