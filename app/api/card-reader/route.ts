import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { storeCardData, getLatestCardData, clearCardData, hasRecentCardData } from './storage';

// API สำหรับอ่านบัตรประชาชน
// รองรับ 3 วิธี:
// 1. Desktop App ส่งข้อมูลมา (PUT) - เก็บใน memory
// 2. Desktop App (local) - localhost:3001
// 3. Card Reader Service (legacy) - localhost:8080

const CARD_READER_URL = process.env.CARD_READER_URL || 'http://localhost:8080';
const DESKTOP_APP_URL = process.env.DESKTOP_APP_URL || 'http://localhost:3001';
const THAIID_READER_URL = process.env.THAIID_READER_URL || 'https://localhost:8443/smartcard/data/';
const DATA_FILE_PATH = process.env.CARD_DATA_FILE || path.join(process.cwd(), 'card-reader-desktop', 'card-data.json');

/**
 * Method 1: อ่านข้อมูลบัตร (Frontend เรียก)
 * ลำดับความสำคัญ:
 * 1. อ่านจาก Memory Storage (Desktop App ส่งมาแล้ว)
 * 2. อ่านจาก Desktop App (local)
 * 3. อ่านจากไฟล์
 * 4. ใช้ Card Reader Service (legacy)
 */
export async function POST(request: NextRequest) {
  try {
    // ลำดับที่ 1: อ่านจาก Memory Storage (Desktop App ส่งมาจากเครื่อง client)
    const latestData = getLatestCardData();
    if (latestData && hasRecentCardData(30)) {
      console.log('✅ อ่านข้อมูลจาก Memory Storage:', latestData.citizen_id);
      // ลบข้อมูลหลังจากอ่านแล้ว (เพื่อไม่ให้อ่านซ้ำ)
      clearCardData();
      return NextResponse.json({
        success: true,
        data: latestData,
        source: 'server-storage'
      });
    }

    // ลำดับที่ 2: ลองอ่านจาก Desktop App (local) - สำหรับ development
    try {
      const desktopResponse = await fetch(`${DESKTOP_APP_URL}/get-card-data`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (desktopResponse.ok) {
        const result = await desktopResponse.json();
        if (result.success && result.data) {
          console.log('✅ อ่านข้อมูลจาก Desktop App (local):', result.data.citizen_id);
          return NextResponse.json({
            success: true,
            data: result.data,
            source: 'desktop-app-local'
          });
        }
      }
    } catch (desktopError) {
      console.log('⚠️  Desktop App (local) ไม่ทำงาน - ลองวิธีอื่น...');
    }

    // ลำดับที่ 3: ลองอ่านจากไฟล์ที่ Desktop App บันทึกไว้
    try {
      if (fs.existsSync(DATA_FILE_PATH)) {
        const fileData = fs.readFileSync(DATA_FILE_PATH, 'utf8');
        const cardData = JSON.parse(fileData);
        console.log('✅ อ่านข้อมูลจากไฟล์:', cardData.citizen_id);
        return NextResponse.json({
          success: true,
          data: cardData,
          source: 'file'
        });
      }
    } catch (fileError) {
      console.log('⚠️  ไม่พบไฟล์ข้อมูล');
    }


    // Method 5: ใช้ Card Reader Service (legacy)
    console.log('📖 กำลังเรียก Card Reader Service...');
    const response = await fetch(`${CARD_READER_URL}/read-card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(35000),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'ไม่สามารถอ่านบัตรได้');
    }
    
    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'ไม่สามารถอ่านบัตรได้');
    }

    console.log('✅ อ่านบัตรสำเร็จ:', result.data.citizen_id);
    
    return NextResponse.json({
      success: true,
      data: result.data,
      source: result.source || 'service',
      note: result.note
    });

  } catch (error) {
    console.error('❌ Card Reader Error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'หมดเวลารอบัตร กรุณาลองใหม่อีกครั้ง' 
        },
        { status: 408 }
      );
    }

    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่สามารถเชื่อมต่อ Card Reader ได้\nกรุณาตรวจสอบว่า Desktop App หรือ Card Reader Service ทำงานอยู่' 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'ไม่สามารถอ่านบัตรได้' 
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint สำหรับรับข้อมูลจาก Desktop App (เครื่อง client)
 * Desktop App จะส่งข้อมูลมาที่นี่เมื่ออ่านบัตรสำเร็จ
 */
export async function PUT(request: NextRequest) {
  try {
    const cardData = await request.json();
    
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!cardData.citizen_id) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน: ไม่พบ citizen_id' },
        { status: 400 }
      );
    }
    
    // ตรวจสอบความยาวของ citizen_id (ต้องเป็น 13 หลัก)
    const citizenId = String(cardData.citizen_id).trim();
    if (citizenId.length !== 13 || !/^\d+$/.test(citizenId)) {
      return NextResponse.json(
        { success: false, error: `เลขบัตรประชาชนไม่ถูกต้อง: ${citizenId} (ต้องเป็นตัวเลข 13 หลัก)` },
        { status: 400 }
      );
    }
    
    // แปลง citizen_id ให้เป็น string และ trim
    cardData.citizen_id = citizenId;
    
    // เก็บข้อมูลใน Memory Storage
    storeCardData(cardData);
    
    console.log('✅ รับข้อมูลจาก Desktop App:', cardData.citizen_id);
    console.log('📦 เก็บข้อมูลใน Memory Storage แล้ว - Frontend สามารถอ่านได้');
    
    return NextResponse.json({
      success: true,
      message: 'รับข้อมูลแล้ว',
      citizen_id: cardData.citizen_id
    });
    
  } catch (error) {
    console.error('❌ Error receiving card data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' 
      },
      { status: 500 }
    );
  }
}

// ตรวจสอบสถานะเครื่องอ่านบัตร
export async function GET() {
  try {
    // ตรวจสอบว่ามีข้อมูลใหม่ใน Memory Storage หรือไม่
    // ถ้ามีข้อมูลใน 60 วินาทีที่ผ่านมา แสดงว่า Desktop App กำลังทำงาน
    if (hasRecentCardData(60)) {
      return NextResponse.json({
        success: true,
        status: 'connected',
        message: 'Desktop App กำลังทำงาน - พร้อมอ่านบัตร',
        type: 'server-storage',
        hasData: true
      });
    }
    
    // ถ้ามีข้อมูลใน 5 นาทีที่ผ่านมา แสดงว่า Desktop App เคยทำงาน
    if (hasRecentCardData(300)) {
      return NextResponse.json({
        success: true,
        status: 'connected',
        message: 'Desktop App เชื่อมต่ออยู่ - เสียบัตรแล้วกดปุ่มอ่านบัตร',
        type: 'server-storage',
        hasData: false
      });
    }

    // ลองตรวจสอบ Desktop App (local) - สำหรับ development
    try {
      const desktopResponse = await fetch(`${DESKTOP_APP_URL}/get-card-data`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });

      if (desktopResponse.ok) {
        console.log('✅ พบ Desktop App (local)');
        return NextResponse.json({
          success: true,
          status: 'connected',
          message: 'Desktop App (local) กำลังทำงาน',
          type: 'desktop-app-local'
        });
      }
    } catch (desktopError) {
      // Desktop App ไม่ทำงาน - ลองวิธีอื่น
    }


    // ลองตรวจสอบ Card Reader Service (legacy)
    try {
      const response = await fetch(`${CARD_READER_URL}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Card Reader Service Status:', result.status);
        return NextResponse.json({
          ...result,
          type: 'service'
        });
      }
    } catch (serviceError) {
      // Service ไม่ทำงาน
    }

    // ถ้าไม่พบทั้งคู่
    throw new Error('ไม่พบ Card Reader');

  } catch (error) {
    console.error('⚠️  Card Reader ไม่ทำงาน');
    
    return NextResponse.json({
      success: false,
      status: 'not_connected',
      message: 'ไม่พบเครื่องอ่านบัตร - กรุณารัน Desktop App',
      note: 'กรุณารัน Desktop App โดยดับเบิ้ลคลิก start.bat ในโฟลเดอร์ card-reader-desktop',
      options: [
        '1. รันโปรแกรม ThaiIDCardReader.exe ก่อน (https://localhost:8443)',
        '2. รัน Desktop App: ดับเบิ้ลคลิก start.bat ในโฟลเดอร์ card-reader-desktop',
        '3. เสียบบัตรประชาชนแล้วกดปุ่มอ่านบัตรบนหน้าเว็บ'
      ],
      type: 'desktop-app-required'
    });
  }
}

