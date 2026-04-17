'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
        fetchUsers(userData);
      } catch (err) {
        console.error('Error parsing user data:', err);
        router.push('/allocation-check');
      }
    } else {
      router.push('/allocation-check');
    }
  }, [router, filter]);

  const fetchUsers = async (userData: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?admin_id=${userData.id}&admin_role=${userData.role}&admin_hospital=${encodeURIComponent(userData.hospital_name || '')}`);
      const data = await res.json();
      
      if (data.success && data.users) {
        let filteredUsers = data.users;
        
        // Debug: log ข้อมูลที่ได้
        console.log('All users:', data.users);
        console.log('Filter:', filter);
        console.log('Users with status:', data.users.map((u: any) => ({ id: u.id, username: u.username, status: u.status })));
        
        // กรองตาม filter
        if (filter === 'pending') {
          filteredUsers = data.users.filter((u: any) => {
            const isPending = !u.status || u.status === 'pending' || u.status === null || u.status === '';
            console.log(`User ${u.username}: status="${u.status}", isPending=${isPending}`);
            return isPending;
          });
        } else if (filter === 'admin_rps') {
          filteredUsers = data.users.filter((u: any) => u.role === 'admin_rps');
        } else if (filter === 'active') {
          filteredUsers = data.users.filter((u: any) => u.status === 'active');
        }
        
        console.log('Filtered users:', filteredUsers.length);
        setUsers(filteredUsers);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    if (!confirm('ยืนยันการอนุมัติผู้ใช้นี้?')) return;
    
    setActionLoading(`approve-${userId}`);
    try {
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          admin_id: user?.id
        })
      });

      const data = await res.json();
      
      if (data.success) {
        alert('ยืนยันผู้ใช้สำเร็จ');
        fetchUsers(user);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    // ไม่ต้อง confirm ถ้าเปลี่ยน role (เพราะเป็น dropdown)
    setActionLoading(`role-${userId}`);
    try {
      const res = await fetch('/api/admin/change-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          new_role: newRole,
          admin_id: user?.id
        })
      });

      const data = await res.json();
      
      if (data.success) {
        // ไม่ต้อง alert (เปลี่ยน role แล้ว refresh ข้อมูล)
        fetchUsers(user);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('ยืนยันการลบผู้ใช้นี้? (จะเปลี่ยนสถานะเป็น inactive)')) return;
    
    setActionLoading(`delete-${userId}`);
    try {
      const res = await fetch(`/api/admin/delete-user?user_id=${userId}&admin_id=${user?.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      
      if (data.success) {
        alert('ลบผู้ใช้สำเร็จ');
        fetchUsers(user);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      pending: <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">รอยืนยัน</span>,
      active: <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">ใช้งาน</span>,
      inactive: <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">ระงับ</span>
    };
    return badges[status] || badges.pending;
  };

  const getRoleBadge = (role: string) => {
    const badges: any = {
      user: <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">User</span>,
      admin_rps: <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">Admin รพสต</span>,
      admin_server: <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">Admin เซิฟ</span>
    };
    return badges[role] || badges.user;
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
              <Link href="/admin" className="mr-4 text-gray-600 hover:text-gray-900">
                ← กลับ
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้</h1>
                <p className="text-sm text-gray-600">ดู แก้ไข และจัดการผู้ใช้ทั้งหมด</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex gap-4">
            <Link
              href="/admin/users?filter=all"
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ทั้งหมด
            </Link>
            <Link
              href="/admin/users?filter=pending"
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              รอยืนยัน
            </Link>
            <Link
              href="/admin/users?filter=active"
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'active' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ใช้งาน
            </Link>
            {user?.role === 'admin_server' && (
              <Link
                href="/admin/users?filter=admin_rps"
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  filter === 'admin_rps' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Admin รพสต
              </Link>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อผู้ใช้</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รพสต</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">บทบาท</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่สมัคร</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => {
                    const isPending = !u.status || u.status === 'pending' || u.status === null || u.status === '';
                    // admin_server ยืนยันได้ทุกคน, admin_rps ยืนยันได้เฉพาะรพสตเดียวกัน
                    const canApprove = isPending && (
                      user?.role === 'admin_server' || 
                      (user?.role === 'admin_rps' && user?.hospital_name === u.hospital_name)
                    );
                    // admin_server เท่านั้นที่เปลี่ยน role ได้
                    const canChangeRole = user?.role === 'admin_server';
                    
                    // Debug
                    console.log(`User ${u.username}: status="${u.status}", isPending=${isPending}, canApprove=${canApprove}, canChangeRole=${canChangeRole}`);
                    
                    return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{u.first_name} {u.last_name}</div>
                        <div className="text-sm text-gray-500">{u.position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.hospital_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(u.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2 items-center">
                          {/* แสดง dropdown และปุ่มยืนยันสำหรับ user ที่รอยืนยัน (pending) */}
                          {canApprove && (
                            <>
                              {/* Dropdown เลือก role (เฉพาะ admin_server) */}
                              {canChangeRole && (
                                <select
                                  value={u.role || 'user'}
                                  onChange={(e) => {
                                    const newRole = e.target.value;
                                    if (newRole !== u.role) {
                                      handleChangeRole(u.id, newRole);
                                    }
                                  }}
                                  disabled={actionLoading === `role-${u.id}`}
                                  className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                >
                                  <option value="user">User</option>
                                  <option value="admin_rps">Admin รพสต</option>
                                </select>
                              )}
                              {/* ปุ่มยืนยัน (admin_server และ admin_rps) */}
                              <button
                                onClick={() => handleApprove(u.id)}
                                disabled={actionLoading === `approve-${u.id}`}
                                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 font-semibold shadow-md transition-colors"
                              >
                                {actionLoading === `approve-${u.id}` ? 'กำลังยืนยัน...' : 'ยืนยัน'}
                              </button>
                            </>
                          )}
                          {/* แสดง dropdown สำหรับเปลี่ยน role ของ user ที่อนุมัติแล้ว (เฉพาะ admin_server) */}
                          {!isPending && canChangeRole && u.role !== 'admin_server' && (
                            <select
                              value={u.role || 'user'}
                              onChange={(e) => {
                                const newRole = e.target.value;
                                if (newRole !== u.role) {
                                  handleChangeRole(u.id, newRole);
                                }
                              }}
                              disabled={actionLoading === `role-${u.id}`}
                              className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                            >
                              <option value="user">User</option>
                              <option value="admin_rps">Admin รพสต</option>
                            </select>
                          )}
                          {(user?.role === 'admin_server' || (user?.role === 'admin_rps' && user?.hospital_name === u.hospital_name)) && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              disabled={actionLoading === `delete-${u.id}`}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              {actionLoading === `delete-${u.id}` ? 'กำลัง...' : 'ลบ'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <AdminUsersContent />
    </Suspense>
  );
}
