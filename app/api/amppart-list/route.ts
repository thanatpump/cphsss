import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const db = await getDB();
    
    // ดึงข้อมูลจากตาราง amppart
    const [data]: any[] = await db.query(`
      SELECT id, amppart, chwpart, name 
      FROM amppart 
      ORDER BY amppart
    `);

    return NextResponse.json({
      success: true,
      data: data,
      total: data.length
    });
  } catch (error) {
    console.error('Error fetching amppart data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch amppart data' },
      { status: 500 }
    );
  }
} 