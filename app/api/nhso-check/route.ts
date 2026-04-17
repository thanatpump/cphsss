import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { citizen_id, hcode, claimType, mobile, hn } = await request.json();

    if (!citizen_id || citizen_id.length !== 13) {
      return NextResponse.json(
        { success: false, error: 'เลขบัตรประชาชนไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const token = process.env.NHSO_TOKEN;
    // API URL ของสปสช - ใช้ API endpoint ที่ทำงานได้จริง
    // จากโค้ด PHP ที่ส่งมา: https://nhsoapi.nhso.go.th/nhsoendpoint/api/RealPerson
    const apiUrl = process.env.NHSO_API_URL || 'https://nhsoapi.nhso.go.th/nhsoendpoint/api/RealPerson';
    
    // HCODE สำหรับ SOURCE_ID (default: 10702 จากโค้ด PHP, หรือใช้จาก parameter)
    const sourceId = hcode || process.env.NHSO_HCODE || '10702';

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบ Token สำหรับเชื่อมต่อ API' },
        { status: 500 }
      );
    }

    console.log('🔄 กำลังเรียก NHSO API...', { pid: citizen_id, source_id: sourceId });
    console.log('📍 API URL:', apiUrl);
    console.log('🔑 Token:', token ? `${token.substring(0, 10)}...` : 'ไม่พบ');

    // สร้าง AbortController สำหรับจัดการ timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // timeout 30 วินาที

    try {
      // ใช้ GET method กับ Query Parameters (ตามโค้ด PHP ที่ทำงานได้)
      // Query Parameters: SOURCE_ID (hcode) และ PID (citizen_id)
      const queryParams = new URLSearchParams({
        SOURCE_ID: sourceId,
        PID: citizen_id,
      });
      
      const fullUrl = `${apiUrl}?${queryParams.toString()}`;
      
      // เพิ่ม options สำหรับ fetch เพื่อจัดการ SSL และ timeout
      const fetchOptions: RequestInit = {
        method: 'GET', // เปลี่ยนเป็น GET ตามโค้ด PHP
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // ใช้ Bearer token ตามโค้ด PHP
          'User-Agent': 'SSO-Chaiyaphum/1.0',
        },
        signal: controller.signal,
      };

      console.log('📤 Request URL:', fullUrl);
      console.log('📤 Query Params:', { SOURCE_ID: sourceId, PID: citizen_id });
      
      const response = await fetch(fullUrl, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ NHSO API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        // Return error จริง ไม่ใช้ mock data
        return NextResponse.json({
          success: false,
          error: `API สปสช ส่งข้อผิดพลาด: ${response.status} ${response.statusText}`,
          details: errorText || 'ไม่สามารถเชื่อมต่อกับ API สปสช ได้'
        }, { status: response.status });
      }

      const data = await response.json();
      console.log('✅ ได้รับข้อมูลจาก NHSO API:', data);

      // แปลงข้อมูลจาก API สปสช ให้อยู่ในรูปแบบที่ frontend ใช้งานได้
      const transformedData = transformNHSOData(data, citizen_id);

      return NextResponse.json({
        success: true,
        data: transformedData,
        source: 'nhso'
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('⏱️ NHSO API Timeout: การเชื่อมต่อใช้เวลานานเกิน 30 วินาที');
        console.error('💡 ตรวจสอบ:');
        console.error('   1. Token ถูกต้องหรือไม่:', token ? 'มี Token' : 'ไม่มี Token');
        console.error('   2. API URL:', apiUrl);
        console.error('   3. Network connection');
        return NextResponse.json({
          success: false,
          error: 'การเชื่อมต่อกับ API สปสช หมดเวลา (30 วินาที) กรุณาตรวจสอบ Token และ Network แล้วลองใหม่อีกครั้ง',
          details: 'API สปสช ไม่ตอบกลับภายใน 30 วินาที อาจเกิดจาก: Token ไม่ถูกต้อง, Network issue, หรือ API สปสช กำลังล่าช้า'
        }, { status: 504 });
      }
      
      // จัดการ Network Error อื่นๆ
      if (fetchError instanceof Error) {
        console.error('❌ Network Error:', fetchError.message);
        console.error('💡 ตรวจสอบ:');
        console.error('   1. Server สามารถเข้าถึง Internet ได้หรือไม่');
        console.error('   2. Firewall บล็อกการเชื่อมต่อหรือไม่');
        console.error('   3. API URL ถูกต้องหรือไม่:', apiUrl);
        console.error('   4. SSL Certificate issue (ถ้าเป็น HTTPS)');
        
        // ตรวจสอบ error type
        if (fetchError.message.includes('fetch failed') || fetchError.message.includes('ECONNRESET') || fetchError.message.includes('ETIMEDOUT')) {
          return NextResponse.json({
            success: false,
            error: 'ไม่สามารถเชื่อมต่อกับ API สปสช ได้ (Network Error)',
            details: 'Server ไม่สามารถเชื่อมต่อกับ API สปสช ได้\n\n' +
                     '⚠️ สาเหตุที่เป็นไปได้:\n' +
                     '1. API endpoint ไม่ถูกต้อง (ตรวจสอบเอกสาร NHSO API)\n' +
                     '2. Server ไม่สามารถเข้าถึง Internet ได้\n' +
                     '3. Firewall บล็อกการเชื่อมต่อ (ต้องอนุญาต HTTPS ออกไปยัง ucws.nhso.go.th)\n' +
                     '4. DNS resolution ไม่ได้ (ลอง ping ucws.nhso.go.th)\n' +
                     '5. API สปสช ต้อง Whitelist IP Address\n' +
                     '6. ต้องใช้ VPN หรือ Network พิเศษ\n\n' +
                     '📞 กรุณาติดต่อ:\n' +
                     '- เจ้าหน้าที่สปสชเพื่อขอ API endpoint ที่ถูกต้อง\n' +
                     '- ผู้ดูแลระบบเพื่อตรวจสอบ Network/Firewall settings',
            error_type: 'network_error',
            api_url: apiUrl,
            original_error: fetchError.message
          }, { status: 503 });
        }
        
        if (fetchError.message.includes('ECONNREFUSED') || fetchError.message.includes('ENOTFOUND')) {
          return NextResponse.json({
            success: false,
            error: 'ไม่สามารถเชื่อมต่อกับ API สปสช ได้ (Connection Refused)',
            details: 'ไม่สามารถเชื่อมต่อกับ API สปสช ได้ อาจเกิดจาก:\n' +
                     '1. API URL ไม่ถูกต้อง\n' +
                     '2. DNS ไม่สามารถ resolve domain ได้\n' +
                     '3. Firewall บล็อกการเชื่อมต่อ',
            error_type: 'connection_refused',
            api_url: apiUrl
          }, { status: 503 });
        }
        
        if (fetchError.message.includes('certificate') || fetchError.message.includes('SSL') || fetchError.message.includes('TLS')) {
          return NextResponse.json({
            success: false,
            error: 'ไม่สามารถเชื่อมต่อกับ API สปสช ได้ (SSL/TLS Error)',
            details: 'เกิดปัญหา SSL/TLS certificate กรุณาตรวจสอบ SSL configuration',
            error_type: 'ssl_error',
            api_url: apiUrl
          }, { status: 503 });
        }
      }
      
      throw fetchError; // ส่งต่อ error อื่นๆ ไปยัง catch block ด้านนอก
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ NHSO Check Error:', errorMessage);
    console.error('📋 Error Details:', error);
    
    // Return error จริง ไม่ใช้ mock data
    return NextResponse.json({
      success: false,
      error: `ไม่สามารถเชื่อมต่อกับ API สปสช ได้: ${errorMessage}`,
      details: error instanceof Error ? error.stack : 'Unknown error'
    }, { status: 500 });
  }
}

// ฟังก์ชันแปลงข้อมูลจาก API สปสช
// ตามโครงสร้าง Response จาก API: https://nhsoapi.nhso.go.th/nhsoendpoint/api/RealPerson
function transformNHSOData(nhsoData: any, citizenId: string) {
  // โครงสร้าง Response จาก API RealPerson:
  // pid, firstName, lastName, fullName, sex, age, nationCode, nationDescription,
  // provinceCode, provinceName, subInsclCode, subInsclName, birthDate,
  // mainInscl, mainInsclCode, mainInsclName, subInscl,
  // hospSubNew, hospMainOpNew, hospMainNew
  
  // ตัดคำนำหน้าออกจาก fullName หรือใช้ firstName + lastName
  const getPatientName = () => {
    if (nhsoData.firstName && nhsoData.lastName) {
      return `${nhsoData.firstName} ${nhsoData.lastName}`.trim();
    }
    // ถ้าไม่มี firstName/lastName ให้ตัดคำนำหน้าออกจาก fullName
    if (nhsoData.fullName) {
      // ตัดคำนำหน้า: เด็กชาย, เด็กหญิง, นาย, นาง, นางสาว
      return nhsoData.fullName
        .replace(/^เด็กชาย\s*/, '')
        .replace(/^เด็กหญิง\s*/, '')
        .replace(/^นาย\s*/, '')
        .replace(/^นาง\s*/, '')
        .replace(/^นางสาว\s*/, '')
        .trim();
    }
    return '';
  };
  
  return {
    citizen_id: citizenId,
    patient_name: getPatientName(),
    first_name: nhsoData.firstName || '',
    last_name: nhsoData.lastName || '',
    sex: nhsoData.sex || '',
    age: nhsoData.age || '',
    birth_date: nhsoData.birthDateNew ? 
      `${nhsoData.birthDateNew.year}-${String(nhsoData.birthDateNew.month).padStart(2, '0')}-${String(nhsoData.birthDateNew.day).padStart(2, '0')}` : 
      (nhsoData.birthDate || ''),
    nation_code: nhsoData.nationCode || '',
    nation_description: nhsoData.nationDescription || '',
    province_code: nhsoData.provinceCode || '',
    province_name: nhsoData.provinceName || '',
    main_right: {
      code: nhsoData.mainInsclCode || nhsoData.mainInscl || '',
      name: nhsoData.mainInsclName || getInsclName(nhsoData.mainInsclCode || nhsoData.mainInscl || ''),
      hospital_code: nhsoData.hospMainNew?.hcode || nhsoData.hospMainNew || '',
      hospital_name: nhsoData.hospMainNew?.hname || '',
      start_date: nhsoData.startDateTime || nhsoData.startDate || nhsoData.dateStart || nhsoData.mainInscl?.dateStart || '',
      expire_date: nhsoData.expireDateTime || nhsoData.expireDate || nhsoData.dateExp || nhsoData.mainInscl?.dateExp || nhsoData.mainInscl?.dateexp || '',
    },
    sub_rights: nhsoData.subInscl ? (Array.isArray(nhsoData.subInscl) ? nhsoData.subInscl : [nhsoData.subInscl]).map((sub: any) => ({
      code: sub.insclCode || sub.code || nhsoData.subInsclCode || '',
      name: sub.insclName || sub.name || nhsoData.subInsclName || '',
      status: 'active',
    })) : (nhsoData.subInsclCode ? [{
      code: nhsoData.subInsclCode,
      name: nhsoData.subInsclName || '',
      status: 'active',
    }] : []),
    hospitals: {
      hospSubNew: nhsoData.hospSubNew?.hcode ? {
        hcode: nhsoData.hospSubNew.hcode,
        hname: nhsoData.hospSubNew.hname || ''
      } : null,
      hospMainOpNew: nhsoData.hospMainOpNew?.hcode ? {
        hcode: nhsoData.hospMainOpNew.hcode,
        hname: nhsoData.hospMainOpNew.hname || ''
      } : null,
      hospMainNew: nhsoData.hospMainNew?.hcode ? {
        hcode: nhsoData.hospMainNew.hcode,
        hname: nhsoData.hospMainNew.hname || ''
      } : null,
    },
    paid_model: nhsoData.paidModel || '',
    sub_inscl_code: nhsoData.subInsclCode || '',
    sub_inscl_name: nhsoData.subInsclName || '',
    claim_info: {
      total_allocated: 0,
      total_used: 0,
      remaining: 0,
      last_claim_date: new Date().toISOString().split('T')[0],
    },
  };
}

// ฟังก์ชันแปลงรหัสสิทธิ์เป็นชื่อ
function getInsclName(code: string): string {
  const insclNames: { [key: string]: string } = {
    'UCS': 'หลักประกันสุขภาพถ้วนหน้า (บัตรทอง)',
    'SSS': 'ประกันสังคม',
    'OFC': 'ข้าราชการ',
    'LGO': 'องค์กรปกครองส่วนท้องถิ่น',
    'WEL': 'สวัสดิการรักษาพยาบาล',
    'OTH': 'อื่นๆ',
  };
  return insclNames[code] || code;
}

