import { NextRequest, NextResponse } from 'next/server';

// API สำหรับทดสอบการเชื่อมต่อกับ NHSO
export async function GET(request: NextRequest) {
  const token = process.env.NHSO_TOKEN;
  const apiUrl = process.env.NHSO_API_URL;

  // ดึง citizen_id จาก query parameter
  const searchParams = request.nextUrl.searchParams;
  const citizen_id = searchParams.get('pid') || '1234567890123';
  const hcode = searchParams.get('hcode') || '11001';

  console.log('🧪 ทดสอบการเชื่อมต่อ NHSO API');
  console.log('Token:', token ? `${token.substring(0, 10)}...` : 'ไม่พบ');
  console.log('API URL:', apiUrl);
  console.log('PID:', citizen_id);
  console.log('HCODE:', hcode);

  if (!token) {
    return NextResponse.json({
      success: false,
      error: 'ไม่พบ NHSO_TOKEN ใน environment variables',
      hint: 'ตรวจสอบไฟล์ .env.local'
    });
  }

  try {
    const requestBody = {
      pid: citizen_id,
      hcode: hcode,
      correlationId: `TEST-${Date.now()}`,
      date_visit: new Date().toISOString().split('T')[0],
    };

    console.log('📤 Request Body:', requestBody);

    // ลอง 2 รูปแบบการส่ง header
    const testCases: Array<{
      name: string;
      headers: Record<string, string>;
    }> = [
      {
        name: 'Test 1: ใช้ token header',
        headers: {
          'Content-Type': 'application/json',
          'token': token,
        }
      },
      {
        name: 'Test 2: ใช้ Authorization Bearer',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      }
    ];

    const results: any[] = [];

    for (const testCase of testCases) {
      console.log(`\n🔬 ${testCase.name}`);
      
      try {
        const response = await fetch(apiUrl!, {
          method: 'POST',
          headers: testCase.headers,
          body: JSON.stringify(requestBody),
        });

        const responseText = await response.text();
        let responseData;
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        results.push({
          test: testCase.name,
          status: response.status,
          statusText: response.statusText,
          success: response.ok,
          response: responseData,
          headers: Object.fromEntries(response.headers.entries())
        });

        console.log('Status:', response.status);
        console.log('Response:', responseData);
        
      } catch (error) {
        results.push({
          test: testCase.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Error:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ทดสอบเสร็จสิ้น',
      config: {
        token_exists: !!token,
        token_preview: token ? `${token.substring(0, 10)}...` : null,
        api_url: apiUrl,
        test_pid: citizen_id,
        test_hcode: hcode,
      },
      results: results
    });

  } catch (error) {
    console.error('❌ Test Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    });
  }
}

