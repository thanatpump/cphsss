'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthenStmmMatchPanel from '@/app/components/AuthenStmmMatchPanel';

export default function AdminAuthenStmmPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem('allocation_check_auth');
    const storedUser = localStorage.getItem('allocation_check_user');

    if (auth !== 'true' || !storedUser) {
      router.push('/allocation-check');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      if (userData.role !== 'admin_server' && userData.role !== 'admin_rps') {
        alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
        router.push('/allocation-check');
        return;
      }
      setUser(userData);
    } catch {
      router.push('/allocation-check');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-gray-600">กำลังโหลด...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">เทียบ Authen กับ STMM</h1>
            <p className="text-sm text-gray-600">Admin ดูได้ทุกสถานบริการ · กดแถวเพื่อดูรายละเอียดแต่ละ รพสต</p>
          </div>
          <Link href="/admin" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
            กลับหน้า Admin
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AuthenStmmMatchPanel
          auth={{ userId: user.id }}
          isAdmin
          title="เทียบ Authen กับ STMM (ทุกสถานบริการ)"
        />
      </div>
    </div>
  );
}
