'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function UploadSognstmp() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/xml') {
      setFile(selectedFile);
      setMessage(null);
    } else {
      setMessage({ type: 'error', text: 'กรุณาเลือกไฟล์ XML เท่านั้น' });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-sognstmp', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: result.message });
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setMessage({ type: 'error', text: result.error || 'เกิดข้อผิดพลาดในการอัปโหลด' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-orange-600 hover:text-orange-800 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            กลับหน้าหลัก
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            อัปโหลดข้อมูล SOGNSTMP
          </h1>
          <p className="text-gray-600">
            อัปโหลดไฟล์ XML สำหรับข้อมูลการชำระเงินผู้ป่วยนอก (พิเศษ)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="space-y-6">
            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                เลือกไฟล์ XML
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-input"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500"
                    >
                      <span>อัปโหลดไฟล์</span>
                      <input
                        id="file-input"
                        name="file"
                        type="file"
                        accept=".xml"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">หรือลากและวาง</p>
                  </div>
                  <p className="text-xs text-gray-500">XML เท่านั้น</p>
                </div>
              </div>
              {file && (
                <div className="mt-2 text-sm text-gray-600">
                  ไฟล์ที่เลือก: <span className="font-medium">{file.name}</span>
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex justify-center">
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`px-8 py-3 rounded-md font-medium text-white transition-colors ${
                  !file || uploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                }`}
              >
                {uploading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังอัปโหลด...
                  </div>
                ) : (
                  'อัปโหลดไฟล์'
                )}
              </button>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`mt-4 p-4 rounded-md ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {message.type === 'success' ? (
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">ข้อมูล SOGNSTMP</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>ประเภทข้อมูล:</strong> ข้อมูลการชำระเงินผู้ป่วยนอก (พิเศษ)</p>
            <p><strong>ฟิลด์ที่รองรับ:</strong></p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              <span>• STMdoc</span>
              <span>• dateStart</span>
              <span>• dateEnd</span>
              <span>• dateDue</span>
              <span>• dateIssue</span>
              <span>• station</span>
              <span>• hmain</span>
              <span>• hproc</span>
              <span>• hcare</span>
              <span>• hn</span>
              <span>• pid</span>
              <span>• name</span>
              <span>• invno</span>
              <span>• bf</span>
              <span>• pcode</span>
              <span>• care</span>
              <span>• payplan</span>
              <span>• bp</span>
              <span>• dttran</span>
              <span>• copay</span>
              <span>• cfh</span>
              <span>• total</span>
              <span>• ExtP</span>
              <span>• rid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 