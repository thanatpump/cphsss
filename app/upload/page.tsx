import Link from 'next/link';

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            ← ย้อนกลับ
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">อัปโหลดข้อมูลกลาง</h1>
        <p className="text-center text-gray-600 mb-8">เลือกประเภทข้อมูลที่ต้องการอัปโหลดเข้าสู่ระบบ</p>
        <div className="flex flex-col gap-4">
          <Link href="/upload-signstmm">
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">อัปโหลด SIGNSTMM (ผู้ป่วยใน)</button>
          </Link>
          <Link href="/upload-signstms">
            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">อัปโหลด SIGNSTMS (ผู้ป่วยในสรุป)</button>
          </Link>
          <Link href="/upload-sognstmm">
            <button className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors">อัปโหลด SOGNSTMM (ผู้ป่วยนอก)</button>
          </Link>
          <Link href="/upload-sognstmp">
            <button className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors">อัปโหลด SOGNSTMP (ผู้ป่วยนอกพิเศษ)</button>
          </Link>
        </div>
      </div>
    </div>
  );
} 