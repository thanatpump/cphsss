'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState<string>('all'); // 'all' หรือชื่อ รพสต
  const [hospitals, setHospitals] = useState<string[]>([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    activeUsers: 0,
    adminRps: 0
  });

  useEffect(() => {
    // ตรวจสอบ authentication
    const auth = localStorage.getItem('allocation_check_auth');
    const storedUser = localStorage.getItem('allocation_check_user');

    if (auth === 'true' && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        
        // ตรวจสอบ role (ต้องเป็น admin_server หรือ admin_rps)
        if (userData.role !== 'admin_server' && userData.role !== 'admin_rps') {
          alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
          router.push('/allocation-check');
          return;
        }

        setUser(userData);
        fetchHospitals(userData);
        fetchStats(userData, 'all');
      } catch (err) {
        console.error('Error parsing user data:', err);
        router.push('/allocation-check');
      }
    } else {
      router.push('/allocation-check');
    }
  }, [router]);

  const fetchHospitals = async (userData: any) => {
    try {
      const res = await fetch(`/api/admin/hospitals?admin_id=${userData.id}&admin_role=${userData.role}&admin_hospital=${encodeURIComponent(userData.hospital_name || '')}`);
      const data = await res.json();
      
      if (data.success && data.hospitals) {
        setHospitals(data.hospitals);
      }
    } catch (err) {
      console.error('Error fetching hospitals:', err);
    } finally {
      setHospitalsLoading(false);
    }
  };

  const fetchStats = async (userData: any, hospitalFilter: string = 'all') => {
    try {
      const res = await fetch(`/api/admin/users?admin_id=${userData.id}&admin_role=${userData.role}&admin_hospital=${encodeURIComponent(userData.hospital_name || '')}`);
      const data = await res.json();
      
      if (data.success && data.users) {
        let users = data.users;
        
        // กรองตาม รพสตที่เลือก
        if (hospitalFilter !== 'all') {
          users = users.filter((u: any) => u.hospital_name === hospitalFilter);
        }
        
        setStats({
          totalUsers: users.length,
          pendingUsers: users.filter((u: any) => !u.status || u.status === 'pending' || u.status === null || u.status === '').length,
          activeUsers: users.filter((u: any) => u.status === 'active').length,
          adminRps: users.filter((u: any) => u.role === 'admin_rps').length
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalChange = (hospital: string) => {
    setSelectedHospital(hospital);
    if (user) {
      fetchStats(user, hospital);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('allocation_check_auth');
    localStorage.removeItem('allocation_check_user');
    router.push('/allocation-check');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">⚙️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">
                  {user?.role === 'admin_server' ? 'ผู้ดูแลระบบหลัก' : `ผู้ดูแล ${user?.hospital_name}`}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/allocation-check/data"
                className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                กลับไปหน้าหลัก
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">ผู้ใช้ทั้งหมด</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalUsers}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-4">
                <span className="text-3xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">รอยืนยัน</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.pendingUsers}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-4">
                <span className="text-3xl">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">ผู้ใช้ที่ใช้งาน</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stats.activeUsers}</p>
              </div>
              <div className="bg-green-100 rounded-full p-4">
                <span className="text-3xl">✅</span>
              </div>
            </div>
          </div>

          {user?.role === 'admin_server' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-semibold uppercase">Admin รพสต</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{stats.adminRps}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-4">
                  <span className="text-3xl">👑</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-gray-900">เมนูจัดการ</h2>
            {/* ฟิลเตอร์เลือก รพสต */}
            <div className="flex items-center gap-3">
              <label htmlFor="hospital-filter" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                กรองตาม รพสต:
              </label>
              {hospitalsLoading ? (
                <div className="px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
                  กำลังโหลด...
                </div>
              ) : (
                <select
                  id="hospital-filter"
                  value={selectedHospital}
                  onChange={(e) => handleHospitalChange(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium min-w-[200px]"
                >
                  <option value="all">ทั้งหมด</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital} value={hospital}>
                      {hospital}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/users"
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
            >
              <div className="flex items-center">
                <span className="text-4xl mr-4">👥</span>
                <div>
                  <h3 className="text-xl font-bold">จัดการผู้ใช้</h3>
                  <p className="text-blue-100">ดู แก้ไข ลบ ผู้ใช้</p>
                </div>
              </div>
            </Link>

            {user?.role === 'admin_server' && (
              <>
                <Link
                  href="/admin/users?filter=pending"
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-6 rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all shadow-md"
                >
                  <div className="flex items-center">
                    <span className="text-4xl mr-4">⏳</span>
                    <div>
                      <h3 className="text-xl font-bold">รอยืนยัน</h3>
                      <p className="text-yellow-100">อนุมัติผู้ใช้ใหม่</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/admin/users?filter=admin_rps"
                  className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md"
                >
                  <div className="flex items-center">
                    <span className="text-4xl mr-4">👑</span>
                    <div>
                      <h3 className="text-xl font-bold">จัดการ Admin</h3>
                      <p className="text-purple-100">ตั้งค่า Admin รพสต</p>
                    </div>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">ข้อมูลผู้ใช้</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">ชื่อ-นามสกุล</p>
              <p className="text-lg font-semibold">{user?.first_name} {user?.last_name}</p>
            </div>
            <div>
              <p className="text-gray-600">ชื่อผู้ใช้</p>
              <p className="text-lg font-semibold">{user?.username}</p>
            </div>
            <div>
              <p className="text-gray-600">บทบาท</p>
              <p className="text-lg font-semibold">
                {user?.role === 'admin_server' ? 'ผู้ดูแลระบบหลัก' : 
                 user?.role === 'admin_rps' ? 'ผู้ดูแล รพสต' : 'ผู้ใช้ทั่วไป'}
              </p>
            </div>
            <div>
              <p className="text-gray-600">รพสต</p>
              <p className="text-lg font-semibold">{user?.hospital_name || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
