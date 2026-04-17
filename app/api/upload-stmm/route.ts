import { NextRequest, NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';
import { getDB } from '../../../lib/database';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.xml')) {
      return NextResponse.json({ error: 'Please upload XML file only' }, { status: 400 });
    }

    // แปลง File เป็น Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const xml = buffer.toString('utf8');

    // Parse XML
    const parsedData = await parseStringPromise(xml);
    
    // ตรวจสอบว่าเป็นไฟล์ STMM หรือไม่
    if (!parsedData.STMLIST) {
      return NextResponse.json({ error: 'Invalid STMM XML file format' }, { status: 400 });
    }
    
    // เริ่มต้นฐานข้อมูล
    const db = await getDB();
    
    // เริ่ม transaction
    await db.query('START TRANSACTION');
    
    try {
      // บันทึกข้อมูลโรงพยาบาล
      const stmdat = parsedData.STMLIST.stmdat[0];
      const [hospitalResult]: any[] = await db.query(`
        INSERT INTO hospital_data (stmAccountID, hcode, hname, period, period_desc, stmno, dateDue, dateDue_desc, cases, adjrw)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        parsedData.STMLIST.stmAccountID[0],
        stmdat.hcode[0],
        stmdat.hname[0],
        stmdat.period[0],
        stmdat.period[0].$.desc || '',
        stmdat.stmno[0],
        stmdat.dateDue[0],
        '',
        parseInt(stmdat.cases[0]),
        parseFloat(stmdat.adjrw[0])
      ]);
      
      const hospitalId = hospitalResult.insertId;
      
      // บันทึกข้อมูลสรุป (SUMDats)
      if (parsedData.STMLIST.SUMDats && parsedData.STMLIST.SUMDats[0].SUMdat) {
        for (const sumdat of parsedData.STMLIST.SUMDats[0].SUMdat) {
          const [summaryResult]: any[] = await db.query(`
            INSERT INTO summary_data (hospital_data_id, code, sum_id, mcode, desc, msg, case_count, adjrw, hdcls)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            hospitalId,
            sumdat.$.code,
            sumdat.$.ID,
            sumdat.$.mcode,
            sumdat.$.desc || '',
            sumdat.$.msg || '',
            parseFloat(sumdat.$.case),
            parseFloat(sumdat.$.adjrw),
            parseInt(sumdat.$.hdcls)
          ]);
          
          const summaryId = summaryResult.insertId;
          
          // บันทึกข้อมูลรายละเอียดสรุป (Dat)
          if (sumdat.Dat) {
            for (const dat of sumdat.Dat) {
              await db.query(`
                INSERT INTO summary_details (summary_data_id, mcode, rwcode, case_count, adjrw)
                VALUES (?, ?, ?, ?, ?)
              `, [
                summaryId,
                dat.$.mcode,
                dat.$.rwcode,
                parseInt(dat.$.case),
                parseFloat(dat.$.adjrw)
              ]);
            }
          }
        }
      }
      
      // บันทึกข้อมูลผู้ป่วย (Bills)
      if (parsedData.STMLIST.Bills && parsedData.STMLIST.Bills[0].Bill) {
        for (const bill of parsedData.STMLIST.Bills[0].Bill) {
          await db.query(`
            INSERT INTO patient_bills (
              hospital_data_id, hmain, hcode, hproc, hn, an, pid, name,
              dateadm, datedsc, ft, bf, drg, rw, adjrw, due, ptype,
              rwtype, rptype, rid, pstm, careas, sc, ed, reimb, nreimb, copay, cp, pp, ods, spcmsg
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            hospitalId,
            bill.hmain[0],
            bill.hcode[0],
            bill.hproc[0],
            bill.hn[0],
            bill.an[0],
            bill.pid[0],
            bill.name[0],
            bill.dateadm[0],
            bill.datedsc[0],
            bill.ft[0],
            bill.bf[0],
            bill.drg[0],
            parseFloat(bill.rw[0]),
            parseFloat(bill.adjrw[0]),
            parseInt(bill.due[0]),
            parseInt(bill.ptype[0]),
            bill.rwtype[0],
            bill.rptype[0],
            bill.rid[0],
            parseInt(bill.pstm[0]),
            bill.careas[0],
            parseInt(bill.sc[0]),
            parseInt(bill.ed[0]),
            parseFloat(bill.Reimb[0]),
            parseFloat(bill.Nreimb[0]),
            parseFloat(bill.Copay[0]),
            bill.CP[0],
            bill.PP[0],
            bill.ODS[0] || '',
            bill.spcmsg[0] || ''
          ]);
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      return NextResponse.json({ 
        success: true, 
        message: 'STMM XML data imported successfully',
        hospitalId: hospitalId,
        summaryCount: parsedData.STMLIST.SUMDats ? parsedData.STMLIST.SUMDats[0].SUMdat.length : 0,
        billCount: parsedData.STMLIST.Bills ? parsedData.STMLIST.Bills[0].Bill.length : 0
      });
      
    } catch (error) {
      // Rollback ถ้าเกิด error
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error processing STMM XML:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัปโหลด',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 