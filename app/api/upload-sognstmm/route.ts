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

    // ตรวจสอบว่าเป็นไฟล์ SOGNSTMM หรือไม่
    if (!file.name.includes('SOGNSTMM')) {
      return NextResponse.json({ error: 'ไฟล์นี้ไม่ใช่ไฟล์ SOGNSTMM กรุณาเลือกไฟล์ที่ถูกต้อง' }, { status: 400 });
    }

    const xmlContent = await file.text();
    const result = await parseStringPromise(xmlContent, { explicitArray: false });
    
    const db = await getDB();
    
    // ดึง STMdoc
    const STMdoc = result.STMSTMM?.STMdoc?._ || result.STMSTMM?.STMdoc || '';
    if (!STMdoc) {
      return NextResponse.json({ error: 'ไม่พบ STMdoc ในไฟล์' }, { status: 400 });
    }
    // ตรวจสอบซ้ำ
    const [existRows]: any[] = await db.query('SELECT id FROM sognstmm WHERE STMdoc = ?', [STMdoc]);
    if (existRows.length > 0) {
      return NextResponse.json({ error: `ไฟล์ STMdoc นี้ (${STMdoc}) ถูกอัปโหลดไปแล้ว` }, { status: 409 });
    }
    
    // ตรวจสอบว่ามีข้อมูล TBills หรือไม่
    const HG = result.STMSTMM?.TBills?.ST?.HG;
    let tbillsArray: any[] = [];
    
    if (HG) {
      if (Array.isArray(HG)) {
        // ถ้า HG เป็น array
        HG.forEach(hg => {
          if (hg.TBill) {
            const bills = Array.isArray(hg.TBill) ? hg.TBill : [hg.TBill];
            tbillsArray.push(...bills);
          }
        });
      } else if (typeof HG === 'object') {
        // ถ้า HG เป็น object ที่มี key เป็นตัวเลข
        Object.values(HG).forEach(val => {
          if ((val as any)?.TBill) {
            const bills = Array.isArray((val as any).TBill) ? (val as any).TBill : [(val as any).TBill];
            tbillsArray.push(...bills);
          }
        });
      }
    }
    
    let insertedCount = 0;
    
    for (const bill of tbillsArray) {
      if (bill) {
        await db.query(`
          INSERT INTO sognstmm (
            STMdoc, dateStart, dateEnd, dateDue, dateIssue, station,
            hmain, hproc, hcare, hn, pid, name, bf, pcode, care,
            payplan, bp, invno, dttran, copay, cfh, total, rid
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          STMdoc,
          result.STMSTMM?.dateStart?._ || result.STMSTMM?.dateStart || '',
          result.STMSTMM?.dateEnd?._ || result.STMSTMM?.dateEnd || '',
          result.STMSTMM?.dateDue?._ || result.STMSTMM?.dateDue || '',
          result.STMSTMM?.dateIssue?._ || result.STMSTMM?.dateIssue || '',
          bill.station?._ || bill.station || '',
          bill.hmain?._ || bill.hmain || '',
          bill.hproc?._ || bill.hproc || '',
          bill.hcare?._ || bill.hcare || '',
          bill.hn?._ || bill.hn || '',
          bill.pid?._ || bill.pid || '',
          bill.name?._ || bill.name || '',
          bill.bf?._ || bill.bf || '',
          bill.pcode?._ || bill.pcode || '',
          bill.care?._ || bill.care || '',
          bill.payplan?._ || bill.payplan || '',
          bill.bp?._ || bill.bp || '',
          bill.invno?._ || bill.invno || '',
          bill.dttran?._ || bill.dttran || '',
          bill.copay?._ || bill.copay || '',
          bill.cfh?._ || bill.cfh || '',
          parseFloat(bill.total?._ || bill.total || 0) || 0,
          bill.rid?._ || bill.rid || ''
        ]);
        insertedCount++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `อัปโหลดข้อมูล SOGNSTMM สำเร็จ ${insertedCount} รายการ`,
      count: insertedCount
    });
    
  } catch (error) {
    console.error('Error uploading SOGNSTMM:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัปโหลดข้อมูล' 
    }, { status: 500 });
  }
} 