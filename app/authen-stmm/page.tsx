'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import AuthenStmmMatchPanel from '../components/AuthenStmmMatchPanel';

export default function AuthenStmmPage() {
  const router = useRouter();
  const { isAuthenticated, username } = useAuth();
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<{ userId?: number; userSks?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [label, setLabel] = useState('');

  useEffect(() => {
    const allocationAuth = localStorage.getItem('allocation_check_auth');
    const storedUser = localStorage.getItem('allocation_check_user');

    if (allocationAuth === 'true' && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setAuth({ userId: userData.id });
        setIsAdmin(userData.role === 'admin_server' || userData.role === 'admin_rps');
        setLabel(userData.hospital_name || userData.username || '');
        setLoading(false);
        return;
      } catch {
        router.push('/allocation-check');
        return;
      }
    }

    if (isAuthenticated && username) {
      setAuth({ userSks: username });
      setIsAdmin(false);
      setLabel(username);
      setLoading(false);
      return;
    }

    router.push('/allocation-check');
  }, [isAuthenticated, username, router]);

  if (loading || !auth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-gray-600">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">เทียบ Authen กับ STMM</h1>
            <p className="text-sm text-gray-600 mt-1">
              {label ? `สถานบริการ: ${label}` : 'แสดงเฉพาะข้อมูลของรหัสที่ล็อกอิน'}
            </p>
          </div>
          <Link
            href="/"
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuthenStmmMatchPanel
          auth={auth}
          isAdmin={isAdmin}
          title="รายงาน Authen vs STMM"
        />
      </div>
    </div>
  );
}
