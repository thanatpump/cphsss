import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

// ใช้ environment variable เพื่อให้สามารถเปลี่ยน URL ได้เมื่อ deploy
// Default: localhost (สำหรับรันบนเครื่องเดียวกัน)
// Production: ใช้ IP address หรือ hostname ของเครื่อง client ที่มี Smart Card Reader
const THAIID_READER_HOST = process.env.THAIID_READER_HOST || 'localhost';
const THAIID_READER_PORT = process.env.THAIID_READER_PORT || '8443';
const THAIID_READER_URL = `https://${THAIID_READER_HOST}:${THAIID_READER_PORT}/smartcard/data/`;

// สร้าง HTTPS agent ที่ ignore SSL certificate (เพราะเป็น self-signed)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true
});

/**
 * อ่านบัตรประชาชนจาก Smart Card Reader
 * เรียกใช้ ThaiIDCardReader.exe โดยตรง
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📖 กำลังอ่านบัตรประชาชนจาก ThaiIDCardReader.exe... (เรียกครั้งเดียว)');

    // เรียกใช้ ThaiIDCardReader.exe โดยตรง - เรียกครั้งเดียวเท่านั้น
    // ไม่ retry, ไม่ polling - แค่เรียกครั้งเดียวและรอผลลัพธ์
    const cardData = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: THAIID_READER_HOST,
        port: parseInt(THAIID_READER_PORT),
        path: '/smartcard/data/',
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Connection': 'keep-alive'
        },
        agent: httpsAgent
      }, (res) => {
        let data = '';
        
        // ตั้ง timeout สำหรับการอ่านข้อมูล (115 วินาที)
        res.setTimeout(115000, () => {
          req.destroy();
          reject(new Error('หมดเวลาอ่านข้อมูลจาก ThaiIDCardReader.exe (115 วินาที)\n\nกรุณา:\n1. ตรวจสอบว่าบัตรประชาชนเสียบถูกต้อง\n2. ลองดึงบัตรออกแล้วเสียบใหม่\n3. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง'));
        });
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } else {
              // ถ้า status code ไม่ใช่ 2xx ให้ลอง parse error message
              let errorMessage = `ThaiIDCardReader.exe ตอบกลับด้วย status code: ${res.statusCode}`;
              try {
                const errorData = JSON.parse(data);
                if (errorData.message || errorData.error) {
                  errorMessage = errorData.message || errorData.error;
                }
              } catch {
                // ถ้า parse ไม่ได้ ให้ใช้ error message จาก data
                if (data) {
                  errorMessage = data;
                }
              }
              
              // ถ้าเป็น 400 อาจหมายความว่าไม่มีบัตรหรือบัตรเสียบไม่ถูกต้อง
              if (res.statusCode === 400) {
                // ตรวจสอบว่า error message มีคำว่า AID หรือไม่
                if (errorMessage.toLowerCase().includes('aid') || errorMessage.toLowerCase().includes('ไม่สามารถเลือก')) {
                  errorMessage = 'ไม่สามารถเลือก AID (Application Identifier) ได้\n\nสาเหตุที่เป็นไปได้:\n1. บัตรประชาชนเสียบไม่ถูกต้อง - ลองดึงบัตรออกแล้วเสียบใหม่\n2. บัตรไม่รองรับ AID ที่ระบบต้องการ - ลองใช้บัตรประชาชนใบอื่น\n3. เครื่องอ่านบัตรมีปัญหา - ลองเสียบเครื่องอ่านบัตรใหม่\n4. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง';
                } else {
                  errorMessage = 'ไม่พบบัตรประชาชนหรือบัตรเสียบไม่ถูกต้อง\n\nกรุณา:\n1. ตรวจสอบว่าบัตรประชาชนเสียบเข้าเครื่องอ่านบัตรแล้ว\n2. ลองดึงบัตรออกแล้วเสียบใหม่\n3. รอสักครู่ให้ระบบตรวจจับบัตร\n4. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง';
                }
              }
              
              reject(new Error(errorMessage));
            }
          } catch (parseError) {
            reject(new Error(`ไม่สามารถ parse JSON ได้: ${parseError instanceof Error ? parseError.message : 'Unknown error'}\n\nข้อมูลที่ได้รับ: ${data.substring(0, 200)}`));
          }
        });
      });

      // ตั้ง timeout เป็น 120 วินาที (2 นาที) เพื่อรอให้อ่านบัตรเสร็จ
      req.setTimeout(120000, () => {
        req.destroy();
        reject(new Error('หมดเวลารอการตอบกลับจาก ThaiIDCardReader.exe (120 วินาที)\n\nกรุณาตรวจสอบว่า:\n1. ThaiIDCardReader.exe กำลังรันอยู่\n2. บัตรประชาชนเสียบเข้าเครื่องอ่านบัตรแล้ว\n3. ลองเปิด https://localhost:8443/smartcard/data/ ในเบราว์เซอร์เพื่อตรวจสอบว่าแสดงข้อมูลบัตรหรือไม่\n\nหมายเหตุ: การอ่านบัตรอาจใช้เวลานาน กรุณารอสักครู่'));
      });

      req.on('error', (error) => {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
          reject(new Error('ไม่สามารถเชื่อมต่อกับ ThaiIDCardReader.exe ได้\n\n⚠️ ThaiIDCardReader.exe ยังไม่ได้เปิด\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. หรือรัน card-reader-desktop\\SSO-CardReader-For-Users\\ThaiIDCardReader\\ThaiIDCardReader.exe\n3. รอให้เริ่มทำงาน (https://localhost:8443)\n4. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n5. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง'));
        } else if (error.message.includes('timeout')) {
          reject(new Error('หมดเวลารอการตอบกลับจาก ThaiIDCardReader.exe\n\nกรุณาตรวจสอบว่า:\n1. ThaiIDCardReader.exe กำลังรันอยู่\n2. บัตรประชาชนเสียบเข้าเครื่องอ่านบัตรแล้ว\n3. ลองเปิด https://localhost:8443/smartcard/data/ ในเบราว์เซอร์เพื่อตรวจสอบ'));
        } else {
          reject(new Error(`ไม่สามารถเชื่อมต่อกับ ThaiIDCardReader.exe ได้\n\n⚠️ ThaiIDCardReader.exe ยังไม่ได้เปิด\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. หรือรัน card-reader-desktop\\SSO-CardReader-For-Users\\ThaiIDCardReader\\ThaiIDCardReader.exe\n3. รอให้เริ่มทำงาน (https://localhost:8443)\n4. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n5. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง`));
        }
      });

      req.end();
    });

    console.log('✅ อ่านบัตรสำเร็จจาก ThaiIDCardReader.exe');

    // แปลงข้อมูลให้ตรงกับ format ที่ ThaiIDCardReader.exe ส่งมา
    // Format: {"fname": "", "lname": "", "address": "", "expire_date": "", "gender": "", "issue_date": "", "dob": "", "prename": "", "cid": ""}
    const cardDataTyped = cardData as any;
    const citizenId = String(cardDataTyped.cid || cardDataTyped.citizenId || cardDataTyped.citizen_id || cardDataTyped.pid || cardDataTyped.PID || '').trim();

    if (!citizenId || citizenId.length !== 13 || !/^\d+$/.test(citizenId)) {
      return NextResponse.json({
        success: false,
        error: `เลขบัตรประชาชนไม่ถูกต้อง: "${citizenId}" (ต้องเป็นตัวเลข 13 หลัก)\n\nกรุณา:\n1. ตรวจสอบว่าบัตรประชาชนเสียบถูกต้อง\n2. ลองดึงบัตรออกแล้วเสียบใหม่\n3. รอให้ ThaiIDCardReader.exe อ่านบัตรเสร็จก่อน\n4. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง`
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        citizen_id: citizenId,
        title_th: (cardDataTyped.prename || cardDataTyped.titleTh || cardDataTyped.title_th || cardDataTyped.title || '').trim(),
        first_name_th: (cardDataTyped.fname || cardDataTyped.firstNameTh || cardDataTyped.first_name_th || cardDataTyped.firstName || cardDataTyped.first_name || '').trim(),
        last_name_th: (cardDataTyped.lname || cardDataTyped.lastNameTh || cardDataTyped.last_name_th || cardDataTyped.lastName || cardDataTyped.last_name || '').trim(),
        birth_date: (cardDataTyped.dob || cardDataTyped.birthDate || cardDataTyped.birth_date || '').trim(),
        address: (cardDataTyped.address || cardDataTyped.Address || '').trim(),
        issue_date: (cardDataTyped.issue_date || cardDataTyped.issueDate || cardDataTyped.issue_date || '').trim(),
        expire_date: (cardDataTyped.expire_date || cardDataTyped.expireDate || cardDataTyped.expire_date || '').trim()
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอ่านบัตร'
    }, { status: 500 });
  }
}

/**
 * ตรวจสอบสถานะ Smart Card Reader
 * ตรวจสอบว่า ThaiIDCardReader.exe ทำงานอยู่หรือไม่
 * ไม่พึ่งพา certutil เพราะเมื่อเสียบบัตรเข้าไป Windows อาจจะไม่เห็นเครื่องอ่านบัตร
 */
export async function GET() {
  try {
    // ตรวจสอบว่า ThaiIDCardReader.exe ทำงานอยู่หรือไม่
    let thaiIDReaderRunning = false;
    let hasCard = false;
    let errorMessage = '';
    
    try {
      const result = await new Promise<{ running: boolean; hasCard: boolean; error?: string }>((resolve) => {
        const req = https.request({
          hostname: THAIID_READER_HOST,
          port: parseInt(THAIID_READER_PORT),
          path: '/smartcard/data/',
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          agent: httpsAgent,
          timeout: 3000 // ลด timeout เป็น 3 วินาที (สำหรับตรวจสอบสถานะ)
        }, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                const jsonData = JSON.parse(data);
                // ตรวจสอบว่ามีข้อมูลบัตรหรือไม่ - ใช้ format ใหม่: cid
                const citizenId = String(jsonData.cid || jsonData.citizenId || jsonData.citizen_id || jsonData.pid || jsonData.PID || '').trim();
                hasCard = citizenId.length === 13 && /^\d+$/.test(citizenId);
                thaiIDReaderRunning = true;
                resolve({ running: true, hasCard });
              } else if (res.statusCode === 400) {
                // Status 400 หมายความว่า ThaiIDCardReader ทำงานอยู่ แต่ไม่มีบัตร
                thaiIDReaderRunning = true;
                hasCard = false;
                resolve({ running: true, hasCard: false, error: 'ไม่มีบัตรหรือบัตรเสียบไม่ถูกต้อง' });
              } else {
                // Status code อื่นๆ แต่ ThaiIDCardReader ทำงานอยู่
                thaiIDReaderRunning = true;
                resolve({ running: true, hasCard: false, error: `Status code: ${res.statusCode}` });
              }
            } catch (parseError) {
              // ThaiIDCardReader ทำงานอยู่ แต่ response ไม่ถูกต้อง
              thaiIDReaderRunning = true;
              resolve({ running: true, hasCard: false, error: 'Response ไม่ถูกต้อง' });
            }
          });
        });
        
        req.on('error', (error) => {
          // ถ้าเป็น connection error แสดงว่า ThaiIDCardReader ไม่ได้รันอยู่
          if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
            resolve({ running: false, hasCard: false, error: 'ไม่สามารถเชื่อมต่อกับ ThaiIDCardReader.exe' });
          } else {
            resolve({ running: false, hasCard: false, error: error.message });
          }
        });
        
        req.setTimeout(3000, () => {
          req.destroy();
          resolve({ running: false, hasCard: false, error: 'Connection timeout' });
        });
        
        req.end();
      });
      
      thaiIDReaderRunning = result.running;
      hasCard = result.hasCard;
      if (result.error) {
        errorMessage = result.error;
      }
    } catch (error) {
      thaiIDReaderRunning = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    let status = 'not_connected';
    let message = 'ไม่พบเครื่องอ่านบัตร';

    if (thaiIDReaderRunning) {
      if (hasCard) {
        status = 'card_inserted';
        message = 'ThaiIDCardReader.exe กำลังทำงาน - พบบัตรประชาชน';
      } else {
        status = 'thaiid_reader_running';
        message = 'ThaiIDCardReader.exe กำลังทำงาน - กรุณาเสียบบัตรประชาชน';
        if (errorMessage && errorMessage.includes('ไม่มีบัตร')) {
          message = 'ThaiIDCardReader.exe กำลังทำงาน - ไม่พบบัตรประชาชน\n\nกรุณา:\n1. เสียบบัตรประชาชนเข้าเครื่องอ่านบัตร\n2. รอสักครู่ให้ระบบตรวจจับบัตร\n3. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง';
        }
      }
    } else {
      status = 'not_connected';
      message = 'ThaiIDCardReader.exe ไม่ได้รันอยู่\n\nกรุณา:\n1. ดับเบิลคลิก start-thaiid-reader.bat\n2. หรือรัน card-reader-desktop\\SSO-CardReader-For-Users\\ThaiIDCardReader\\ThaiIDCardReader.exe';
    }

    return NextResponse.json({
      success: true,
      status,
      hasCard,
      hasReader: thaiIDReaderRunning, // ถ้า ThaiIDCardReader ทำงานอยู่ ให้ถือว่ามี reader
      thaiIDReaderRunning,
      message,
      error: errorMessage || undefined
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      status: 'error',
      hasCard: false,
      hasReader: false,
      thaiIDReaderRunning: false,
      message: 'ไม่สามารถตรวจสอบสถานะได้',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
