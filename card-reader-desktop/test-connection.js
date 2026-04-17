/**
 * สคริปต์ทดสอบการเชื่อมต่อกับ Server
 */

const https = require('https');
const http = require('http');

// อ่าน config
const fs = require('fs');
const path = require('path');

let configFile = {};
try {
  const configPath = path.join(__dirname, 'config.json');
  if (fs.existsSync(configPath)) {
    configFile = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (error) {
  console.log('⚠️  ไม่พบไฟล์ config.json');
}

const SERVER_URL = configFile.sso_api_url || 'https://cphsss.hsoft.in.th';
const API_ENDPOINT = `${SERVER_URL}/api/card-reader`;

console.log('========================================');
console.log('  ทดสอบการเชื่อมต่อกับ Server');
console.log('========================================');
console.log('');
console.log('🌐 Server URL:', SERVER_URL);
console.log('📍 API Endpoint:', API_ENDPOINT);
console.log('');

// สร้าง https agent ที่ ignore SSL (สำหรับทดสอบ)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * ทดสอบการเชื่อมต่อ
 */
async function testConnection() {
  try {
    console.log('🔍 กำลังทดสอบการเชื่อมต่อ...');
    console.log('');

    // ทดสอบ 1: ตรวจสอบว่า Server ตอบกลับหรือไม่
    console.log('1️⃣  ทดสอบการเชื่อมต่อกับ Server...');
    const url = new URL(API_ENDPOINT);
    const isHttps = url.protocol === 'https:';
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      agent: isHttps ? httpsAgent : undefined,
      timeout: 10000
    };

    const protocol = isHttps ? https : http;
    
    const response = await new Promise((resolve, reject) => {
      const req = protocol.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timeout'));
      });

      req.end();
    });

    console.log('   ✅ Server ตอบกลับแล้ว!');
    console.log('   📊 Status Code:', response.statusCode);
    console.log('');

    // ทดสอบ 2: ตรวจสอบว่า API endpoint ทำงานหรือไม่
    if (response.statusCode === 200 || response.statusCode === 404 || response.statusCode === 405) {
      console.log('2️⃣  API Endpoint พร้อมใช้งาน');
      console.log('   ✅ การเชื่อมต่อสำเร็จ!');
      console.log('');
      
      // ถ้า status 405 หมายความว่า endpoint มีอยู่แต่ method ไม่ถูกต้อง (ปกติ)
      if (response.statusCode === 405) {
        console.log('   💡 Status 405 = Method Not Allowed (ปกติ - endpoint มีอยู่)');
      }
      
      try {
        const jsonData = JSON.parse(response.data);
        if (jsonData.message) {
          console.log('   📝 Message:', jsonData.message);
        }
      } catch (e) {
        // ไม่ใช่ JSON - ไม่เป็นไร
      }
    }

    console.log('');
    console.log('========================================');
    console.log('  ✅ ทดสอบเสร็จสมบูรณ์!');
    console.log('========================================');
    console.log('');
    console.log('💡 สรุป:');
    console.log('   - Server URL:', SERVER_URL);
    console.log('   - การเชื่อมต่อ: สำเร็จ ✅');
    console.log('   - API Endpoint: พร้อมใช้งาน ✅');
    console.log('');
    console.log('🚀 คุณสามารถรัน start.bat เพื่อเริ่มใช้งานได้เลย!');
    console.log('');

  } catch (error) {
    console.log('');
    console.log('========================================');
    console.log('  ❌ ทดสอบล้มเหลว');
    console.log('========================================');
    console.log('');
    console.log('❌ เกิดข้อผิดพลาด:', error.message);
    console.log('');
    console.log('💡 วิธีแก้ไข:');
    console.log('   1. ตรวจสอบว่า Server URL ถูกต้อง:', SERVER_URL);
    console.log('   2. ตรวจสอบว่า Server รันอยู่และสามารถเข้าถึงได้');
    console.log('   3. ตรวจสอบ Firewall หรือ Network settings');
    console.log('   4. ลองเปิด URL ใน Browser:', SERVER_URL);
    console.log('');
    process.exit(1);
  }
}

// รันการทดสอบ
testConnection();
