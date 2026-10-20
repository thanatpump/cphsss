'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HospcodeRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    citizen_id: '',
    birth_date: '',
    hospital_name: '',
    position: '',
    username: '',
    password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ตรวจสอบรหัสผ่านตรงกัน
    if (formData.password !== formData.confirm_password) {
      setError('รหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/hospcode-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          citizen_id: formData.citizen_id,
          birth_date: formData.birth_date,
          hospital_name: formData.hospital_name,
          position: formData.position,
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
        router.push('/hospcode-login');
      } else {
        setError(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell relative min-h-screen flex items-center justify-center p-4">
      <div className="relative z-[1] max-w-2xl w-full">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#1a7a6d] font-semibold hover:underline">
            ← กลับหน้าหลัก
          </Link>
        </div>
        <div className="app-card p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#1a7a6d] rounded-md flex items-center justify-center mx-auto mb-4">
              <span
                className="text-white text-sm font-semibold tracking-[0.14em]"
                style={{ fontFamily: 'var(--font-ibm-plex)' }}
              >
                SSO
              </span>
            </div>
            <h1
              className="text-2xl font-semibold text-[#0b3d4a] mb-2"
              style={{ fontFamily: 'var(--font-ibm-plex)' }}
            >
              สมัครสมาชิก
            </h1>
            <p className="text-[#5c6b73] text-sm">ระบบตรวจสอบการส่งข้อมูล</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ชื่อ-นามสกุล */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                  นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* เบอร์โทร */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                เบอร์โทร <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                placeholder="08X-XXX-XXXX"
                required
              />
            </div>

            {/* รหัสบัตรประชาชน */}
            <div>
              <label htmlFor="citizen_id" className="block text-sm font-medium text-gray-700 mb-2">
                รหัสบัตรประชาชน <span className="text-red-500">*</span>
              </label>
              <input
                id="citizen_id"
                name="citizen_id"
                type="text"
                value={formData.citizen_id}
                onChange={handleChange}
                maxLength={13}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                placeholder="1234567890123"
                required
              />
            </div>

            {/* วันเกิด */}
            <div>
              <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-2">
                วันเกิด <span className="text-red-500">*</span>
              </label>
              <input
                id="birth_date"
                name="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                required
              />
            </div>

            {/* ชื่อรพสต */}
            <div>
              <label htmlFor="hospital_name" className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อรพสต <span className="text-red-500">*</span>
              </label>
              <input
                id="hospital_name"
                name="hospital_name"
                type="text"
                value={formData.hospital_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                required
              />
            </div>

            {/* ตำแหน่ง */}
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                ตำแหน่ง <span className="text-red-500">*</span>
              </label>
              <input
                id="position"
                name="position"
                type="text"
                value={formData.position}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                required
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อผู้ใช้ <span className="text-red-500">*</span>
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                required
                minLength={3}
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                  ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a7a6d] focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full py-3 rounded-md font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
            </button>

            <div className="text-center">
              <p className="text-gray-600">
                มีบัญชีอยู่แล้ว?{' '}
                <Link href="/hospcode-login" className="text-[#1a7a6d] hover:text-[#15685d] font-semibold">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
