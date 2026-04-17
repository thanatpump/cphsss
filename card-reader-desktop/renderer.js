/**
 * Renderer Process - Electron
 * 
 * จัดการ UI และรับข้อมูลจาก main process
 */

// ฟังก์ชันอัพเดท LED Indicator
function updateLED(status, text) {
  const led = document.getElementById('led-indicator');
  const ledText = document.getElementById('led-text');
  
  if (led) {
    led.className = `led ${status}`;
    
    const icons = {
      waiting: '⏳',
      ready: '✅',
      reading: '🔄',
      error: '❌',
      success: '✅'
    };
    
    led.innerHTML = `<span>${icons[status] || '⏳'}</span>`;
  }
  
  if (ledText) {
    ledText.textContent = text || 'กำลังตรวจสอบ...';
  }
}

// ฟังก์ชันอัพเดทสถานะ
function updateStatus(elementId, text, iconClass = 'waiting') {
  const element = document.getElementById(elementId);
  const icon = document.getElementById(elementId.replace('-status', '-icon'));
  
  if (element) {
    element.textContent = text;
  }
  
  if (icon) {
    icon.className = `status-icon ${iconClass}`;
    
    // เปลี่ยน icon ตามสถานะ
    const icons = {
      waiting: '⏳',
      success: '✅',
      error: '❌',
      reading: '🔄',
      connected: '✅',
      disconnected: '🔌'
    };
    
    if (icons[iconClass]) {
      icon.innerHTML = `<span>${icons[iconClass]}</span>`;
    }
  }
}

// ฟังก์ชันตรวจสอบสถานะ Server
async function checkServerStatus() {
  try {
    const config = await window.electronAPI.getConfig();
    
    // ลองเชื่อมต่อ Server
    try {
      const response = await fetch(`${config.ssoApiUrl}/api/card-reader`, {
        method: 'GET'
      });
      
      if (response.ok || response.status === 405) {
        updateStatus('server-status', 'เชื่อมต่อสำเร็จ', 'connected');
        return true;
      } else {
        updateStatus('server-status', 'ไม่สามารถเชื่อมต่อได้', 'disconnected');
        return false;
      }
    } catch (fetchError) {
      updateStatus('server-status', 'กำลังตรวจสอบ...', 'waiting');
      return false;
    }
  } catch (error) {
    updateStatus('server-status', 'ไม่สามารถเชื่อมต่อได้', 'disconnected');
    return false;
  }
}

// ฟังก์ชันตรวจสอบสถานะ ThaiIDCardReader
async function checkThaiIDStatus() {
  try {
    const isConnected = await window.electronAPI.checkThaiIDStatus();
    if (isConnected) {
      updateStatus('thaiid-status', 'เชื่อมต่อสำเร็จ', 'connected');
      return true;
    } else {
      updateStatus('thaiid-status', 'ไม่พบเครื่องอ่านบัตร', 'disconnected');
      return false;
    }
  } catch (error) {
    updateStatus('thaiid-status', 'เกิดข้อผิดพลาด', 'error');
    return false;
  }
}

// ฟังก์ชันอัพเดทสถานะพร้อม
async function updateReadyStatus() {
  const thaiidConnected = await checkThaiIDStatus();
  const serverConnected = await checkServerStatus();
  
  if (thaiidConnected && serverConnected) {
    updateLED('ready', 'พร้อมอ่านบัตร - เสียบบัตรได้เลย');
  } else if (!thaiidConnected) {
    updateLED('waiting', 'รอเครื่องอ่านบัตร...');
  } else if (!serverConnected) {
    updateLED('waiting', 'รอเชื่อมต่อ Server...');
  } else {
    updateLED('waiting', 'กำลังตรวจสอบ...');
  }
}

// ฟังก์ชันเริ่มต้น
async function init() {
  // รับ config
  const config = await window.electronAPI.getConfig();
  
  // ตรวจสอบสถานะเริ่มต้น
  updateLED('waiting', 'กำลังตรวจสอบ...');
  await updateReadyStatus();
  
  // ตรวจสอบสถานะทุก 5 วินาที
  setInterval(async () => {
    await updateReadyStatus();
  }, 5000);
  
  // รับสถานะการอ่านบัตรจาก main process
  window.electronAPI.onCardStatus((data) => {
    switch (data.status) {
      case 'waiting':
        updateLED('ready', 'พร้อมอ่านบัตร - เสียบบัตรได้เลย');
        break;
      case 'reading':
        updateLED('reading', 'กำลังอ่านบัตร...');
        break;
      case 'success':
        updateLED('success', 'อ่านบัตรสำเร็จ! กำลังเปิดเว็บ...');
        // LED จะเปลี่ยนกลับเป็น ready หลังจาก 3 วินาที
        setTimeout(() => {
          updateLED('ready', 'พร้อมอ่านบัตร - เสียบบัตรได้เลย');
        }, 3000);
        break;
      case 'error':
        updateLED('error', 'เกิดข้อผิดพลาด - ' + (data.message || ''));
        // LED จะเปลี่ยนกลับเป็น ready หลังจาก 5 วินาที
        setTimeout(() => {
          updateLED('ready', 'พร้อมอ่านบัตร - เสียบบัตรได้เลย');
        }, 5000);
        break;
    }
  });
  
  // รับสถานะ ThaiIDCardReader จาก main process
  window.electronAPI.onThaiIDStatus((data) => {
    if (data.connected) {
      updateStatus('thaiid-status', 'เชื่อมต่อสำเร็จ', 'connected');
    } else {
      updateStatus('thaiid-status', 'ไม่พบเครื่องอ่านบัตร', 'disconnected');
    }
    updateReadyStatus();
  });
}

// เริ่มต้นเมื่อโหลดหน้าเสร็จ
document.addEventListener('DOMContentLoaded', init);
