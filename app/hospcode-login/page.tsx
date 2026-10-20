'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HospcodeLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/hospcode-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.success && data.user) {
        localStorage.setItem('hospcode_user', JSON.stringify(data.user));
        localStorage.setItem('hospcode_authenticated', 'true');
        router.push('/hospcode-check');
      } else {
        setError(data.error || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell relative min-h-screen flex items-center justify-center p-4">
      <div className="relative z-[1] max-w-md w-full">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#1a7a6d] font-semibold hover:underline">
            ← กลับหน้าหลัก
          </Link>
        </div>
        <div className="app-card p-8 shadow-sm">
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
              เข้าสู่ระบบ
            </h1>
            <p className="text-[#5c6b73] text-sm">ระบบตรวจสอบการส่งข้อมูล</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#0b3d4a] mb-2">
                ชื่อผู้ใช้
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="app-input w-full px-4 py-3"
                placeholder="กรอกชื่อผู้ใช้"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#0b3d4a] mb-2">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="app-input w-full px-4 py-3"
                placeholder="กรอกรหัสผ่าน"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
