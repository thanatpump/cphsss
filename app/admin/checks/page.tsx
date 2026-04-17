'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CheckRow {
  hcode: string;
  cid: string;
  vstdate: string;
  vn: string;
  hn: string;
  authen: string;
  image_bytes: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminChecksPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });

  useEffect(() => {
    const auth = localStorage.getItem('allocation_check_auth');
    const storedUser = localStorage.getItem('allocation_check_user');
    if (auth !== 'true' || !storedUser) {
      router.push('/allocation-check');
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      const allowed = String(parsed?.username || '').toLowerCase() === 'adminserver';
      if (!allowed) {
        alert('หน้านี้อนุญาตเฉพาะบัญชี adminserver เท่านั้น');
        router.push('/admin');
        return;
      }
      setUser(parsed);
    } catch {
      router.push('/allocation-check');
    }
  }, [router]);

  const fetchRows = async (page: number) => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/ssop-images?admin_id=${user.id}&page=${page}&limit=${pagination.limit}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถดึงรายการได้');
      }
      setRows(data.data || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดรายการ');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchRows(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const start = useMemo(() => (pagination.page - 1) * pagination.limit + (rows.length ? 1 : 0), [pagination.page, pagination.limit, rows.length]);
  const end = useMemo(() => (pagination.page - 1) * pagination.limit + rows.length, [pagination.page, pagination.limit, rows.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xl">🗂️</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">รายการตรวจสอบ (ssop_image)</h1>
              <p className="text-sm text-gray-600">เฉพาะ adminserver</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            กลับหน้า Admin
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">รายการล่าสุด</h2>
              <p className="text-sm text-gray-500">
                แสดง {start}-{end} จากทั้งหมด {pagination.total} รายการ
              </p>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">hcode</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">cid</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">vstdate</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">vn</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">hn</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">authen</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">ขนาดรูป</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">ดูรูป</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">กำลังโหลดข้อมูล...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">ไม่พบข้อมูล</td>
                  </tr>
                ) : (
                  rows.map((row, idx) => {
                    const imgUrl =
                      `/api/admin/ssop-images/image?admin_id=${encodeURIComponent(String(user?.id || ''))}` +
                      `&hcode=${encodeURIComponent(row.hcode || '')}` +
                      `&cid=${encodeURIComponent(row.cid || '')}` +
                      `&vstdate=${encodeURIComponent(row.vstdate || '')}` +
                      `&vn=${encodeURIComponent(row.vn || '')}` +
                      `&hn=${encodeURIComponent(row.hn || '')}` +
                      `&authen=${encodeURIComponent(row.authen || '')}`;

                    return (
                      <tr key={`${row.authen || row.vn || 'row'}-${idx}`} className="border-t border-gray-100">
                        <td className="px-4 py-3 font-mono text-gray-900">{row.hcode || '-'}</td>
                        <td className="px-4 py-3 font-mono text-gray-900">{row.cid || '-'}</td>
                        <td className="px-4 py-3 text-gray-800">{row.vstdate || '-'}</td>
                        <td className="px-4 py-3 font-mono text-gray-800">{row.vn || '-'}</td>
                        <td className="px-4 py-3 font-mono text-gray-800">{row.hn || '-'}</td>
                        <td className="px-4 py-3 font-mono text-gray-800">{row.authen || '-'}</td>
                        <td className="px-4 py-3 text-gray-800">{Number(row.image_bytes || 0).toLocaleString()} bytes</td>
                        <td className="px-4 py-3">
                          <a
                            href={imgUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            เปิดรูป
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => fetchRows(Math.max(1, pagination.page - 1))}
              disabled={loading || pagination.page <= 1}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              ก่อนหน้า
            </button>
            <span className="text-sm text-gray-600">
              หน้า {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchRows(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={loading || pagination.page >= pagination.totalPages}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

