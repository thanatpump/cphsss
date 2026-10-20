import { NextRequest, NextResponse } from 'next/server';
import { importAipnXmlFile, listAipnBatches } from '@/lib/aipn-import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const batches = await listAipnBatches(40);
    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error('Error listing AIPN batches:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'โหลดรายการไฟล์ AIPN ไม่สำเร็จ',
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

    const xmlFiles = files.filter(
      (file) => /\.xml$/i.test(file.name) && /SIGN/i.test(file.name)
    );
    if (!xmlFiles.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'กรุณาเลือกไฟล์ XML จากชุด SIGNSTM เช่น SIGNSTMM / SIGNSTMS',
        },
        { status: 400 }
      );
    }

    const results = [];
    for (const file of xmlFiles) {
      const content = await file.text();
      const result = await importAipnXmlFile(file.name, content, { replace });
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
        rows: imported.reduce((sum, row) => sum + row.rowCount, 0),
        amount: imported.reduce((sum, row) => sum + row.amount, 0),
      },
      results,
    });
  } catch (error) {
    console.error('Error uploading AIPN files:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัปโหลดข้อมูล AIPN',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
