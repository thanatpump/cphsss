'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

interface SIGNSTMMData {
  id: number;
  period: string;
  stmno: string;
  dateDue: string;
  hmain: string;
  hcode: string;
  hproc: string;
  hn: string;
  an: string;
  pid: string;
  name: string;
  dateadm: string;
  datedsc: string;
  ft: string;
  bf: string;
  drg: string;
  rw: number;
  adjrw: number;
  due: number;
  ptype: number;
  rwtype: string;
  rptype: string;
  rid: string;
  pstm: number;
  careas: string;
  sc: number;
  ed: number;
  Reimb: number;
  Nreimb: number;
  Copay: number;
  CP: string;
  PP: string;
  created_at: string;
  hosp_name?: string; // เพิ่ม field ชื่อโรงพยาบาล
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function DataSIGNSTMMPage() {
  const { username } = useAuth();
  const [data, setData] = useState<SIGNSTMMData[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [userHproc, setUserHproc] = useState<string | null>(null);

  // ดึง hproc ของผู้ใช้ที่ login
  useEffect(() => {
    const fetchUserHproc = async () => {
      if (username) {
        try {
          const response = await fetch(`/api/login-sks-name?user_sks=${encodeURIComponent(username)}`);
          const result = await response.json();
          if (response.ok) {
            // ดึง hproc จาก login_sks
            const hprocResponse = await fetch(`/api/user-hproc?user_sks=${encodeURIComponent(username)}`);
            const hprocResult = await hprocResponse.json();
            if (hprocResponse.ok && hprocResult.hproc) {
              setUserHproc(hprocResult.hproc);
            }
          }
        } catch (error) {
          console.error('Error fetching user hproc:', error);
        }
      }
    };
    fetchUserHproc();
  }, [username]);

  const fetchData = async (page: number = 1) => {
    try {
      setLoading(true);
      // ส่ง hproc ของผู้ใช้ไปยัง API
      const hprocParam = userHproc ? `&hproc=${encodeURIComponent(userHproc)}` : '';
      const response = await fetch(`/api/data-signstmm?page=${page}&limit=${pagination.limit}${hprocParam}`);
      const result = await response.json();
      
      if (response.ok) {
        setData(result.data);
        setPagination(result.pagination);
      } else {
        console.error('Error fetching data:', result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userHproc) {
    fetchData();
    }
  }, [userHproc]);

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ข้อมูล SIGNSTMM</h1>
          <div className="flex gap-4">
            <Link 
              href="/upload-signstmm"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              อัปโหลดไฟล์ใหม่
            </Link>
            <Link 
              href="/"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              ข้อมูลทั้งหมด ({pagination.total} รายการ)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STM No</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Due</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HMain</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HCode</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HProc</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อโรงพยาบาล</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HN</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AN</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PID</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Adm</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Dsc</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">FT</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BF</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DRG</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RW</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AdjRW</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PType</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RWType</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RPType</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RID</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PSTM</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Careas</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SC</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ED</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reimb</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NReimb</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Copay</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CP</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PP</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.id}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.period}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.stmno}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.dateDue}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.hmain}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.hcode}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.hproc}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.hosp_name || '-'}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.hn}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.an}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.pid}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.dateadm}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.datedsc}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.ft}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.bf}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.drg}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.rw}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.adjrw}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.due}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.ptype}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.rwtype}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.rptype}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.rid}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.pstm}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.careas}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.sc}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.ed}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.Reimb}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.Nreimb}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.Copay}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.CP}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.PP}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">{item.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ก่อนหน้า
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  แสดง <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> ถึง{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  จาก <span className="font-medium">{pagination.total}</span> รายการ
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    หน้า {pagination.page} จาก {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ถัดไป
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 