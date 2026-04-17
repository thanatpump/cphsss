import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '../../../lib/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const offset = (page - 1) * limit;

    const db = await getDB();

    // สร้างเงื่อนไขการค้นหา
    let whereClause = '';
    let params: any[] = [];

    if (startDate && endDate) {
      whereClause = 'WHERE h.dateadm >= ? AND h.dateadm <= ?';
      params = [startDate, endDate];
    }

    // นับจำนวนข้อมูลทั้งหมด
    const [countRows]: any[] = await db.query(`
      SELECT COUNT(*) as total
      FROM patient_bills h
      ${whereClause}
    `, params);
    const total = countRows[0]?.total || 0;

    // ดึงข้อมูลผู้ป่วย
    const [patients] = await db.query(`
      SELECT 
        h.id,
        h.hn,
        h.an,
        h.pid,
        h.name,
        h.dateadm,
        h.datedsc,
        h.ft,
        h.bf,
        h.drg,
        h.rw,
        h.adjrw,
        h.due,
        h.ptype,
        h.rwtype,
        h.rptype,
        h.rid,
        h.pstm,
        h.careas,
        h.sc,
        h.ed,
        h.reimb,
        h.nreimb,
        h.copay,
        h.cp,
        h.pp,
        h.ods,
        h.spcmsg,
        h.created_at,
        hosp.hcode as hospital_code,
        hosp.hname as hospital_name,
        hosp.period,
        hosp.stmno
      FROM patient_bills h
      LEFT JOIN hospital_data hosp ON h.hospital_data_id = hosp.id
      ${whereClause}
      ORDER BY h.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // คำนวณ pagination
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        patients,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch data',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 