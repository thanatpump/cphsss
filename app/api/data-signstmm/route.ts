import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const hproc = searchParams.get('hproc');
    const summary = searchParams.get('summary');
    const summaryAll = searchParams.get('summaryAll');
    const offset = (page - 1) * limit;
    
    const db = await getDB();
    
    // ถ้าเป็น summaryAll mode
    if (summaryAll === '1') {
      // ตรวจสอบว่ามีการส่ง startDate และ endDate มาไหม
      const providedStartDate = searchParams.get('startDate');
      const providedEndDate = searchParams.get('endDate');
      
      let startDate: string;
      let endDate: string;
      let startYear: number;
      let currentYear: number;
      let currentMonth: number;
      
      if (providedStartDate && providedEndDate) {
        // ใช้วันที่ที่ผู้ใช้เลือก
        startDate = providedStartDate;
        endDate = providedEndDate;
        const startDateObj = new Date(providedStartDate);
        startYear = startDateObj.getFullYear();
        currentYear = startDateObj.getFullYear();
        currentMonth = startDateObj.getMonth() + 1;
      } else {
      // คำนวณช่วงเดือน ต.ค. ปีที่แล้ว ถึงเดือนปัจจุบัน
      const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth() + 1; // 1-12
        startYear = currentYear;
      if (currentMonth < 10) startYear = currentYear - 1;
      const startMonth = 10;
        startDate = `${startYear}-10-01`;
        endDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-31`;
      }
      // ฟิลเตอร์ประเภทหน่วยบริการ
      const type = searchParams.get('type');
      let typeFilter = '';
      if (type === 'hospital') typeFilter = 'AND h.hospital_type_id IN ("5","6","7")';
      else if (type === 'rps') typeFilter = 'AND h.hospital_type_id IN ("18","19")';
      else if (type === 'rps_moph') typeFilter = 'AND h.hospital_type_id = "18"';
      else if (type === 'rps_local') typeFilter = 'AND h.hospital_type_id = "19"';
      // ดึงรายชื่ออำเภอทั้งหมด
      const [ampRows]: any[] = await db.query('SELECT DISTINCT amp_name FROM hospcode WHERE chwpart = "36" AND amp_name IS NOT NULL');
      // ดึง summary STMM รายเดือนของทุกอำเภอ
      const [summaryRows]: any[] = await db.query(
        `SELECT h.amp_name, DATE_FORMAT(s.dateadm, '%Y-%m') AS month, COUNT(*) AS patient_count
         FROM signstmm s
         LEFT JOIN hospcode h ON s.hproc = h.hospcode_5_digit
         WHERE s.dateadm >= ? AND s.dateadm <= ? AND h.chwpart = "36" AND h.amp_name IS NOT NULL ${typeFilter}
         GROUP BY h.amp_name, DATE_FORMAT(s.dateadm, '%Y-%m')`,
        [startDate, endDate]
      );
      // รวมข้อมูล
      const ampMap: Record<string, { summary: Record<string, number> }> = {};
      for (const amp of ampRows) {
        ampMap[amp.amp_name] = { summary: {} };
      }
      for (const row of summaryRows) {
        if (ampMap[row.amp_name]) {
          ampMap[row.amp_name].summary[row.month] = row.patient_count;
        }
      }
      // ดึงรายชื่อโรงพยาบาลทั้งหมด (สำหรับ drill down)
      const [hospRows]: any[] = await db.query('SELECT hospcode_5_digit, name, amp_name, hospital_type_id FROM hospcode WHERE chwpart = "36"');
      // ดึง summary STMM รายเดือนของทุกโรงพยาบาล
      const [hospSummaryRows]: any[] = await db.query(
        `SELECT hproc, DATE_FORMAT(s.dateadm, '%Y-%m') AS month, COUNT(*) AS patient_count
         FROM signstmm s
         LEFT JOIN hospcode h ON s.hproc = h.hospcode_5_digit
         WHERE s.dateadm >= ? AND s.dateadm <= ? AND h.chwpart = "36" ${typeFilter}
         GROUP BY hproc, DATE_FORMAT(s.dateadm, '%Y-%m')`,
        [startDate, endDate]
      );
      const hospMap: Record<string, { name: string, amp_name: string, hospital_type_id: string, summary: Record<string, number> }> = {};
      for (const hosp of hospRows) {
        hospMap[hosp.hospcode_5_digit] = { name: hosp.name, amp_name: hosp.amp_name, hospital_type_id: hosp.hospital_type_id, summary: {} };
      }
      for (const row of hospSummaryRows) {
        if (hospMap[row.hproc]) {
          hospMap[row.hproc].summary[row.month] = row.patient_count;
        }
      }
      return NextResponse.json({ 
        ampSummary: ampMap, 
        hospSummary: hospMap, 
        startYear: startYear || (new Date().getFullYear() - 1), 
        currentYear: currentYear || new Date().getFullYear(), 
        currentMonth: currentMonth || new Date().getMonth() + 1 
      });
    }

    // ถ้าเป็น summary mode
    if (summary === '1' && hproc) {
      // สรุปจำนวนคนไข้รายเดือน (ดูจาก dateadm)
      const [summaryRows]: any[] = await db.query(
        `SELECT DATE_FORMAT(dateadm, '%Y-%m') AS month, COUNT(*) AS patient_count
         FROM signstmm
         WHERE hproc = ?
         GROUP BY month
         ORDER BY month DESC`,
        [hproc]
      );
      return NextResponse.json({ summary: summaryRows });
    }

    // สร้าง WHERE clause สำหรับ filter hproc
    const whereClause = hproc ? 'WHERE s.hproc = ?' : '';
    const params = hproc ? [hproc, limit, offset] : [limit, offset];
    
    // นับจำนวนรายการทั้งหมด
    const countQuery = hproc ? 
      'SELECT COUNT(*) as total FROM signstmm s WHERE s.hproc = ?' : 
      'SELECT COUNT(*) as total FROM signstmm';
    const countParams = hproc ? [hproc] : [];
    const [countRows]: any[] = await db.query(countQuery, countParams);
    const total = countRows[0]?.total || 0;
    
    // ดึงข้อมูลตามหน้า
    const [data] = await db.query(`
      SELECT 
        s.id, s.period, s.stmno, s.dateDue, s.hmain, s.hcode, s.hproc, s.hn, s.an, s.pid, s.name,
        s.dateadm, s.datedsc, s.ft, s.bf, s.drg, s.rw, s.adjrw, s.due, s.ptype, s.rwtype, s.rptype,
        s.rid, s.pstm, s.careas, s.sc, s.ed, s.Reimb, s.Nreimb, s.Copay, s.CP, s.PP, s.created_at,
        h.name as hosp_name
      FROM signstmm s
      LEFT JOIN hospcode h ON s.hproc = h.hospcode_5_digit
      ${whereClause}
      ORDER BY s.id DESC 
      LIMIT ? OFFSET ?
    `, params);
    
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching SIGNSTMM data:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
    }, { status: 500 });
  }
} 