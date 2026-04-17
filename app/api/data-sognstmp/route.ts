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
      'SELECT COUNT(*) as total FROM sognstmp s WHERE s.hproc = ?' : 
      'SELECT COUNT(*) as total FROM sognstmp';
    const countParams = hproc ? [hproc] : [];
    const [countRows]: any[] = await db.query(countQuery, countParams);
    const total = countRows[0]?.total || 0;
    
    // ดึงข้อมูลตามหน้า
    const [data] = await db.query(`
      SELECT 
        s.id, s.STMdoc, s.dateStart, s.dateEnd, s.dateDue, s.dateIssue, s.station,
        s.hmain, s.hproc, s.hcare, s.hn, s.pid, s.name, s.invno, s.bf, s.pcode, s.care,
        s.payplan, s.bp, s.dttran, s.copay, s.cfh, s.total, s.ExtP, s.rid, s.created_at,
        h.name as hosp_name
      FROM sognstmp s
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
    console.error('Error fetching SOGNSTMP data:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' 
    }, { status: 500 });
  }
} 