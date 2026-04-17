import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
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
    
    // เริ่มต้นฐานข้อมูล
    const db = await getDB();
    
    // เริ่ม transaction
    await db.query('START TRANSACTION');
    
    try {
      // บันทึกข้อมูลโรงพยาบาล
      const stmdat = parsedData.ADJLIST.stmdat[0];
      const [hospitalResult]: any[] = await db.query(`
        INSERT INTO hospital_data (stmAccountID, hcode, hname, period, period_desc, stmno, dateDue, dateDue_desc, cases)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        parsedData.ADJLIST.stmAccountID[0],
        stmdat.hcode[0],
        stmdat.hname[0],
        stmdat.period[0],
                    stmdat.period[0].$?.desc || '',
            stmdat.stmno[0],
            stmdat.dateDue[0],
            stmdat.dateDue[0].$?.desc || '',
        parseInt(stmdat.cases[0])
      ]);
      
      const hospitalId = hospitalResult.insertId;
      
      // บันทึกข้อมูลผู้ป่วย (ABills)
      if (parsedData.ADJLIST.ABills && parsedData.ADJLIST.ABills[0].ABill) {
        for (const bill of parsedData.ADJLIST.ABills[0].ABill) {
          const [billResult]: any[] = await db.query(`
            INSERT INTO patient_bills (prid, stmid, hn, an, via, hospital_data_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            bill.prid[0],
            bill.stmid[0],
            bill.hn[0],
            bill.an[0],
            bill.via[0],
            hospitalId
          ]);
          
          const billId = billResult.insertId;
          
          // บันทึก processing dates
          if (bill.processing && bill.processing[0].date) {
            for (const date of bill.processing[0].date) {
                                await db.query(`
                    INSERT INTO processing_dates (patient_bill_id, date_id, date_value)
                    VALUES (?, ?, ?)
                  `, [billId, date.$.id, date._ || date]);
            }
          }
          
          // บันทึกข้อมูลการแก้ไข (ADJ)
          if (bill.ADJ) {
            for (const adj of bill.ADJ) {
              await db.query(`
                INSERT INTO adjustments (
                  patient_bill_id, adj_code, hmain, hcode, hproc, hn, an, pid, name,
                  dateadm, datedsc, ft, bf, drg, rw, adjrw, cp, st,
                  diff_hmain, diff_hcode, diff_hproc, diff_hn, diff_an, diff_pid,
                  diff_name, diff_dateadm, diff_datedsc, diff_ft, diff_bf, diff_drg,
                  diff_rw, diff_adjrw, diff_cp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                billId,
                parseInt(adj.$.code),
                adj.hmain[0],
                adj.hcode[0],
                adj.hproc[0],
                adj.hn[0],
                adj.an[0],
                adj.pid[0],
                adj.name[0],
                adj.dateadm[0],
                adj.datedsc[0],
                adj.ft[0],
                adj.bf[0],
                adj.drg[0],
                parseFloat(adj.rw[0]),
                parseFloat(adj.adjrw[0]),
                adj.CP[0],
                adj.st[0],
                adj.hmain[0].$?.diff || null,
                adj.hcode[0].$?.diff || null,
                adj.hproc[0].$?.diff || null,
                adj.hn[0].$?.diff || null,
                adj.an[0].$?.diff || null,
                adj.pid[0].$?.diff || null,
                adj.name[0].$?.diff || null,
                adj.dateadm[0].$?.diff || null,
                adj.datedsc[0].$?.diff || null,
                adj.ft[0].$?.diff || null,
                adj.bf[0].$?.diff || null,
                adj.drg[0].$?.diff || null,
                adj.rw[0].$?.diff || null,
                adj.adjrw[0].$?.diff || null,
                adj.CP[0].$?.diff || null
              ]);
            }
          }
          
          // บันทึกรายการรหัสโรค (AItems)
          if (bill.AItems && bill.AItems[0].AItem) {
            for (const item of bill.AItems[0].AItem) {
              await db.query(`
                INSERT INTO diagnosis_items (patient_bill_id, fid, fname, ovalue, nvalue)
                VALUES (?, ?, ?, ?, ?)
              `, [
                billId,
                item.FID[0],
                item.Fname[0],
                item.Ovalue[0],
                item.Nvalue[0]
              ]);
            }
          }
        }
      }
      
      // Commit transaction
      await db.query('COMMIT');
      
      return NextResponse.json({ 
        success: true, 
        message: 'XML data imported successfully',
        hospitalId: hospitalId
      });
      
    } catch (error) {
      // Rollback ถ้าเกิด error
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error processing XML:', error);
    return NextResponse.json({ 
      error: 'เกิดข้อผิดพลาดในการอัปโหลด',
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 