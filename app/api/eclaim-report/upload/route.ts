import { NextRequest, NextResponse } from 'next/server';
import { importEclaimFile, listEclaimBatches } from '@/lib/eclaim-import';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const batches = await listEclaimBatches(40);
    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error('Error listing E-claim batches:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'โหลดรายการไฟล์ E-claim ไม่สำเร็จ',
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

    const accepted = files.filter((file) => {
      const name = file.name;
      const upper = name.toUpperCase();
      if (/\.(JPG|JPEG|PNG|GIF|PDF)$/i.test(name)) return true; // will skip later
      return (
        /\.(XLSX|XLS|CSV)$/i.test(name) &&
        (upper.startsWith('STM_') || /SSS\d{6}/i.test(name) || /พึงรับ/.test(name) || /รายงาน/.test(name))
      );
    });

    if (!accepted.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'กรุณาเลือกไฟล์ STM_*.xls หรือรายงานพึงรับพึงจ่าย_*.xls จากโฟลเดอร์งวด เช่น 202609',
        },
        { status: 400 }
      );
    }

    const results = [];
    for (const file of accepted) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await importEclaimFile(file.name, buffer, { replace });
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
    console.error('Error uploading E-claim files:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการอัปโหลดข้อมูล E-claim',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
