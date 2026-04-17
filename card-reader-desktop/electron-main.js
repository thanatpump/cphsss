/**
 * SSO Card Reader - Electron Main Process
 * 
 * โปรแกรม Desktop GUI สำหรับอ่านบัตรประชาชนและส่งข้อมูลไปยังระบบ SSO
 * สำหรับผู้ใช้งานทั่วไป - ใช้งานง่าย เปิดแล้วทำงานอัตโนมัติ
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

// Import logic จาก main.js เดิม
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

// ไม่ต้องใช้ httpsAgent แล้ว ใช้ rejectUnauthorized: false ใน requestOptions แทน

let mainWindow;
let isReading = false;
let lastCardId = null;
let autoReadInterval = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // ถ้ามี icon
    title: 'SSO Card Reader',
    resizable: false,
    autoHideMenuBar: true
  });

  mainWindow.loadFile('index.html');

  // เปิด DevTools เพื่อ debug (comment ออกเมื่อ build production)
  // mainWindow.webContents.openDevTools(); // ปิดไว้สำหรับ production

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // เริ่มอ่านบัตรอัตโนมัติ
  startAutoRead();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopAutoRead();
    app.quit();
  }
});

// ฟังก์ชันอ่านบัตรอัตโนมัติ
async function autoReadCard() {
  if (isReading) return;
  
  try {
    isReading = true;
    const url = new URL(CONFIG.THAIID_READER_URL);
    
    // ใช้ https/http module โดยตรงแทน fetch
    const cardData = await new Promise((resolve, reject) => {
      const requestOptions = {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        rejectUnauthorized: false // ignore SSL certificate สำหรับ localhost
      };
      
      const req = (url.protocol === 'https:' ? https : http).request(url, requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('ไม่สามารถ parse JSON ได้: ' + e.message));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(3000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      
      req.end();
    });
    
    if (cardData) {
      const currentCardId = cardData.citizenId || cardData.citizen_id || cardData.pid || cardData.PID;
      
      if (currentCardId && currentCardId !== lastCardId) {
        console.log('🎴 พบบัตรใหม่:', currentCardId);
        const citizenId = String(currentCardId).trim();
        
        if (citizenId.length !== 13 || !/^\d+$/.test(citizenId)) {
          if (mainWindow) {
            mainWindow.webContents.send('card-status', {
              status: 'error',
              message: 'เลขบัตรประชาชนไม่ถูกต้อง (ต้องเป็นตัวเลข 13 หลัก)'
            });
          }
          return;
        }
        
        lastCardId = citizenId;
        
        if (mainWindow) {
          mainWindow.webContents.send('card-status', {
            status: 'reading',
            message: 'กำลังอ่านข้อมูลบัตร...'
          });
        }
        
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
        
        if (mainWindow) {
          mainWindow.webContents.send('card-status', {
            status: 'success',
            message: 'ส่งข้อมูลสำเร็จ',
            data: formattedData
          });
          
          // เปิดเว็บอัตโนมัติเพื่อดูผลการเช็คสิทธิ์
          const { shell } = require('electron');
          const checkUrl = `${CONFIG.SSO_API_URL}/allocation-check/data`;
          shell.openExternal(checkUrl);
          console.log('✅ เปิดเว็บอัตโนมัติ:', checkUrl);
        }
      }
    }
  } catch (error) {
    // ไม่สามารถเชื่อมต่อ ThaiIDCardReader ได้
    // console.log('⚠️  ไม่สามารถเชื่อมต่อ ThaiIDCardReader:', error.message);
    // ไม่ต้องแสดง error (LED จะแสดง waiting อยู่แล้ว)
    // แต่ถ้าต้องการ debug ให้ uncomment บรรทัดด้านบน
  } finally {
    isReading = false;
  }
}

// ฟังก์ชันส่งข้อมูลไปยัง SSO
async function sendToSSO(cardData) {
  try {
    // บันทึกลงไฟล์
    const dir = path.dirname(CONFIG.DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG.DATA_FILE, JSON.stringify(cardData, null, 2));
    
    // ส่งไปยัง API
    try {
      const apiUrl = new URL(`${CONFIG.SSO_API_URL}/api/card-reader`);
      const postData = JSON.stringify(cardData);
      
      await new Promise((resolve, reject) => {
        const requestOptions = {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          rejectUnauthorized: false
        };
        
        const req = (apiUrl.protocol === 'https:' ? https : http).request(apiUrl, requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 200 || res.statusCode === 201) {
              console.log('✅ ส่งข้อมูลไปยัง SSO สำเร็จ');
              resolve();
            } else {
              console.log('⚠️  SSO ไม่ตอบกลับ แต่ข้อมูลถูกบันทึกในไฟล์แล้ว');
              resolve();
            }
          });
        });
        
        req.on('error', (error) => {
          console.log('⚠️  ไม่สามารถเชื่อมต่อ SSO ได้ แต่ข้อมูลถูกบันทึกในไฟล์แล้ว:', error.message);
          resolve(); // ไม่ reject เพื่อให้โปรแกรมทำงานต่อ
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          console.log('⚠️  SSO Timeout แต่ข้อมูลถูกบันทึกในไฟล์แล้ว');
          resolve();
        });
        
        req.write(postData);
        req.end();
      });
    } catch (error) {
      console.log('⚠️  ไม่สามารถเชื่อมต่อ SSO ได้ แต่ข้อมูลถูกบันทึกในไฟล์แล้ว');
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    throw error;
  }
}

// ฟังก์ชันตรวจสอบสถานะ ThaiIDCardReader
async function checkThaiIDStatus() {
  try {
    const url = new URL(CONFIG.THAIID_READER_URL);
    
    return await new Promise((resolve) => {
      const requestOptions = {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        rejectUnauthorized: false
      };
      
      const req = (url.protocol === 'https:' ? https : http).request(url, requestOptions, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  } catch (error) {
    return false;
  }
}

// ฟังก์ชันเริ่มอ่านบัตรอัตโนมัติ
function startAutoRead() {
  if (autoReadInterval) return;
  
  console.log('🔄 เริ่มการอ่านบัตรอัตโนมัติ (ทุก 2 วินาที)');
  console.log('📍 ThaiIDCardReader URL:', CONFIG.THAIID_READER_URL);
  
  autoReadInterval = setInterval(async () => {
    await autoReadCard();
  }, 2000);
  
  // ตรวจสอบสถานะ ThaiIDCardReader ทุก 5 วินาที
  setInterval(async () => {
    const isConnected = await checkThaiIDStatus();
    console.log('🔍 ตรวจสอบสถานะ ThaiIDCardReader:', isConnected ? 'เชื่อมต่อได้' : 'ไม่พบ');
    if (mainWindow) {
      mainWindow.webContents.send('thaiid-status', {
        connected: isConnected
      });
    }
  }, 5000);
}

// ฟังก์ชันหยุดอ่านบัตร
function stopAutoRead() {
  if (autoReadInterval) {
    clearInterval(autoReadInterval);
    autoReadInterval = null;
  }
}

// IPC Handlers
ipcMain.handle('get-config', () => {
  return {
    ssoApiUrl: CONFIG.SSO_API_URL,
    thaiidReaderUrl: CONFIG.THAIID_READER_URL
  };
});

ipcMain.handle('read-card-manual', async () => {
  try {
    await autoReadCard();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-thaiid-status', async () => {
  return await checkThaiIDStatus();
});
