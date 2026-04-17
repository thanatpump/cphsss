'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AllocationRegisterPage() {
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
  const [hospitals, setHospitals] = useState<string[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ดึงรายชื่อ รพสต
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await fetch('/api/hospitals-list');
        const data = await res.json();
        if (data.success && data.hospitals) {
          setHospitals(data.hospitals);
        }
      } catch (err) {
        console.error('Error fetching hospitals:', err);
      } finally {
        setLoadingHospitals(false);
      }
    };
    fetchHospitals();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        alert('สมัครสมาชิกสำเร็จ! บัญชีของคุณอยู่ในสถานะรอยืนยัน กรุณารอการอนุมัติจากผู้ดูแลระบบ');
        router.push('/allocation-check');
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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">💰</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ตรวจสอบข้อมูลการจัดสรรเงิน</h1>
                <p className="text-sm text-gray-600">Budget Allocation Check System</p>
              </div>
            </div>
            <Link
              href="/allocation-check"
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← กลับไปหน้า Login
            </Link>
          </div>
        </div>
      </header>

      {/* Register Form */}
      <div className="flex items-center justify-center p-4 py-10">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 border-t-4 border-yellow-500">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h1 className="text-3xl font-extrabold text-gray-800 mb-2">สมัครสมาชิก</h1>
              <p className="text-gray-600">ระบบตรวจสอบข้อมูลการจัดสรรเงิน</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ชื่อ-นามสกุล */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-bold text-gray-700 mb-2">
                    ชื่อ <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-bold text-gray-700 mb-2">
                    นามสกุล <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
              </div>

              {/* เบอร์โทร */}
              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-gray-700 mb-2">
                  เบอร์โทร <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="08X-XXX-XXXX"
                  required
                />
              </div>

              {/* รหัสบัตรประชาชน */}
              <div>
                <label htmlFor="citizen_id" className="block text-sm font-bold text-gray-700 mb-2">
                  รหัสบัตรประชาชน <span className="text-red-500">*</span>
                </label>
                <input
                  id="citizen_id"
                  name="citizen_id"
                  type="text"
                  value={formData.citizen_id}
                  onChange={handleChange}
                  maxLength={13}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="1234567890123"
                  required
                />
              </div>

              {/* วันเกิด */}
              <div>
                <label htmlFor="birth_date" className="block text-sm font-bold text-gray-700 mb-2">
                  วันเกิด <span className="text-red-500">*</span>
                </label>
                <input
                  id="birth_date"
                  name="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              </div>

              {/* ชื่อรพสต */}
              <div>
                <label htmlFor="hospital_name" className="block text-sm font-bold text-gray-700 mb-2">
                  ชื่อรพสต <span className="text-red-500">*</span>
                </label>
                {loadingHospitals ? (
                  <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100">
                    กำลังโหลดรายชื่อ รพสต...
                  </div>
                ) : (
                  <>
                  <input
                    id="hospital_name"
                    name="hospital_name"
                    type="text"
                    list="hospital-options"
                    value={formData.hospital_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="พิมพ์ค้นหาชื่อ รพสต..."
                    required
                  />
                  <datalist id="hospital-options">
                    {hospitals.map((hospital) => (
                      <option key={hospital} value={hospital}>
                      </option>
                    ))}
                  </datalist>
                  <p className="mt-2 text-xs text-gray-500">
                    พิมพ์เพื่อค้นหา และเลือกรายการจากคำแนะนำ
                  </p>
                  </>
                )}
              </div>

              {/* ตำแหน่ง */}
              <div>
                <label htmlFor="position" className="block text-sm font-bold text-gray-700 mb-2">
                  ตำแหน่ง <span className="text-red-500">*</span>
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-bold text-gray-700 mb-2">
                  ชื่อผู้ใช้ <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                  minLength={3}
                />
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                    รหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-bold text-gray-700 mb-2">
                    ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-4 rounded-lg hover:from-yellow-500 hover:to-orange-600 focus:ring-4 focus:ring-yellow-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg"
              >
                {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
              </button>

              <div className="text-center">
                <p className="text-sm text-gray-600">
                  มีบัญชีอยู่แล้ว?{' '}
                  <Link href="/allocation-check" className="text-yellow-600 hover:text-yellow-700 font-semibold">
                    เข้าสู่ระบบ
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
