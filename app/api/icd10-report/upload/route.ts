import { NextRequest, NextResponse } from 'next/server';
import { importIcd10TextFile, listIcd10Batches } from '@/lib/icd10-import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const batches = await listIcd10Batches(40);
    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error('Error listing ICD-10 batches:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'โหลดรายการไฟล์ ICD-10 ไม่สำเร็จ',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const replace = String(formData.get('replace') || '') === '1';
    const files = formData
      .getAll('files')
      .concat(formData.getAll('file'))
      .filter((item): item is File => typeof item === 'object' && item !== null && 'arrayBuffer' in item);

    if (!files.length) {
      return NextResponse.json({ success: false, error: 'ไม่พบไฟล์ที่อัปโหลด' }, { status: 400 });
    }

    const textFiles = files.filter(
      (file) => /\.(txt|csv)$/i.test(file.name) || file.type.includes('text') || file.type === ''
    );
    if (!textFiles.length) {
      return NextResponse.json(
        { success: false, error: 'กรุณาเลือกไฟล์ TXT เช่น OPD202609.TXT / IPD6909.TXT' },
        { status: 400 }
      );
    }

    const results = [];
    for (const file of textFiles) {
      const content = await file.text();
      const result = await importIcd10TextFile(file.name, content, { replace });
      results.push(result);
    }

    const imported = results.filter((row) => row.status === 'imported' || row.status === 'replaced');
    const skipped = results.filter((row) => row.status === 'skipped');
    const failed = results.filter((row) => row.status === 'error');

    return NextResponse.json({
      success: failed.length === 0,
      summary: {
        totalFiles: results.length,
        imported: imported.length,
        skipped: skipped.length,
        failed: failed.length,
        visits: imported.reduce((sum, row) => sum + row.visitCount, 0),
        rows: imported.reduce((sum, row) => sum + row.diagCount, 0),
      },
      results,
    });
  } catch (error) {
    console.error('Error uploading ICD-10 files:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัปโหลดข้อมูล ICD-10',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
