'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface Patient {
  id: number;
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
  reimb: number;
  nreimb: number;
  copay: number;
  cp: string;
  pp: string;
  ods: string;
  spcmsg: string;
  created_at: string;
  hospital_code: string;
  hospital_name: string;
  period: string;
  stmno: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function DataPage() {
  const [data, setData] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/data?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data.patients);
        setPagination(result.data.pagination);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: th });
    } catch {
      return dateString;
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  const getFTDescription = (ft: string) => {
    const descriptions: { [key: string]: string } = {
      'S': 'อยู่ในสิทธิ์ประโยชน์',
      'P': 'อยู่ในสิทธิ์ประโยชน์(บางส่วน)',
      'N': 'ไม่อยู่ในสิทธิ์ประโยชน์'
    };
    return descriptions[ft] || ft;
  };

  const getBFDescription = (bf: string) => {
    const descriptions: { [key: string]: string } = {
      'Y': 'มีสิทธิ์',
      'N': 'ไม่มีสิทธิ์'
    };
    return descriptions[bf] || bf;
  };

  const getCareasDescription = (careas: string) => {
    const descriptions: { [key: string]: string } = {
      'M': 'สถานพยาบาลหลัก',
      'B': 'สถานพยาบาลเครือข่าย',
      'A': 'สถานพยาบาลระดับสูงกว่า',
      'X': 'อื่นๆ'
    };
    return descriptions[careas] || careas;
  };

  if (loading && data.length === 0) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">เกิดข้อผิดพลาด: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ข้อมูลผู้ป่วยประกันสังคม</h1>
          
          {/* ฟิลเตอร์วันที่ */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">กรองข้อมูลตามวันที่</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่เริ่มต้น
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  ล้างฟิลเตอร์
                </button>
              </div>
            </div>
          </div>

          {/* สถิติข้อมูล */}
          {pagination && (
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatNumber(pagination.totalItems)}</div>
                  <div className="text-sm text-gray-600">จำนวนรายการทั้งหมด</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatNumber(pagination.currentPage)}</div>
                  <div className="text-sm text-gray-600">หน้าปัจจุบัน</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{formatNumber(pagination.totalPages)}</div>
                  <div className="text-sm text-gray-600">จำนวนหน้าทั้งหมด</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{formatNumber(pagination.itemsPerPage)}</div>
                  <div className="text-sm text-gray-600">รายการต่อหน้า</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ตารางข้อมูล */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    รายละเอียด
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อ-สกุล
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่เข้า
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่ออก
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DRG
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    AdjRW
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จำนวนเงิน
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((patient) => (
                  <React.Fragment key={patient.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleRow(patient.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {expandedRows.has(patient.id) ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {patient.hn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.an}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {patient.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(patient.dateadm)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(patient.datedsc)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.drg}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.adjrw.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatNumber(patient.reimb)}
                      </td>
                    </tr>
                    {expandedRows.has(patient.id) && (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div>
                              <strong>เลขบัตรประชาชน:</strong> {patient.pid}
                            </div>
                            <div>
                              <strong>ประเภทการรักษา:</strong> {getFTDescription(patient.ft)}
                            </div>
                            <div>
                              <strong>สิทธิ์ประกันสังคม:</strong> {getBFDescription(patient.bf)}
                            </div>
                            <div>
                              <strong>บทบาทสถานพยาบาล:</strong> {getCareasDescription(patient.careas)}
                            </div>
                            <div>
                              <strong>RW:</strong> {patient.rw.toFixed(4)}
                            </div>
                            <div>
                              <strong>ประเภทผู้ป่วย:</strong> {patient.ptype}
                            </div>
                            <div>
                              <strong>RW Type:</strong> {patient.rwtype}
                            </div>
                            <div>
                              <strong>RP Type:</strong> {patient.rptype}
                            </div>
                            <div>
                              <strong>RID:</strong> {patient.rid}
                            </div>
                            <div>
                              <strong>PSTM:</strong> {patient.pstm}
                            </div>
                            <div>
                              <strong>SC:</strong> {patient.sc}
                            </div>
                            <div>
                              <strong>ED:</strong> {patient.ed}
                            </div>
                            <div>
                              <strong>Due:</strong> {patient.due}
                            </div>
                            <div>
                              <strong>CP:</strong> {patient.cp}
                            </div>
                            <div>
                              <strong>PP:</strong> {patient.pp}
                            </div>
                            <div>
                              <strong>ODS:</strong> {patient.ods || '-'}
                            </div>
                            <div>
                              <strong>จำนวนเงินรวม:</strong> {formatNumber(patient.reimb)}
                            </div>
                            <div>
                              <strong>จำนวนเงินไม่รวม:</strong> {formatNumber(patient.nreimb)}
                            </div>
                            <div>
                              <strong>ส่วนร่วม:</strong> {formatNumber(patient.copay)}
                            </div>
                            <div>
                              <strong>โรงพยาบาล:</strong> {patient.hospital_name}
                            </div>
                            <div>
                              <strong>รหัสโรงพยาบาล:</strong> {patient.hospital_code}
                            </div>
                            <div>
                              <strong>งวด:</strong> {patient.period}
                            </div>
                            <div>
                              <strong>เลขที่ Statement:</strong> {patient.stmno}
                            </div>
                            {patient.spcmsg && (
                              <div className="col-span-full">
                                <strong>ข้อความพิเศษ:</strong> {patient.spcmsg}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => fetchData(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => fetchData(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    แสดง <span className="font-medium">{((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}</span> ถึง{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                    </span>{' '}
                    จาก <span className="font-medium">{pagination.totalItems}</span> รายการ
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => fetchData(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ก่อนหน้า
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      หน้า {pagination.currentPage} จาก {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => fetchData(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ถัดไป
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 