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

    // ตรวจสอบว่าเป็นไฟล์ SOGNSTMP หรือไม่
    if (!file.name.includes('SOGNSTMP')) {
      return NextResponse.json({ error: 'ไฟล์นี้ไม่ใช่ไฟล์ SOGNSTMP กรุณาเลือกไฟล์ที่ถูกต้อง' }, { status: 400 });
    }

    const xmlContent = await file.text();
    const result = await parseStringPromise(xmlContent, { explicitArray: false });
    
    const db = await getDB();
    
    // ดึง STMdoc
    const STMdoc = result.STMSTMP?.STMdoc?._ || result.STMSTMP?.STMdoc || '';
    if (!STMdoc) {
      return NextResponse.json({ error: 'ไม่พบ STMdoc ในไฟล์' }, { status: 400 });
    }
    // ตรวจสอบซ้ำ
    const [existRows]: any[] = await db.query('SELECT id FROM sognstmp WHERE STMdoc = ?', [STMdoc]);
    if (existRows.length > 0) {
      return NextResponse.json({ error: `ไฟล์ STMdoc นี้ (${STMdoc}) ถูกอัปโหลดไปแล้ว` }, { status: 409 });
    }
    
    // ดึง TBill จาก HG.TBill โดยตรง
    const HG = result.STMSTMP?.TBills?.ST?.HG;
    let tbillsArray = [];
    if (HG && HG.TBill) {
      tbillsArray = Array.isArray(HG.TBill) ? HG.TBill : [HG.TBill];
    }
    
    let insertedCount = 0;
    for (const bill of tbillsArray) {
      if (bill) {
        await db.query(`
          INSERT INTO sognstmp (
            STMdoc, dateStart, dateEnd, dateDue, dateIssue, station,
            hmain, hproc, hcare, hn, pid, name, invno, bf, pcode, care,
            payplan, bp, dttran, copay, cfh, total, ExtP, rid
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          STMdoc,
          result.STMSTMP?.dateStart?._ || result.STMSTMP?.dateStart || '',
          result.STMSTMP?.dateEnd?._ || result.STMSTMP?.dateEnd || '',
          result.STMSTMP?.dateDue?._ || result.STMSTMP?.dateDue || '',
          result.STMSTMP?.dateIssue?._ || result.STMSTMP?.dateIssue || '',
          bill.station?._ || bill.station || '',
          bill.hmain?._ || bill.hmain || '',
          bill.hproc?._ || bill.hproc || '',
          bill.hcare?._ || bill.hcare || '',
          bill.hn?._ || bill.hn || '',
          bill.pid?._ || bill.pid || '',
          bill.name?._ || bill.name || '',
          bill.invno?._ || bill.invno || '',
          bill.bf?._ || bill.bf || '',
          bill.pcode?._ || bill.pcode || '',
          bill.care?._ || bill.care || '',
          bill.payplan?._ || bill.payplan || '',
          bill.bp?._ || bill.bp || '',
          bill.dttran?._ || bill.dttran || '',
          bill.copay?._ || bill.copay || '',
          bill.cfh?._ || bill.cfh || '',
          parseFloat(bill.total?._ || bill.total || 0) || 0,
          bill.ExtP?._ || bill.ExtP || '',
          bill.rid?._ || bill.rid || ''
        ]);
        insertedCount++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `อัปโหลดข้อมูล SOGNSTMP สำเร็จ ${insertedCount} รายการ`,
      count: insertedCount
    });
    
  } catch (error) {
    console.error('Error uploading SOGNSTMP:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัปโหลดข้อมูล' 
    }, { status: 500 });
  }
} 