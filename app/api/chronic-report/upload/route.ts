import { NextRequest, NextResponse } from 'next/server';
import { importChronicFile, listChronicBatches } from '@/lib/chronic-import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const batches = await listChronicBatches(40);
    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error('Error listing chronic batches:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'โหลดรายการไฟล์โรคเรื้อรังไม่สำเร็จ',
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

    const dataFiles = files.filter((file) => {
      const name = file.name.toUpperCase();
      return (
        /\.(XLSX|XLS|CSV)$/i.test(file.name) &&
        (name.includes('ACDCONF') || name.includes('ACDDETAIL') || name.includes('ACDSUM'))
      );
    });

    if (!dataFiles.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'กรุณาเลือกไฟล์ ACDCONF / acddetail จากชุด SSOPACD (ข้าม PDF ได้)',
        },
        { status: 400 }
      );
    }

    const results = [];
    for (const file of dataFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await importChronicFile(file.name, buffer, { replace });
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
      },
      results,
    });
  } catch (error) {
    console.error('Error uploading chronic files:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัปโหลดข้อมูลโรคเรื้อรัง',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
