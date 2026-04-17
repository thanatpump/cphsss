import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '../../../lib/database';

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDB();
    
    await db.query('START TRANSACTION');
    try {
      await db.query('DELETE FROM signstmm');
      await db.query('DELETE FROM signstms');
      await db.query('DELETE FROM sognstmm');
      await db.query('DELETE FROM sognstmp');
      // ลบ reset auto-increment (MySQL ใช้ ALTER TABLE)
      await db.query('ALTER TABLE signstmm AUTO_INCREMENT = 1');
      await db.query('ALTER TABLE signstms AUTO_INCREMENT = 1');
      await db.query('ALTER TABLE sognstmm AUTO_INCREMENT = 1');
      await db.query('ALTER TABLE sognstmp AUTO_INCREMENT = 1');
      await db.query('COMMIT');
      return NextResponse.json({ success: true, message: 'ลบข้อมูลทั้งหมดเรียบร้อยแล้ว' });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error deleting data:', error);
    return NextResponse.json({ 
      error: 'Failed to delete data', 
      detail: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 