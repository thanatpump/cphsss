'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CardReaderData {
  citizen_id: string;
  title_th: string;
  first_name_th: string;
  last_name_th: string;
  birth_date: string;
  address: string;
  issue_date: string;
  expire_date: string;
}

interface RightData {
  citizen_id: string;
  patient_name: string;
  birth_date?: string;
  sex?: string;
  province_name?: string;
  sub_inscl_code?: string;
  sub_inscl_name?: string;
  paid_model?: string;
  main_right: {
    code: string;
    name: string;
    hospital_code: string;
    hospital_name: string;
    start_date: string;
    expire_date: string;
  };
  sub_rights: Array<{
    code: string;
    name: string;
    status: string;
  }>;
  hospitals?: {
    hospSubNew?: { hcode: string; hname: string } | null;
    hospMainOpNew?: { hcode: string; hname: string } | null;
    hospMainNew?: { hcode: string; hname: string } | null;
  };
  claim_info: {
    total_allocated: number;
    total_used: number;
    remaining: number;
    last_claim_date: string;
  };
}

export default function AllocationDataPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [hospcode, setHospcode] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [cardData, setCardData] = useState<CardReaderData | null>(null);
  const [rightData, setRightData] = useState<RightData | null>(null);
  const [loadingRight, setLoadingRight] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCitizenId, setManualCitizenId] = useState('');
  const [manualHn, setManualHn] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [saveAuthType, setSaveAuthType] = useState<'Auth_card' | 'Auth_manual'>('Auth_card'); // บอกว่าบันทึกมาจาก flow ไหน
  const [verifiedOfficerCitizenId, setVerifiedOfficerCitizenId] = useState<string | null>(null); // เลขบัตรประชาชนเจ้าหน้าที่ที่ยืนยันตัวตนแล้ว
  const [proofImagePath, setProofImagePath] = useState<string | null>(null); // Path ของรูปหลักฐาน
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null); // Preview URL ของรูปหลักฐาน
  const [uploadingProof, setUploadingProof] = useState(false); // สถานะการอัพโหลดรูปหลักฐาน
  const [isVerifyingCard, setIsVerifyingCard] = useState(false); // สถานะการยืนยันตัวตนด้วยบัตร
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isReadingCard, setIsReadingCard] = useState(false);
  const [cardReaderStatus, setCardReaderStatus] = useState<any>(null);
  const router = useRouter();
  const hasCheckedStatusRef = useRef(false); // ใช้ ref เพื่อป้องกันการเรียกซ้ำ

  useEffect(() => {
    // ตรวจสอบ authentication
    const auth = localStorage.getItem('allocation_check_auth');
    const storedUser = localStorage.getItem('allocation_check_user');

    if (auth === 'true' && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setAuthenticated(true);
        setUsername(userData.username || '');
        // สำหรับ allocation-check อาจจะไม่ต้องใช้ hospcode หรือใช้จาก userData
        setHospcode(userData.hospital_name || '');
        setUserRole(userData.role || null);
        setLoading(false);
        
        // ไม่ต้องตรวจสอบสถานะเครื่องอ่านบัตร - ให้ผู้ใช้กดปุ่มอ่านบัตรได้เลย
      } catch (err) {
        console.error('Error parsing user data:', err);
        router.push('/allocation-check');
      }
    } else {
      router.push('/allocation-check');
    }
  }, [router]);

  const checkCardReaderStatus = async () => {
    try {
      // เรียก API เพื่อตรวจสอบสถานะ (GET method ไม่ได้อ่านบัตรจริงๆ แค่ตรวจสอบสถานะ)
      const response = await fetch('/api/read-card', {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // timeout 5 วินาที
      });
      
      if (!response.ok) {
        throw new Error('ไม่สามารถตรวจสอบสถานะได้');
      }
      
      const data = await response.json();
      setCardReaderStatus(data);
      return data; // return เพื่อให้สามารถเช็คได้ว่าต้องหยุด polling หรือไม่
    } catch (error) {
      // ถ้า error ไม่เป็นไร แค่ไม่แสดงสถานะ
      setCardReaderStatus({
        success: false,
        status: 'error',
        hasCard: false,
        hasReader: false,
        thaiIDReaderRunning: false
      });
      return null;
    }
  };

  const readCardFromReader = async () => {
    setIsReadingCard(true);
    setErrorMessage('');
    setCardData(null);
    setRightData(null);

    try {
      console.log('📖 กำลังอ่านบัตรประชาชน...');
      
      // วิธีที่ 1: ลองเรียก https://localhost:8443/smartcard/data/ โดยตรงจาก browser ก่อน
      // วิธีนี้จะทำงานได้ทั้งกรณี localhost และ deploy บน server
      // เพราะ browser จะเรียก localhost ของเครื่อง client เอง
      let cardData: any = null;
      let citizenId = '';
      
      try {
        console.log('🔄 ลองเรียก ThaiIDCardReader.exe โดยตรงจาก browser...');
        // เรียกโดยตรงจาก browser - จะทำงานได้ทั้งกรณี localhost และ deploy บน server
        // เพราะ browser จะเรียก localhost ของเครื่อง client เอง
        const directResponse = await fetch('https://localhost:8443/smartcard/data/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // ไม่ใช้ mode: 'no-cors' เพราะต้องการอ่าน response body
          // ถ้าเจอ CORS error จะ fallback ไปใช้ Next.js API
        });
        
        if (directResponse.ok) {
          cardData = await directResponse.json();
          citizenId = String(cardData.cid || cardData.citizenId || cardData.citizen_id || cardData.pid || cardData.PID || '').trim();
          
          if (citizenId && citizenId.length === 13 && /^\d+$/.test(citizenId)) {
            console.log('✅ อ่านบัตรสำเร็จจาก ThaiIDCardReader.exe โดยตรง:', citizenId);
            
            // ตั้งค่าข้อมูลบัตร
            setSaveAuthType('Auth_card');
            setCardData({
              citizen_id: citizenId,
              title_th: (cardData.prename || cardData.titleTh || cardData.title_th || cardData.title || '').trim(),
              first_name_th: (cardData.fname || cardData.firstNameTh || cardData.first_name_th || cardData.firstName || cardData.first_name || '').trim(),
              last_name_th: (cardData.lname || cardData.lastNameTh || cardData.last_name_th || cardData.lastName || cardData.last_name || '').trim(),
              birth_date: (cardData.dob || cardData.birthDate || cardData.birth_date || '').trim(),
              address: (cardData.address || cardData.Address || '').trim(),
              issue_date: (cardData.issue_date || cardData.issueDate || cardData.issue_date || '').trim(),
              expire_date: (cardData.expire_date || cardData.expireDate || cardData.expire_date || '').trim()
            });

            // เช็คสิทธิ์กับ API สปสช
            setLoadingRight(true);
            try {
              await checkRightWithNHSO(citizenId);
            } catch (error) {
              console.error('❌ Error checking right:', error);
            } finally {
              setLoadingRight(false);
            }
            
            return; // อ่านสำเร็จแล้ว ไม่ต้องทำต่อ
          }
        }
      } catch (directError: any) {
        // ถ้าเรียกโดยตรงไม่ได้ (CORS, SSL, หรือ connection error)
        // ให้ลองใช้วิธีที่ 2: เรียกผ่าน Next.js API
        console.log('⚠️ ไม่สามารถเรียก ThaiIDCardReader.exe โดยตรงได้:', directError.message);
        console.log('🔄 ลองใช้วิธีที่ 2: เรียกผ่าน Next.js API...');
        
        // วิธีที่ 2: เรียกผ่าน Next.js API (สำหรับกรณี localhost)
        try {
          const response = await fetch('/api/read-card', {
            method: 'POST',
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'ไม่สามารถอ่านบัตรได้');
          }

          const result = await response.json();

          if (result.success && result.data && result.data.citizen_id) {
            citizenId = result.data.citizen_id;
            console.log('✅ อ่านบัตรสำเร็จผ่าน Next.js API:', citizenId);
            
            // ตั้งค่าข้อมูลบัตร
            setSaveAuthType('Auth_card');
            setCardData({
              citizen_id: citizenId,
              title_th: result.data.title_th || '',
              first_name_th: result.data.first_name_th || '',
              last_name_th: result.data.last_name_th || '',
              birth_date: result.data.birth_date || '',
              address: result.data.address || '',
              issue_date: result.data.issue_date || '',
              expire_date: result.data.expire_date || ''
            });

            // เช็คสิทธิ์กับ API สปสช
            setLoadingRight(true);
            try {
              await checkRightWithNHSO(citizenId);
            } catch (error) {
              console.error('❌ Error checking right:', error);
            } finally {
              setLoadingRight(false);
            }
            
            return; // อ่านสำเร็จแล้ว ไม่ต้องทำต่อ
          } else {
            throw new Error(result.error || 'ไม่สามารถอ่านบัตรได้');
          }
        } catch (apiError: any) {
          // ถ้าทั้งสองวิธีไม่ได้ ให้แสดง error message
          let errorDetails = '';
          
          // ตรวจสอบ error type จาก directError (error จากวิธีที่ 1)
          if (directError.message.includes('CORS') || directError.message.includes('CORS policy')) {
            errorDetails = 'CORS Error: ThaiIDCardReader.exe ไม่รองรับ CORS\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน\n2. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n3. ใช้วิธีกรอกเลขบัตรด้วยตนเอง (เพราะ CORS error)';
          } else if (directError.message.includes('certificate') || directError.message.includes('SSL') || directError.message.includes('NET::ERR_CERT')) {
            errorDetails = 'SSL Certificate Error: Browser ไม่ยอมรับ self-signed certificate\n\nกรุณา:\n1. เปิด https://localhost:8443/smartcard/data/ ในเบราว์เซอร์\n2. กด "Advanced" → "Proceed to localhost" เพื่อยอมรับ certificate\n3. กลับมาหน้านี้แล้วกดปุ่ม "อ่านบัตรและเช็คสิทธิ์" อีกครั้ง\n4. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง';
          } else if (directError.message.includes('ECONNREFUSED') || directError.message.includes('Failed to fetch') || directError.message.includes('network')) {
            errorDetails = 'Connection Error: ไม่สามารถเชื่อมต่อกับ ThaiIDCardReader.exe ได้\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. รอให้เริ่มทำงาน (https://localhost:8443)\n3. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n4. กดปุ่ม "อ่านบัตรและเช็คสิทธิ์" อีกครั้ง\n5. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง';
          } else {
            errorDetails = `ไม่สามารถอ่านบัตรได้\n\nสาเหตุ: ${directError.message}\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n3. รอให้ ThaiIDCardReader.exe อ่านบัตรเสร็จ\n4. หรือใช้วิธีกรอกเลขบัตรด้วยตนเอง`;
          }
          
          throw new Error(errorDetails);
        }
      }
      
      // ถ้าไม่สามารถอ่านได้เลย
      throw new Error('ไม่สามารถอ่านบัตรได้');

    } catch (error) {
      console.error('❌ Error:', error);
      
      // ตรวจสอบ error message เพื่อแสดงข้อความที่ชัดเจนขึ้น
      let errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอ่านบัตร';
      
      // ถ้าเป็น connection error แสดงข้อความที่ชัดเจนขึ้น
      if (errorMsg.includes('fetch failed') || 
          errorMsg.includes('ECONNREFUSED') || 
          errorMsg.includes('ไม่สามารถเชื่อมต่อ') ||
          errorMsg.includes('เกิดข้อผิดพลาดในการเชื่อมต่อ')) {
        errorMsg = 'ไม่สามารถเชื่อมต่อกับ ThaiIDCardReader.exe ได้\n\n⚠️ ThaiIDCardReader.exe ยังไม่ได้เปิด หรือคุณกำลังเปิดเว็บจากเครื่องอื่น\n\n📋 วิธีแก้ไข:\n\nกรณีที่ 1: เปิดเว็บจากเครื่องเดียวกันกับที่รัน ThaiIDCardReader.exe\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. รอให้เริ่มทำงาน (https://localhost:8443)\n3. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n4. กดปุ่ม "อ่านบัตรและเช็คสิทธิ์" อีกครั้ง\n\nกรณีที่ 2: เปิดเว็บจากเครื่องอื่น (deploy บน server)\n1. เปิด ThaiIDCardReader.exe บนเครื่องของคุณ\n2. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n3. เปิด https://localhost:8443/smartcard/data/ ในเบราว์เซอร์\n4. Copy เลขบัตรประชาชน (cid) มาใส่ในช่อง "กรอกเลขบัตรด้วยตนเอง"\n\nหรือใช้วิธีกรอกเลขบัตรด้วยตนเอง';
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsReadingCard(false);
    }
  };


  const checkRightWithNHSO = async (citizenId: string) => {
    setErrorMessage('');

    try {
      console.log('🔄 กำลังเรียก API สปสช...', { citizen_id: citizenId, hcode: hospcode });
      
      // เรียก API สปสช ผ่าน Backend
      // ตามเอกสาร NHSO API: ส่ง pid, claimType, mobile, correlationId, hn
      const response = await fetch('/api/nhso-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          citizen_id: citizenId,
          hcode: hospcode, // รองรับรูปแบบเดิม
          hn: hospcode, // Hospital Number (ตามเอกสาร PDF)
          claimType: 'OP', // Default: Outpatient (ผู้ป่วยนอก)
          // mobile: '', // ไม่บังคับตามเอกสาร
        }),
      });

      // ตรวจสอบ HTTP status
      if (!response.ok) {
        let errorText = '';
        let errorData: any = {};
        
        try {
          errorText = await response.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { error: errorText };
            }
          }
        } catch (e) {
          console.error('❌ Error reading response:', e);
        }
        
        console.error('❌ HTTP Error:', response.status, errorData);
        
        // จัดการ error ตาม status code
        let errorMessage = '';
        if (response.status === 503) {
          errorMessage = errorData.error || errorData.details || 
            'ไม่สามารถเชื่อมต่อกับ API สปสช ได้ (Service Unavailable)\n\n' +
            '⚠️ ปัญหา: Server ไม่สามารถเชื่อมต่อกับ API สปสช ได้\n\n' +
            '🔧 สาเหตุที่เป็นไปได้:\n' +
            '1. API endpoint ไม่ถูกต้อง (ต้องตรวจสอบกับเอกสาร NHSO API)\n' +
            '2. Server ไม่สามารถเข้าถึง Internet ได้\n' +
            '3. Firewall บล็อกการเชื่อมต่อ\n' +
            '4. API สปสช ต้อง Whitelist IP Address\n' +
            '5. ต้องใช้ VPN หรือ Network พิเศษ\n\n' +
            '📞 กรุณาติดต่อผู้ดูแลระบบหรือเจ้าหน้าที่สปสชเพื่อ:\n' +
            '- ขอ API endpoint ที่ถูกต้อง\n' +
            '- ขอ Whitelist IP Address (ถ้าจำเป็น)\n' +
            '- ตรวจสอบ Network/Firewall settings';
        } else if (response.status === 504) {
          errorMessage = errorData.error || errorData.details || 
            'การเชื่อมต่อกับ API สปสช หมดเวลา (30 วินาที)\n\n' +
            'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ';
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = errorData.error || errorData.details || 
            'Token ไม่ถูกต้องหรือหมดอายุ\n\n' +
            'กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบ NHSO_TOKEN';
        } else {
          errorMessage = errorData.error || errorData.details || 
            `HTTP ${response.status}: ${response.statusText || 'Unknown Error'}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      console.log('📥 ผลลัพธ์จาก API สปสช:', result);

      if (!result.success || !result.data) {
        const errorMsg = result.error || result.details || 'ไม่สามารถตรวจสอบสิทธิ์ได้';
        console.error('❌ API สปสช ส่ง error:', errorMsg);
        
        // แสดง error message ที่ชัดเจนขึ้น
        let userFriendlyError = errorMsg;
        if (errorMsg.includes('Network Error') || errorMsg.includes('fetch failed')) {
          userFriendlyError = 'ไม่สามารถเชื่อมต่อกับ API สปสช ได้\n\n' +
            'สาเหตุที่เป็นไปได้:\n' +
            '1. Server ไม่สามารถเข้าถึง Internet ได้\n' +
            '2. Firewall บล็อกการเชื่อมต่อ\n' +
            '3. API URL ไม่ถูกต้อง\n\n' +
            'กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบ Network และ Firewall settings';
        } else if (errorMsg.includes('หมดเวลา')) {
          userFriendlyError = 'การเชื่อมต่อกับ API สปสช หมดเวลา (30 วินาที)\n\n' +
            'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ';
        } else if (errorMsg.includes('Token')) {
          userFriendlyError = 'ไม่พบ Token สำหรับเชื่อมต่อ API สปสช\n\n' +
            'กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า NHSO_TOKEN';
        }
        
        throw new Error(userFriendlyError);
      }

      // อัพเดทชื่อผู้ป่วยจากข้อมูลบัตร ถ้ามี
      if (cardData && cardData.first_name_th && cardData.last_name_th) {
        result.data.patient_name = `${cardData.title_th}${cardData.first_name_th} ${cardData.last_name_th}`;
      }

      setRightData(result.data);

      console.log('✅ ได้รับข้อมูลจาก API สปสช สำเร็จ:', result.data);

    } catch (error) {
      console.error('❌ Error calling NHSO API:', error);
      
      // แยก error type
      let errorMessage = 'ไม่สามารถเชื่อมต่อกับ API สปสช ได้';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // ถ้าเป็น Network Error หรือ 503 ให้แสดงข้อความที่ชัดเจน
        if (error.message.includes('fetch failed') || 
            error.message.includes('Network Error') || 
            error.message.includes('503') ||
            error.message.includes('Service Unavailable')) {
          errorMessage = 'ไม่สามารถเชื่อมต่อกับ API สปสช ได้\n\n' +
            '⚠️ ปัญหา: Server ไม่สามารถเชื่อมต่อกับ API สปสช ได้\n\n' +
            '🔧 สาเหตุที่เป็นไปได้:\n' +
            '1. API endpoint ไม่ถูกต้อง (ตรวจสอบเอกสาร NHSO API)\n' +
            '2. Server ไม่สามารถเข้าถึง Internet ได้\n' +
            '3. Firewall บล็อกการเชื่อมต่อ\n' +
            '4. API สปสช ต้อง Whitelist IP Address\n' +
            '5. ต้องใช้ VPN หรือ Network พิเศษ\n\n' +
            '📞 กรุณาติดต่อ:\n' +
            '- ผู้ดูแลระบบเพื่อตรวจสอบ Network/Firewall\n' +
            '- เจ้าหน้าที่สปสชเพื่อขอ API endpoint ที่ถูกต้อง';
        }
      }
      
      setErrorMessage(errorMessage);
      throw error; // Throw เพื่อให้ caller จัดการต่อ
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('allocation_check_auth');
    localStorage.removeItem('allocation_check_username');
    localStorage.removeItem('allocation_check_hospcode');
    router.push('/allocation-check');
  };

  const handleReset = () => {
    setCardData(null);
    setRightData(null);
    setErrorMessage('');
    setManualCitizenId('');
    setManualHn('');
    setShowManualInput(false);
    setVerifiedOfficerCitizenId(null); // รีเซ็ตข้อมูลบัตรที่ยืนยันตัวตน
    setSaveAuthType('Auth_card');
    setProofImagePath(null);
    setProofImagePreview(null);
  };

  // ฟังก์ชันอ่านบัตรเพื่อยืนยันตัวตน (สำหรับกรอกเลขบัตรด้วยตนเอง)
  const verifyIdentityWithCard = async () => {
    setIsVerifyingCard(true);
    setErrorMessage('');

    try {
      console.log('📖 กำลังอ่านบัตรเพื่อยืนยันตัวตน...');
      
      let cardData: any = null;
      let citizenId = '';
      
      try {
        // วิธีที่ 1: ลองเรียกโดยตรงจาก browser
        const directResponse = await fetch('https://localhost:8443/smartcard/data/', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (directResponse.ok) {
          cardData = await directResponse.json();
          citizenId = String(cardData.cid || cardData.citizenId || cardData.citizen_id || cardData.pid || cardData.PID || '').trim();
          
          if (citizenId && citizenId.length === 13 && /^\d+$/.test(citizenId)) {
            console.log('✅ อ่านบัตรสำเร็จเพื่อยืนยันตัวตน:', citizenId);
            
            // เก็บแค่เลขบัตรประชาชนเจ้าหน้าที่ที่ยืนยันตัวตนแล้ว
            setVerifiedOfficerCitizenId(citizenId);
            
            // แสดงฟอร์มให้กรอกเลข 13 หลัก
            setShowManualInput(true);
            setIsVerifyingCard(false);
            return;
          }
        }
      } catch (directError: any) {
        // ถ้าเรียกโดยตรงไม่ได้ ให้ลองใช้ Next.js API
        console.log('⚠️ ไม่สามารถเรียก ThaiIDCardReader.exe โดยตรงได้:', directError.message);
        console.log('🔄 ลองใช้วิธีที่ 2: เรียกผ่าน Next.js API...');
        
        try {
          const response = await fetch('/api/read-card', {
            method: 'POST',
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || 'ไม่สามารถอ่านบัตรได้');
          }

          const result = await response.json();

          if (result.success && result.data && result.data.citizen_id) {
            citizenId = result.data.citizen_id;
            console.log('✅ อ่านบัตรสำเร็จผ่าน Next.js API เพื่อยืนยันตัวตน:', citizenId);
            
            // เก็บแค่เลขบัตรประชาชนเจ้าหน้าที่ที่ยืนยันตัวตนแล้ว
            setVerifiedOfficerCitizenId(citizenId);
            
            // แสดงฟอร์มให้กรอกเลข 13 หลัก
            setShowManualInput(true);
            setIsVerifyingCard(false);
            return;
          } else {
            throw new Error(result.error || 'ไม่สามารถอ่านบัตรได้');
          }
        } catch (apiError: any) {
          // ตรวจสอบ error จากทั้ง directError และ apiError
          const errorMessage = apiError.message || directError.message || 'ไม่สามารถอ่านบัตรได้';
          let errorDetails = '';
          
          if (errorMessage.includes('CORS') || errorMessage.includes('CORS policy')) {
            errorDetails = 'CORS Error: ThaiIDCardReader.exe ไม่รองรับ CORS\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน\n2. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n3. รอให้อ่านบัตรเสร็จ';
          } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('NET::ERR_CERT')) {
            errorDetails = 'SSL Certificate Error: Browser ไม่ยอมรับ self-signed certificate\n\nกรุณา:\n1. เปิด https://localhost:8443/smartcard/data/ ในเบราว์เซอร์\n2. กด "Advanced" → "Proceed to localhost" เพื่อยอมรับ certificate\n3. กลับมาหน้านี้แล้วกดปุ่ม "กรอกเลขบัตรด้วยตนเอง" อีกครั้ง';
          } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch') || errorMessage.includes('network') || errorMessage.includes('Connection Error') || errorMessage.includes('ไม่สามารถเชื่อมต่อ')) {
            errorDetails = 'Connection Error: ไม่สามารถเชื่อมต่อกับ ThaiIDCardReader.exe ได้\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. รอให้เริ่มทำงาน (https://localhost:8443)\n3. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n4. กดปุ่ม "กรอกเลขบัตรด้วยตนเอง" อีกครั้ง';
          } else {
            errorDetails = `ไม่สามารถอ่านบัตรได้\n\nสาเหตุ: ${errorMessage}\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n3. รอให้ ThaiIDCardReader.exe อ่านบัตรเสร็จ`;
          }
          
          throw new Error(errorDetails);
        }
      }
      
      // ถ้าไม่สามารถอ่านบัตรได้เลย (ไม่เจอ citizenId)
      throw new Error('ไม่สามารถอ่านบัตรได้\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n3. รอให้ ThaiIDCardReader.exe อ่านบัตรเสร็จ\n4. กดปุ่ม "กรอกเลขบัตรด้วยตนเอง" อีกครั้ง');

    } catch (error) {
      console.error('❌ Error verifying identity:', error);
      let errorMsg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอ่านบัตร';
      
      // ถ้า error message ยังไม่มีคำแนะนำ ให้เพิ่มคำแนะนำ
      if (!errorMsg.includes('กรุณา:') && !errorMsg.includes('ThaiIDCardReader.exe')) {
        if (errorMsg.includes('fetch failed') || 
            errorMsg.includes('ECONNREFUSED') || 
            errorMsg.includes('ไม่สามารถเชื่อมต่อ') ||
            errorMsg.includes('Connection Error')) {
          errorMsg = 'Connection Error: ไม่สามารถเชื่อมต่อกับ ThaiIDCardReader.exe ได้\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. รอให้เริ่มทำงาน (https://localhost:8443)\n3. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n4. กดปุ่ม "กรอกเลขบัตรด้วยตนเอง" อีกครั้ง';
        } else {
          errorMsg = `ไม่สามารถอ่านบัตรได้\n\nสาเหตุ: ${errorMsg}\n\nกรุณา:\n1. เปิด ThaiIDCardReader.exe ก่อน (ดับเบิลคลิก start-thaiid-reader.bat)\n2. เสียบเครื่องอ่านบัตรและเสียบบัตรประชาชน\n3. รอให้ ThaiIDCardReader.exe อ่านบัตรเสร็จ\n4. กดปุ่ม "กรอกเลขบัตรด้วยตนเอง" อีกครั้ง`;
        }
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsVerifyingCard(false);
    }
  };

  const handleProofImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingProof(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_sks', username || '');
      formData.append('citizen_id', (cardData?.citizen_id || manualCitizenId || '').replace(/-/g, ''));
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      formData.append('vstdate', today);
      formData.append('vn', String((rightData as any)?.vn || ''));
      formData.append('hn', manualHn.trim() || String((rightData as any)?.hn || ''));
      formData.append('authen', String((rightData as any)?.authen || ''));

      const response = await fetch('/api/upload-proof-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ไม่สามารถอัพโหลดรูปได้');
      }

      // เก็บ path และสร้าง preview URL
      setProofImagePath(result.data.path);
      const previewUrl = URL.createObjectURL(file);
      setProofImagePreview(previewUrl);

      console.log('✅ อัพโหลดรูปหลักฐานสำเร็จ:', result.data.path);
    } catch (error) {
      console.error('❌ Error uploading proof image:', error);
      setErrorMessage(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัพโหลดรูปหลักฐาน');
      setProofImagePath(null);
      setProofImagePreview(null);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleRemoveProofImage = () => {
    if (proofImagePreview) {
      URL.revokeObjectURL(proofImagePreview);
    }
    setProofImagePath(null);
    setProofImagePreview(null);
  };

  const handleManualCheck = async () => {
    // ตรวจสอบว่าเลขบัตรเป็น 13 หลัก
    const citizenId = manualCitizenId.trim().replace(/-/g, '');
    
    if (!citizenId) {
      setErrorMessage('กรุณากรอกเลขบัตรประชาชน 13 หลัก');
      return;
    }
    
    if (citizenId.length !== 13 || !/^\d+$/.test(citizenId)) {
      setErrorMessage('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก');
      return;
    }

    if (!manualHn.trim()) {
      setErrorMessage('กรุณากรอก HN ก่อนตรวจสอบสิทธิ์');
      return;
    }
    
    setErrorMessage('');
    setRightData(null);
    setLoadingRight(true);
    setSaveAuthType('Auth_manual');
    
    // สร้างข้อมูลบัตรจำลอง (สำหรับแสดงผล) ก่อนเรียก API
    const manualCardData: CardReaderData = {
      citizen_id: citizenId,
      title_th: '',
      first_name_th: '',
      last_name_th: '',
      birth_date: '',
      address: '',
      issue_date: '',
      expire_date: ''
    };
    
    setCardData(manualCardData);
    
    try {
      console.log('📝 กำลังตรวจสอบสิทธิ์ด้วยเลขบัตรที่กรอก:', citizenId);
      
      // เช็คสิทธิ์โดยตรงด้วยเลขบัตรที่กรอก
      await checkRightWithNHSO(citizenId);
      
      console.log('✅ ตรวจสอบสิทธิ์สำเร็จ');
    } catch (error) {
      console.error('❌ Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
      setCardData(null);
    } finally {
      setLoadingRight(false);
    }
  };


  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // แปลงวันที่เป็นรูปแบบ เดือน ปี (เช่น ธันวาคม 2540)
  const formatMonthYear = (dateString: string) => {
    if (!dateString) return '-';
    
    try {
      // ถ้าเป็นรูปแบบภาษาไทย "15 ธันวาคม 2540" ให้แยกเอาแค่เดือนและปี
      if (dateString.includes('ธันวาคม') || dateString.includes('มกราคม') || dateString.includes('กุมภาพันธ์') || 
          dateString.includes('มีนาคม') || dateString.includes('เมษายน') || dateString.includes('พฤษภาคม') ||
          dateString.includes('มิถุนายน') || dateString.includes('กรกฎาคม') || dateString.includes('สิงหาคม') ||
          dateString.includes('กันยายน') || dateString.includes('ตุลาคม') || dateString.includes('พฤศจิกายน')) {
        // แยก "15 ธันวาคม 2540" -> "ธันวาคม 2540"
        const parts = dateString.trim().split(' ');
        if (parts.length >= 3) {
          // เอาเดือน (index 1) และปี (index 2)
          return `${parts[1]} ${parts[2]}`;
        }
      }
      
      // ลองแปลงรูปแบบวันที่ต่างๆ
      let date: Date;
      
      // ถ้าเป็นรูปแบบ YYYY-MM-DD หรือ ISO format
      if (dateString.includes('-') && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
        date = new Date(dateString);
      }
      // ถ้าเป็นรูปแบบ DD/MM/YYYY
      else if (dateString.includes('/')) {
        const parts = dateString.split('/');
        if (parts.length === 3) {
          // DD/MM/YYYY
          date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          date = new Date(dateString);
        }
      }
      // ถ้าเป็นรูปแบบอื่นๆ
      else {
        date = new Date(dateString);
      }
      
      // ตรวจสอบว่า date ถูกต้องหรือไม่
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateString);
        return '-';
      }
      
      const month = date.toLocaleDateString('th-TH', { month: 'long' });
      const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
      return `${month} ${year}`;
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return '-';
    }
  };

  // แปลงวันที่เป็นรูปแบบ ddmmyyyy
  const formatDateToDDMMYYYY = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}${month}${year}`;
  };

  // แปลงเวลาเป็นรูปแบบ HH:mm:ss
  const formatTimeToHHMMSS = (): string => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // เซ็นเซอร์เลขบัตรประชาชน (เซ็นเซอร์ 6 ตัวท้าย)
  const maskCitizenId = (citizenId: string): string => {
    if (!citizenId || citizenId.length !== 13) return citizenId;
    return citizenId.slice(0, 7) + '******';
  };

  // เซ็นเซอร์ชื่อ (แสดงแค่ 3 ตัวแรก ที่เหลือเป็น *)
  const maskName = (name: string): string => {
    if (!name) return name;
    const trimmedName = name.trim();
    if (trimmedName.length <= 3) return trimmedName;
    
    // แยกชื่อและนามสกุล
    const parts = trimmedName.split(/\s+/);
    if (parts.length === 1) {
      // ถ้ามีแค่ชื่อเดียว
      return trimmedName.slice(0, 3) + '*'.repeat(Math.max(0, trimmedName.length - 3));
    } else {
      // ถ้ามีชื่อและนามสกุล
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');
      const maskedFirstName = firstName.length <= 3 
        ? firstName 
        : firstName.slice(0, 3) + '*'.repeat(Math.max(0, firstName.length - 3));
      const maskedLastName = '*'.repeat(Math.max(3, lastName.length));
      return `${maskedFirstName} ${maskedLastName}`;
    }
  };

  // บันทึกข้อมูล authen_code
  const saveAuthenCode = async () => {
    if (!cardData && !rightData) {
      setErrorMessage('ไม่มีข้อมูลที่จะบันทึก กรุณาอ่านบัตรหรือตรวจสอบสิทธิ์ก่อน');
      return;
    }

    const citizenId = cardData?.citizen_id || rightData?.citizen_id;
    if (!citizenId) {
      setErrorMessage('ไม่พบเลขบัตรประชาชน');
      return;
    }

    if (!username) {
      setErrorMessage('ไม่พบชื่อผู้ใช้งาน');
      return;
    }

    // ตรวจสอบว่าต้องอัพโหลดรูปหลักฐานหรือไม่ (เฉพาะกรณี manual)
    if (saveAuthType === 'Auth_manual' && !proofImagePath) {
      setErrorMessage('กรุณาอัพโหลดรูปหลักฐานก่อนบันทึกข้อมูล');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage('');

    try {
      const now = new Date();
      const date = formatDateToDDMMYYYY(now.toISOString());
      const time = formatTimeToHHMMSS();
      const vstdate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now); // YYYY-MM-DD

      const response = await fetch('/api/authen-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_sks: username, // ใช้ username (user_sks) แทน hospcode
          date: date,
          time: time,
          citizen_id: citizenId,
          officer_citizen_id: verifiedOfficerCitizenId || null, // เลขบัตรประชาชนเจ้าหน้าที่ที่บันทึกข้อมูล
          auth_type: saveAuthType, // Auth_card | Auth_manual
          vstdate, // YYYY-MM-DD (วันที่กดบันทึก)
          proof_image_path: proofImagePath || null, // Path ของรูปหลักฐาน (เฉพาะกรณี manual)
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      console.log('✅ บันทึก authen_code สำเร็จ:', result.data);
      
      // แสดง Popup บันทึกสำเร็จ
      setShowSuccessPopup(true);
      
      // หลังจาก 2 วินาที ให้ปิด popup และรีเซ็ตข้อมูลกลับไปหน้าเริ่มต้น
      setTimeout(() => {
        setShowSuccessPopup(false);
        handleReset();
      }, 2000);

    } catch (error) {
      console.error('❌ Error saving authen_code:', error);
      setErrorMessage(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-yellow-600 mx-auto"></div>
          <p className="mt-6 text-xl text-gray-700 font-semibold">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header - ธีมทางการโรงพยาบาล */}
      <div className="bg-slate-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-5 gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-slate-600 rounded-lg p-3">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                  ระบบตรวจสอบสิทธิ์การรักษา
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-2 bg-slate-600 rounded-lg px-3 py-1.5">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span className="text-white text-sm font-semibold">{username}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-600 rounded-lg px-3 py-1.5">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                    <span className="text-white text-sm font-semibold">{hospcode}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {(userRole === 'admin_server' || userRole === 'admin_rps') && (
                <Link
                  href="/admin"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  Admin
                </Link>
              )}
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/download-thaiid-reader');
                    if (!response.ok) {
                      throw new Error('ไม่สามารถดาวน์โหลดไฟล์ได้');
                    }
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'ThaiIDCardReader.exe';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (error) {
                    setErrorMessage('ไม่สามารถดาวน์โหลดไฟล์ได้: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  }
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm"
                title="ดาวน์โหลด ThaiIDCardReader.exe"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">ดาวน์โหลด</span>
              </button>
              <Link href="/">
                <button className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">หน้าหลัก</span>
                </button>
              </Link>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414l-4 4a1 1 0 01-1.414 0L6 8.414V7l4 4 4-4v1.414z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Manual Input Section */}
            {!cardData && (
              <div className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-slate-700 rounded-lg p-3">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">
                        ตรวจสอบสิทธิ์การรักษา
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">กรอกเลขบัตรประชาชนเพื่อตรวจสอบสิทธิ์</p>
                    </div>
                  </div>

                  {!showManualInput ? (
                    <div className="text-center space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                        <button
                          onClick={readCardFromReader}
                          disabled={isReadingCard || loadingRight}
                          className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isReadingCard ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                              กำลังอ่านบัตร...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                              </svg>
                              อ่านบัตรและเช็คสิทธิ์
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={verifyIdentityWithCard}
                          disabled={isVerifyingCard}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isVerifyingCard ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                              กำลังยืนยันตัวตน...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                              กรอกเลขบัตรด้วยตนเอง
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Warning if Card Reader Service is not running */}
                      {cardReaderStatus?.status === 'error' && cardReaderStatus?.error?.includes('ไม่สามารถเชื่อมต่อ') && (
                        <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                              <h3 className="font-semibold text-yellow-800 mb-1">Card Reader Service ไม่ได้รันอยู่</h3>
                              <p className="text-sm text-yellow-700 mb-2">
                                ต้องรัน Card Reader Service ก่อนถึงจะอ่านบัตรได้
                              </p>
                              <div className="text-sm text-yellow-700 space-y-1">
                                <p><strong>วิธีรัน:</strong></p>
                                <ol className="list-decimal list-inside space-y-1 ml-2">
                                  <li>ดับเบิลคลิก <code className="bg-yellow-100 px-1 rounded">start-read-card-service.bat</code></li>
                                  <li>หรือเปิด Command Prompt แล้วรัน: <code className="bg-yellow-100 px-1 rounded">node read-card-service.js</code></li>
                                  <li>รอให้เห็นข้อความ "Server running on http://localhost:3002"</li>
                                  <li>รีเฟรชหน้านี้</li>
                                </ol>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-300 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          กรอกเลขบัตรประชาชนด้วยตนเอง
                        </h3>
                        <button
                          onClick={() => {
                            setShowManualInput(false);
                            setManualCitizenId('');
                            setManualHn('');
                            setErrorMessage('');
                            setVerifiedOfficerCitizenId(null);
                          }}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* แสดงข้อมูลบัตรที่ยืนยันตัวตนแล้ว */}
                      {verifiedOfficerCitizenId && (
                        <div className="mb-4 bg-green-50 border border-green-300 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                              <p className="font-semibold text-green-800 mb-1">ยืนยันตัวตนเจ้าหน้าที่สำเร็จ</p>
                              <p className="text-sm text-green-700 font-mono">
                                เลขบัตรเจ้าหน้าที่: {maskCitizenId(verifiedOfficerCitizenId)}
                              </p>
                              <p className="text-xs text-green-600 mt-2">กรุณากรอกเลขบัตรประชาชน 13 หลักของผู้รับบริการ</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            เลขบัตรประชาชน 13 หลัก
                          </label>
                          <input
                            type="text"
                            value={manualCitizenId}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              if (value.length <= 13) {
                                setManualCitizenId(value);
                                setErrorMessage('');
                              }
                            }}
                            placeholder="1234567890123"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-lg font-mono text-center"
                            maxLength={13}
                            autoFocus
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            HN (สำหรับบันทึกข้อมูล)
                          </label>
                          <input
                            type="text"
                            value={manualHn}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\s/g, '');
                              if (value.length <= 9) {
                                setManualHn(value);
                                setErrorMessage('');
                              }
                            }}
                            placeholder="กรอก HN"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-lg font-mono text-center"
                            maxLength={9}
                          />
                        </div>

                        {/* อัพโหลดรูปหลักฐาน */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            อัพโหลดรูปหลักฐาน <span className="text-red-500">*</span>
                            <span className="text-xs text-gray-500 font-normal ml-2">(รูปภาพที่แสดงว่าผู้รับบริการไม่ได้เอาบัตรประชาชนมาด้วย)</span>
                          </label>
                          
                          {!proofImagePreview ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                              <input
                                type="file"
                                id="proof-image-input"
                                accept="image/*"
                                onChange={handleProofImageUpload}
                                disabled={uploadingProof}
                                className="hidden"
                              />
                              <label
                                htmlFor="proof-image-input"
                                className="cursor-pointer flex flex-col items-center gap-2"
                              >
                                {uploadingProof ? (
                                  <>
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-500 border-t-transparent"></div>
                                    <span className="text-sm text-gray-600">กำลังอัพโหลด...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm text-gray-600">คลิกเพื่อเลือกรูปภาพ</span>
                                    <span className="text-xs text-gray-500">รองรับไฟล์รูปภาพทุกประเภท</span>
                                  </>
                                )}
                              </label>
                            </div>
                          ) : (
                            <div className="relative border border-gray-300 rounded-lg p-4">
                              <img
                                src={proofImagePreview}
                                alt="รูปหลักฐาน"
                                className="w-full h-auto max-h-64 object-contain rounded-lg"
                              />
                              <button
                                onClick={handleRemoveProofImage}
                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-colors"
                                title="ลบรูป"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleManualCheck}
                          disabled={manualCitizenId.length !== 13 || loadingRight || !proofImagePath || !manualHn.trim()}
                          className="w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          เช็คสิทธิ์ด้วยเลขบัตรที่กรอก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 mb-2">เกิดข้อผิดพลาด</h3>
                    <div className="text-red-700 text-sm whitespace-pre-line mb-3">{errorMessage}</div>
                    {errorMessage.includes('Firewall') && (
                      <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 mt-3">
                        <p className="text-xs text-gray-800 font-semibold mb-2">วิธีแก้ไข Firewall บน aaPanel:</p>
                        <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
                          <li>เข้า aaPanel → <strong>Security</strong> → <strong>Firewall</strong></li>
                          <li>ไปที่ <strong>Outbound Rules</strong></li>
                          <li>เพิ่ม Rule ใหม่: <strong>Protocol: TCP</strong>, <strong>Port: 443</strong>, <strong>Action: Allow</strong></li>
                          <li>บันทึกและ Restart server</li>
                        </ol>
                      </div>
                    )}
                    {errorMessage.includes('Network') && !errorMessage.includes('Firewall') && (
                      <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 mt-3">
                        <p className="text-xs text-gray-800 font-semibold mb-2">วิธีแก้ไข Network Error:</p>
                        <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                          <li>ตรวจสอบว่า Server สามารถเข้าถึง Internet ได้</li>
                          <li>ตรวจสอบ Firewall settings (ต้องอนุญาต HTTPS outbound)</li>
                          <li>ตรวจสอบ API URL และ Token กับเจ้าหน้าที่สปสช</li>
                          <li>ติดต่อผู้ดูแลระบบเพื่อตรวจสอบ Network configuration</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Success Popup Modal */}
            {showSuccessPopup && (
              <div className="fixed inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 animate-fade-in border border-green-100">
                  <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                      <svg className="h-10 w-10 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">บันทึกสำเร็จ</h3>
                    <p className="text-gray-600 mb-6">ข้อมูลถูกบันทึกเรียบร้อยแล้ว</p>
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card Data Display */}

            {cardData && (
              <div className="bg-white rounded-lg p-6 mb-6 border border-gray-200 shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700 rounded-lg p-2">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {cardData.first_name_th || cardData.last_name_th 
                          ? 'ข้อมูลจากบัตรประชาชน' 
                          : 'ข้อมูลเลขบัตรประชาชน'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {cardData.first_name_th || cardData.last_name_th 
                          ? 'อ่านข้อมูลจากบัตรสำเร็จ' 
                          : 'กรอกเลขบัตรด้วยตนเอง'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all text-sm font-semibold flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    ตรวจสอบใหม่
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs font-semibold text-gray-600 uppercase">เลขบัตรประชาชน</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 font-mono">{maskCitizenId(cardData.citizen_id)}</p>
                  </div>
                  {cardData.first_name_th || cardData.last_name_th ? (
                    <>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                          </svg>
                          <p className="text-xs font-semibold text-gray-600 uppercase">ชื่อ-สกุล</p>
                        </div>
                        <p className="text-base font-bold text-gray-900">{maskName(`${cardData.title_th}${cardData.first_name_th} ${cardData.last_name_th}`.trim())}</p>
                      </div>
                      {cardData.birth_date && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs font-semibold text-gray-600 uppercase">วันเกิด</p>
                          </div>
                          <p className="text-base font-semibold text-gray-900">{formatDate(cardData.birth_date)}</p>
                        </div>
                      )}
                      {cardData.expire_date && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs font-semibold text-gray-600 uppercase">บัตรหมดอายุ</p>
                          </div>
                          <p className="text-base font-semibold text-gray-900">{formatDate(cardData.expire_date)}</p>
                        </div>
                      )}
                      {cardData.address && (
                        <div className="md:col-span-2 bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <p className="text-xs font-semibold text-gray-600 uppercase">ที่อยู่</p>
                          </div>
                          <p className="text-sm font-semibold text-gray-900 leading-relaxed">{cardData.address}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 mb-1">หมายเหตุ</p>
                            <p className="text-sm text-gray-700">
                              กรอกเลขบัตรด้วยตนเอง - ข้อมูลชื่อ-นามสกุลจะแสดงจากผลการตรวจสอบสิทธิ์
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

        {/* Loading Right Data */}
        {loadingRight && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-slate-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">กำลังตรวจสอบสิทธิ์จาก สปสช</h3>
            <p className="text-gray-600">กรุณารอสักครู่</p>
          </div>
        )}

        {/* Right Data Display - รวมเป็น card เดียว */}
        {rightData && !loadingRight && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            {/* ส่วนที่ 1: ข้อมูลประชากร */}
            <h2 className="text-xl font-bold text-blue-700 mb-6">
              ข้อมูลประชากร ของ <span className="text-orange-500">สปสช.</span>
            </h2>
            
            <div className="space-y-3 mb-6">
                {/* Row 1 - เลขประจำตัวประชาชน */}
                <div className="flex border-b border-dotted border-gray-300 pb-2">
                  <div className="w-1/3 text-gray-600 font-medium">เลขประจำตัวประชาชน:</div>
                  <div className="flex-1 text-gray-900 font-mono">{maskCitizenId(rightData.citizen_id)}</div>
                </div>
                
                {/* Row 2 - เดือนปีเกิด (ใช้จาก API สปสช.) */}
                {rightData.birth_date && (
                  <div className="flex border-b border-dotted border-gray-300 pb-2">
                    <div className="w-1/3 text-gray-600 font-medium">เดือนปีเกิด:</div>
                    <div className="flex-1 text-gray-900">{formatMonthYear(rightData.birth_date)}</div>
                  </div>
                )}
                
                {/* Row 3 - ชื่อ-สกุล (แสดงแค่ชื่อ-สกุล ไม่มีคำนำหน้า) */}
                <div className="flex border-b border-dotted border-gray-300 pb-2">
                  <div className="w-1/3 text-gray-600 font-medium">ชื่อ-สกุล:</div>
                  <div className="flex-1 text-gray-900 font-semibold">{maskName(rightData.patient_name)}</div>
                </div>
                
                {/* Row 4 - เพศ (ใช้จาก API สปสช.) */}
                {rightData.sex && (
                  <div className="flex border-b border-dotted border-gray-300 pb-2">
                    <div className="w-1/3 text-gray-600 font-medium">เพศ:</div>
                    <div className="flex-1 text-gray-900">
                      {rightData.sex === '1' || rightData.sex === 'M' || rightData.sex === 'ชาย' ? 'ชาย' : 
                       rightData.sex === '2' || rightData.sex === 'F' || rightData.sex === 'หญิง' ? 'หญิง' : 
                       rightData.sex || '-'}
                    </div>
                  </div>
                )}
                
                {/* Row 6 - ข้อมูล ณ วันที่ */}
                <div className="flex border-b border-dotted border-gray-300 pb-2">
                  <div className="w-1/3 text-gray-600 font-medium">ข้อมูล ณ วันที่:</div>
                  <div className="flex-1 text-gray-900">
                    {new Date().toLocaleDateString('th-TH', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })} {new Date().toLocaleTimeString('th-TH', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} น.
                  </div>
                </div>
              </div>
              
            {/* หัวข้อข้อมูลตรวจสอบสิทธิ ณ ปัจจุบัน */}
            <div className="mb-8 pt-4 border-t border-gray-200">
              <h3 className="text-xl font-bold text-blue-700">
                ข้อมูลตรวจสอบสิทธิ ณ ปัจจุบัน
              </h3>
            </div>

            {/* ส่วนที่ 2: สิทธิใช้เบิก */}
            <div id="rights-section" className="pt-6 border-t border-gray-200">
              <h2 className="text-xl font-bold text-blue-700 mb-6">สิทธิใช้เบิก</h2>
              
              <div className="space-y-3 mb-6">
                {/* Row 1 - สิทธิที่ใช้เบิก */}
                <div className="flex border-b border-dotted border-gray-300 pb-2">
                  <div className="w-1/3 text-gray-600 font-medium">สิทธิที่ใช้เบิก:</div>
                  <div className="flex-1 text-gray-900 font-semibold">{rightData.main_right.name}</div>
                </div>
                
                {/* Row 2 - ประเภทสิทธิย่อย (แสดงถ้ามี) */}
                {(rightData as any).sub_inscl_name && (
                  <div className="flex border-b border-dotted border-gray-300 pb-2">
                    <div className="w-1/3 text-gray-600 font-medium">ประเภทสิทธิย่อย:</div>
                    <div className="flex-1 text-gray-900">{(rightData as any).sub_inscl_name}</div>
                  </div>
                )}
                
                {/* Row 3 - จังหวัด (ใช้จาก API สปสช.) */}
                {rightData.province_name && (
                  <div className="flex border-b border-dotted border-gray-300 pb-2">
                    <div className="w-1/3 text-gray-600 font-medium">จังหวัดที่ลงทะเบียนรักษา:</div>
                    <div className="flex-1 text-gray-900">{rightData.province_name}</div>
                  </div>
                )}
                
                {/* Row 4 - หน่วยบริการปฐมภูมิ (แสดงถ้ามี) */}
                {rightData.hospitals?.hospSubNew && (
                  <div className="flex border-b border-dotted border-gray-300 pb-2">
                    <div className="w-1/3 text-gray-600 font-medium">หน่วยบริการปฐมภูมิ:</div>
                    <div className="flex-1 text-gray-900">
                      {rightData.hospitals.hospSubNew.hname} ({rightData.hospitals.hospSubNew.hcode})
                    </div>
                  </div>
                )}
                
                {/* Row 5 - หน่วยบริการที่รับการส่งต่อ (แสดงถ้ามี) */}
                {rightData.hospitals?.hospMainOpNew && (
                  <div className="flex border-b border-dotted border-gray-300 pb-2">
                    <div className="w-1/3 text-gray-600 font-medium">หน่วยบริการที่รับการส่งต่อ:</div>
                    <div className="flex-1 text-gray-900">
                      {rightData.hospitals.hospMainOpNew.hname} ({rightData.hospitals.hospMainOpNew.hcode})
                    </div>
                  </div>
                )}
                
                {/* Row 6 - Model (แสดงถ้ามี) */}
                {(rightData as any).paid_model && (
                  <div className="flex border-b border-dotted border-gray-300 pb-2">
                    <div className="w-1/3 text-gray-600 font-medium">Model:</div>
                    <div className="flex-1 text-gray-900">{(rightData as any).paid_model}</div>
                  </div>
                )}
                
                {/* Row 7 - หน่วยบริการประจำ */}
                {rightData.hospitals?.hospMainNew && (
                  <div className="flex border-b border-dotted border-gray-300 pb-2">
                    <div className="w-1/3 text-gray-600 font-medium">หน่วยบริการประจำ:</div>
                    <div className="flex-1 text-gray-900">
                      {rightData.hospitals.hospMainNew.hname} ({rightData.hospitals.hospMainNew.hcode})
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <button 
                onClick={saveAuthenCode}
                disabled={saving || (!cardData && !rightData)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2 ${
                  saving || (!cardData && !rightData)
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : saveSuccess
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-slate-700 text-white hover:bg-slate-600'
                }`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    กำลังบันทึก...
                  </>
                ) : saveSuccess ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    บันทึกสำเร็จ
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                    </svg>
                    บันทึกข้อมูล
                  </>
                )}
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                </svg>
                พิมพ์ใบรับรองสิทธิ์
              </button>
              <button 
                onClick={handleReset}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                ตรวจสอบคนใหม่
              </button>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-slate-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-gray-800 text-base mb-2">ข้อมูลเกี่ยวกับระบบ</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• ระบบตรวจสอบสิทธิ์การรักษาแบบ Real-time จาก สปสช</li>
                <li>• ตรวจสอบสิทธิ์การรักษาพยาบาลแบบ Real-time จาก สปสช</li>
                <li>• รองรับสิทธิ์หลักประกันสุขภาพถ้วนหน้า (UCS), ประกันสังคม (SSS), ข้าราชการ (OFC)</li>
                <li>• ข้อมูลถูกเข้ารหัสและปลอดภัยตามมาตรฐาน PDPA</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
