/**
 * Preload Script - Electron
 * 
 * สร้าง bridge ระหว่าง renderer process กับ main process
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // รับข้อมูล config
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // อ่านบัตรแบบ manual
  readCardManual: () => ipcRenderer.invoke('read-card-manual'),
  
  // ตรวจสอบสถานะ ThaiIDCardReader
  checkThaiIDStatus: () => ipcRenderer.invoke('check-thaiid-status'),
  
  // รับสถานะการอ่านบัตร (จาก main process)
  onCardStatus: (callback) => {
    ipcRenderer.on('card-status', (event, data) => callback(data));
  },
  
  // รับสถานะ ThaiIDCardReader (จาก main process)
  onThaiIDStatus: (callback) => {
    ipcRenderer.on('thaiid-status', (event, data) => callback(data));
  },
  
  // ลบ listener
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
