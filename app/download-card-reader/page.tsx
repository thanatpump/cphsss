'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DownloadCardReaderPage() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/download-card-reader');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'ไม่สามารถดาวน์โหลดไฟล์ได้');
      }

      // ดาวน์โหลดไฟล์
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SSO-CardReader-For-Users.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (error) {
      console.error('Download error:', error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการดาวน์โหลด');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">📦 ดาวน์โหลด SSO Card Reader</h1>
            <p className="text-gray-600">ไฟล์ ZIP สำหรับแจกจ่ายให้ผู้ใช้งาน</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">📋 ไฟล์ที่รวมใน ZIP:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                SSO-CardReader-Portable.exe (โปรแกรมหลัก)
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                config.json (ไฟล์ตั้งค่า)
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                คู่มือใช้งาน.txt (คู่มือภาษาไทย)
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                README_FINAL.txt (คู่มือสรุป)
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                โฟลเดอร์ ThaiIDCardReader/ (โปรแกรมอ่านบัตร)
              </li>
            </ul>
          </div>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
              downloading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {downloading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังสร้างและดาวน์โหลด ZIP...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                📥 ดาวน์โหลดไฟล์ ZIP
              </span>
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold">❌ เกิดข้อผิดพลาด:</p>
              <p className="text-red-600 mt-2">{error}</p>
              <p className="text-sm text-red-500 mt-2">
                💡 วิธีแก้ไข: ใช้ create-zip.bat หรือ create-zip.sh สร้างไฟล์ ZIP ก่อน
              </p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold">✅ ดาวน์โหลดสำเร็จ!</p>
              <p className="text-green-600 mt-2">ไฟล์ ZIP ถูกดาวน์โหลดแล้ว</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">💡 หมายเหตุ:</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• ไฟล์ ZIP จะมีขนาดประมาณ 86-90 MB</li>
              <li>• ผู้ใช้งานจะต้อง Extract ZIP ก่อนใช้งาน</li>
              <li>• ตรวจสอบ URL ใน config.json ว่าถูกต้องก่อนแจกจ่าย</li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 underline">
              ← กลับไปยัง Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
