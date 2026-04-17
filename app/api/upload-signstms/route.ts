import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';
import { parseStringPromise } from 'xml2js';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 400 });
    }

    // ตรวจสอบว่าเป็นไฟล์ SIGNSTMS หรือไม่
    if (!file.name.includes('SIGNSTMS')) {
      return NextResponse.json({ error: 'ไฟล์นี้ไม่ใช่ไฟล์ SIGNSTMS กรุณาเลือกไฟล์ที่ถูกต้อง' }, { status: 400 });
    }

    const xmlContent = await file.text();
    const result = await parseStringPromise(xmlContent, { explicitArray: false });
    
    const db = await getDB();
    
    // ดึง STMdoc
    const STMdoc = result.STMLIST?.stmdat?.stmno || '';
    if (!STMdoc) {
      return NextResponse.json({ error: 'ไม่พบ STMdoc ในไฟล์' }, { status: 400 });
    }
    // ตรวจสอบซ้ำ
    const [existRows]: any[] = await db.query('SELECT id FROM signstms WHERE stmno = ?', [STMdoc]);
    if (existRows.length > 0) {
      return NextResponse.json({ error: `ไฟล์ STMdoc นี้ (${STMdoc}) ถูกอัปโหลดไปแล้ว` }, { status: 409 });
    }
    
    // ตรวจสอบว่ามีข้อมูล Bills หรือไม่
    const bills = result.STMLIST?.Bills?.Bill || [];
    const billsArray = Array.isArray(bills) ? bills : [bills];
    
    let insertedCount = 0;
    
    for (const bill of billsArray) {
      if (bill) {
        await db.query(`
          INSERT INTO signstms (
            period, stmno, dateDue, hcode, hmain, hproc, hn, an, pid, name,
            dateadm, datedsc, ft, bf, drg, rw, adjrw, due, ptype, rwtype, mtype, rptype,
            rid, pstm, careas, sc, ed, Reimb, Nreimb, Copay, CP, PP
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          result.STMLIST?.stmdat?.period?._ || result.STMLIST?.stmdat?.period || '',
          STMdoc,
          result.STMLIST?.stmdat?.dateDue?._ || result.STMLIST?.stmdat?.dateDue || '',
          bill.hcode?._ || bill.hcode || '',
          bill.hmain?._ || bill.hmain || '',
          bill.hproc?._ || bill.hproc || '',
          bill.hn?._ || bill.hn || '',
          bill.an?._ || bill.an || '',
          bill.pid?._ || bill.pid || '',
          bill.name?._ || bill.name || '',
          bill.dateadm?._ || bill.dateadm || '',
          bill.datedsc?._ || bill.datedsc || '',
          bill.ft?._ || bill.ft || '',
          bill.bf?._ || bill.bf || '',
          bill.drg?._ || bill.drg || '',
          parseFloat(bill.rw?._ || bill.rw || 0) || 0,
          parseFloat(bill.adjrw?._ || bill.adjrw || 0) || 0,
          parseInt(bill.due?._ || bill.due || 0) || 0,
          parseInt(bill.ptype?._ || bill.ptype || 0) || 0,
          bill.rwtype?._ || bill.rwtype || '',
          bill.mtype?._ || bill.mtype || '',
          bill.rptype?._ || bill.rptype || '',
          bill.rid?._ || bill.rid || '',
          parseInt(bill.pstm?._ || bill.pstm || 0) || 0,
          bill.careas?._ || bill.careas || '',
          parseInt(bill.sc?._ || bill.sc || 0) || 0,
          parseInt(bill.ed?._ || bill.ed || 0) || 0,
          parseFloat(bill.Reimb?._ || bill.Reimb || 0) || 0,
          parseFloat(bill.Nreimb?._ || bill.Nreimb || 0) || 0,
          parseFloat(bill.Copay?._ || bill.Copay || 0) || 0,
          bill.CP?._ || bill.CP || '',
          bill.PP?._ || bill.PP || ''
        ]);
        insertedCount++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `อัปโหลดข้อมูล SIGNSTMS สำเร็จ ${insertedCount} รายการ`,
      count: insertedCount
    });
    
  } catch (error) {
    console.error('Error uploading SIGNSTMS:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัปโหลดข้อมูล' 
    }, { status: 500 });
  }
} 