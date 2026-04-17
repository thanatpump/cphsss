/**
 * Card Reader Service (Simple Version)
 * รันบนเครื่อง Client - ไม่ต้องติดตั้ง smartcard library
 */

const express = require('express');
const cors = require('cors');
const { execSync } = require('child_process');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8080;
const platform = os.platform();

console.log('Platform:', platform);

/**
 * อ่านบัตรโดยใช้ command line tools
 */
async function readCardData() {
  try {
    if (platform === 'win32') {
      // Windows: ใช้ ThaiNationalIDCard.exe หรือ tools อื่น
      // ตัวอย่าง: ถ้ามี ThaiNationalIDCard.exe ติดตั้งไว้
      
      console.log('🔍 กำลังอ่านบัตรบน Windows...');
      
      // TODO: เรียก command line tool ที่อ่านบัตรได้
      // const result = execSync('ThaiNationalIDCard.exe read').toString();
      
      // สำหรับตอนนี้ return mock data
      // เมื่อมี tool จริงแล้ว uncomment บรรทัดด้านบนและ parse ผลลัพธ์
      
      throw new Error('ไม่พบ ThaiNationalIDCard tool บน Windows\n\nวิธีแก้:\n1. ดาวน์โหลด ThaiNationalIDCard tool\n2. หรือใช้ Web USB API\n3. หรือใช้ extension/plugin ของเครื่องอ่านบัตร');
      
    } else if (platform === 'darwin') {
      // macOS: ใช้ pcsc tools
      console.log('🔍 กำลังอ่านบัตรบน macOS...');
      
      // TODO: implement macOS card reading
      throw new Error('ยังไม่รองรับ macOS');
      
    } else {
      // Linux: ใช้ pcsc tools
      console.log('🔍 กำลังอ่านบัตรบน Linux...');
      
      // TODO: implement Linux card reading
      throw new Error('ยังไม่รองรับ Linux');
    }
    
  } catch (error) {
    throw error;
  }
}

/**
 * Endpoint: POST /read-card
 */
app.post('/read-card', async (req, res) => {
  try {
    console.log('\n📖 รับคำขออ่านบัตร...');
    
    const cardData = await readCardData();
    
    console.log('✅ อ่านบัตรสำเร็จ:', cardData.citizen_id);

    res.json({
      success: true,
      data: cardData,
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
 */
app.get('/status', (req, res) => {
  // เช็คว่ามี card reader driver ติดตั้งไว้ไหม
  let hasDriver = false;
  let devices = [];
  
  try {
    if (platform === 'win32') {
      // เช็ค Smart Card service บน Windows
      const result = execSync('sc query SCardSvr', { encoding: 'utf8' });
      hasDriver = result.includes('RUNNING');
      
      if (hasDriver) {
        devices.push({ name: 'Smart Card Service', status: 'running' });
      }
    }
  } catch (error) {
    // Service ไม่ทำงาน
  }
  
  res.json({
    success: true,
    status: hasDriver ? 'connected' : 'not_connected',
    message: hasDriver 
      ? 'เครื่องอ่านบัตรพร้อมใช้งาน' 
      : 'ไม่พบเครื่องอ่านบัตร - ตรวจสอบว่าเสียบ USB และติดตั้ง driver แล้ว',
    devices: devices,
    platform: platform
  });
});

/**
 * Endpoint: GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Card Reader Service (Simple)',
    version: '1.0.0',
    status: 'running',
    platform: platform
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎴 Card Reader Service (Simple Version)');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔍 Status: http://localhost:${PORT}/status`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
  console.log(`\n💡 Platform: ${platform}`);
  console.log('\n📌 หมายเหตุ:');
  console.log('   - ตอนนี้ใช้ Simple version ที่ไม่ต้องติดตั้ง smartcard library');
  console.log('   - เหมาะสำหรับ Windows ที่มี Smart Card Service');
  console.log('   - ต้องมี ThaiNationalIDCard tool หรือ card reader software');
  console.log('\n🔍 กำลังรอคำขออ่านบัตร...\n');
});



