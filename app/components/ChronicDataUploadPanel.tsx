'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChronicBatchRow } from '@/lib/chronic-types';

interface UploadResult {
  fileName: string;
  fileType: string;
  batchKey: string;
  hcode: string;
  period: string;
  status: 'imported' | 'skipped' | 'replaced' | 'error';
  rowCount: number;
  message: string;
}

function formatInt(value: number) {
  return value.toLocaleString('th-TH');
}

export default function ChronicDataUploadPanel({ onImported }: { onImported?: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [replace, setReplace] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [summary, setSummary] = useState<{
    totalFiles: number;
    imported: number;
    skipped: number;
    failed: number;
    rows: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState<ChronicBatchRow[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res = await fetch('/api/chronic-report/upload');
      const json = await res.json();
      if (res.ok && json.success) setBatches(json.batches || []);
    } catch {
      // ignore
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next = Array.from(list).filter((file) => {
      const name = file.name.toUpperCase();
      return (
        /\.(XLSX|XLS|CSV)$/i.test(file.name) &&
        (name.includes('ACDCONF') || name.includes('ACDDETAIL') || name.includes('ACDSUM'))
      );
    });
    setFiles(next);
    setResults([]);
    setSummary(null);
    setError('');
  };

  const upload = async () => {
    if (!files.length) {
      setError('กรุณาเลือกไฟล์ ACDCONF / acddetail จากชุด SSOPACD เช่น 10702_SSOPACD_202609');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      if (replace) formData.append('replace', '1');
      for (const file of files) formData.append('files', file);

      const res = await fetch('/api/chronic-report/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!json.results) throw new Error(json.error || 'อัปโหลดไม่สำเร็จ');
      setResults(json.results);
      setSummary(json.summary || null);
      await loadBatches();
      if ((json.summary?.imported || 0) > 0 || (json.summary?.rows || 0) > 0) {
        onImported?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="report-panel p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-[#0b3d4a]" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
          อัปโหลดข้อมูลโรคเรื้อรัง (SSOP ACD)
        </h3>
        <p className="text-sm text-[#5c6b73] mt-1 leading-relaxed">
          เลือกไฟล์จากโฟลเดอร์เช่น{' '}
          <code className="text-xs bg-[#f4f6f8] px-1.5 py-0.5">10702_SSOPACD_202609</code>
          {' '}— รองรับ <strong>ACDCONF.xlsx</strong> และ <strong>acddetail.xls</strong> (ข้าม PDF สรุป)
        </p>

        <div className="mt-5 rounded-xl border border-dashed border-[#a8b8c0] bg-[#fafbfc] px-6 py-8 text-center">
          <p className="text-sm text-[#0b3d4a] font-medium mb-3">เลือกหลายไฟล์หรือทั้งโฟลเดอร์</p>
          <div className="flex flex-wrap justify-center gap-2">
            <label className="inline-flex items-center px-4 py-2 bg-[#0b3d4a] text-white text-sm font-medium cursor-pointer hover:bg-[#072a33]">
              เลือกไฟล์ Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple
                className="hidden"
                onChange={(e) => {
                  onPickFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <label className="inline-flex items-center px-4 py-2 border border-[#d8e0e5] bg-white text-[#0b3d4a] text-sm font-medium cursor-pointer hover:border-[#1a7a6d]">
              เลือกทั้งโฟลเดอร์
              <input
                type="file"
                multiple
                className="hidden"
                ref={(el) => {
                  if (el) {
                    el.setAttribute('webkitdirectory', '');
                    el.setAttribute('directory', '');
                  }
                }}
                onChange={(e) => {
                  onPickFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <p className="text-xs text-[#5c6b73] mt-3">
            ตัวอย่าง: 10702_ACDCONF_202609.xlsx, 10702_acddetail_202609.xls
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-[#0b3d4a] mb-2">ไฟล์ที่เลือก {files.length} ไฟล์</p>
            <ul className="text-sm text-[#5c6b73] space-y-1 max-h-40 overflow-auto border border-[#eef2f4] p-3 bg-white">
              {files.map((file) => (
                <li key={`${file.name}-${file.size}`} className="flex justify-between gap-3">
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 tabular-nums">{(file.size / 1024).toFixed(0)} KB</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-[#15202b]">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
              className="rounded border-[#d8e0e5]"
            />
            แทนที่ถ้าชุดข้อมูลซ้ำ
          </label>
          <button
            type="button"
            disabled={uploading || !files.length}
            onClick={upload}
            className="px-4 py-2 bg-[#1a7a6d] text-white text-sm font-semibold disabled:opacity-50 hover:bg-[#15685d]"
          >
            {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดเข้าฐานข้อมูล'}
          </button>
        </div>

        {error && (
          <div className="mt-4 border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        {summary && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Kpi label="ไฟล์ทั้งหมด" value={formatInt(summary.totalFiles)} />
            <Kpi label="นำเข้าแล้ว" value={formatInt(summary.imported)} />
            <Kpi label="ข้าม" value={formatInt(summary.skipped)} />
            <Kpi label="รายการที่บันทึก" value={formatInt(summary.rows)} />
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[#5c6b73] border-b border-[#d8e0e5]">
                  <th className="py-2 pr-3">ไฟล์</th>
                  <th className="pr-3">ประเภท</th>
                  <th className="pr-3">สถานะ</th>
                  <th className="pr-3 text-right">จำนวน</th>
                  <th className="pr-3">ข้อความ</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.fileName} className="border-b border-[#eef2f4]">
                    <td className="py-2 pr-3 font-medium text-[#0b3d4a]">{row.fileName}</td>
                    <td className="pr-3">{row.fileType}</td>
                    <td className="pr-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="pr-3 text-right tabular-nums">{formatInt(row.rowCount)}</td>
                    <td className="pr-3 text-[#5c6b73]">{row.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="report-panel p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-[#0b3d4a]" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
            ชุดข้อมูลที่อยู่ในระบบ
          </h3>
          <button type="button" onClick={loadBatches} className="text-sm text-[#1a7a6d] font-medium hover:underline">
            รีเฟรช
          </button>
        </div>
        {loadingBatches ? (
          <p className="text-sm text-[#5c6b73] py-6 text-center">กำลังโหลด...</p>
        ) : batches.length === 0 ? (
          <p className="text-sm text-[#5c6b73] py-6 text-center">
            ยังไม่มีชุดโรคเรื้อรัง — อัปโหลดจากโฟลเดอร์ SSOPACD เพื่อเริ่มต้น
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[#5c6b73] border-b border-[#d8e0e5]">
                  <th className="py-2 pr-3">ชุดข้อมูล</th>
                  <th className="pr-3">ประเภท</th>
                  <th className="pr-3 text-right">รายการ</th>
                  <th className="pr-3">ช่วงวันที่</th>
                  <th>อัปโหลดเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((row) => (
                  <tr key={row.batchKey} className="border-b border-[#eef2f4]">
                    <td className="py-2 pr-3 font-medium text-[#0b3d4a]">{row.batchKey}</td>
                    <td className="pr-3">{row.fileType}</td>
                    <td className="pr-3 text-right tabular-nums">{formatInt(row.rowCount)}</td>
                    <td className="pr-3 text-[#5c6b73]">
                      {row.dateFrom && row.dateTo ? `${row.dateFrom} – ${row.dateTo}` : '-'}
                    </td>
                    <td className="text-[#5c6b73]">
                      {row.uploadedAt
                        ? new Date(row.uploadedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#d8e0e5] bg-[#fafbfc] px-3 py-2">
      <p className="text-[11px] text-[#5c6b73]">{label}</p>
      <p className="text-lg font-semibold text-[#0b3d4a] tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: UploadResult['status'] }) {
  const map = {
    imported: 'bg-emerald-50 text-emerald-800',
    replaced: 'bg-sky-50 text-sky-800',
    skipped: 'bg-amber-50 text-amber-800',
    error: 'bg-red-50 text-red-700',
  } as const;
  const label = {
    imported: 'นำเข้า',
    replaced: 'แทนที่',
    skipped: 'ข้าม',
    error: 'ผิดพลาด',
  } as const;
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${map[status]}`}>{label[status]}</span>
  );
}
