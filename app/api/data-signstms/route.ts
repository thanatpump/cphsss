import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const hproc = searchParams.get('hproc');
    const offset = (page - 1) * limit;
    
    const db = await getDB();
    
    // สร้าง WHERE clause สำหรับ filter hproc
    const whereClause = hproc ? 'WHERE s.hproc = ?' : '';
    const params = hproc ? [hproc, limit, offset] : [limit, offset];
    
    // นับจำนวนรายการทั้งหมด
    const countQuery = hproc ? 
      'SELECT COUNT(*) as total FROM signstms s WHERE s.hproc = ?' : 
      'SELECT COUNT(*) as total FROM signstms';
    const countParams = hproc ? [hproc] : [];
    const [countRows]: any[] = await db.query(countQuery, countParams);
    const total = countRows[0]?.total || 0;
    
    // ดึงข้อมูลตามหน้า
    const [data] = await db.query(`
      SELECT 
        s.id, s.period, s.stmno, s.dateDue, s.hcode, s.hmain, s.hproc, s.hn, s.an, s.pid, s.name,
        s.dateadm, s.datedsc, s.ft, s.bf, s.drg, s.rw, s.adjrw, s.due, s.ptype, s.rwtype, s.mtype, s.rptype,
        s.rid, s.pstm, s.careas, s.sc, s.ed, s.Reimb, s.Nreimb, s.Copay, s.CP, s.PP, s.created_at,
        h.name as hosp_name
      FROM signstms s
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
    console.error('Error fetching SIGNSTMS data:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
    }, { status: 500 });
  }
} 