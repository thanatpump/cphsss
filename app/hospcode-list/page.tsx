'use client';

import { useEffect, useState } from 'react';

interface HospcodeData {
  id: number;
  hospcode_5_digit: string;
  name: string;
  amp_name?: string;
  amppart?: string;
}

export default function HospcodeListPage() {
  const [data, setData] = useState<HospcodeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hospcode-list')
      .then(res => res.json())
      .then(res => {
        setData(res.data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">รายชื่อโรงพยาบาล (hospcode)</h1>
        {loading ? (
          <div className="text-center text-gray-500">กำลังโหลดข้อมูล...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัส - ชื่อโรงพยาบาล</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อำเภอ</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รหัสอำเภอ</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, idx) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm text-gray-900">{idx + 1}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.hospcode_5_digit} - {item.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.amp_name || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{item.amppart || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 