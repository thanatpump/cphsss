import { getDB } from '@/lib/database';

export interface AuthenStmmAccess {
  isAdmin: boolean;
  hcode: string | null;
  username: string | null;
  hospitalName: string | null;
  role: string | null;
}

export async function resolveAuthenStmmAccess(options: {
  userId?: string | null;
  userSks?: string | null;
  requestedHcode?: string | null;
}): Promise<{ access: AuthenStmmAccess } | { error: string; status: number }> {
  const userId = options.userId?.trim() || null;
  const userSks = options.userSks?.trim() || null;
  const requestedHcode = options.requestedHcode?.trim() || null;

  if (userId) {
    const db = await getDB();
    try {
      const [rows]: any[] = await db.query(
        'SELECT id, username, role, hospital_name, status FROM sso_user WHERE id = ? AND status = "active"',
        [userId]
      );
      if (!rows.length) {
        return { error: 'ไม่พบข้อมูลผู้ใช้หรือบัญชียังไม่ได้รับการอนุมัติ', status: 401 };
      }

      const user = rows[0];
      const isAdmin = user.role === 'admin_server' || user.role === 'admin_rps';

      if (!isAdmin) {
        return {
          access: {
            isAdmin: false,
            hcode: String(user.username ?? ''),
            username: String(user.username ?? ''),
            hospitalName: String(user.hospital_name ?? ''),
            role: String(user.role ?? ''),
          },
        };
      }

      if (requestedHcode) {
        return {
          access: {
            isAdmin: true,
            hcode: requestedHcode,
            username: String(user.username ?? ''),
            hospitalName: String(user.hospital_name ?? ''),
            role: String(user.role ?? ''),
          },
        };
      }

      return {
        access: {
          isAdmin: true,
          hcode: null,
          username: String(user.username ?? ''),
          hospitalName: String(user.hospital_name ?? ''),
          role: String(user.role ?? ''),
        },
      };
    } finally {
      await db.end();
    }
  }

  if (userSks) {
    const db = await getDB();
    try {
      const [rows]: any[] = await db.query(
        'SELECT user_sks, hosname FROM login_sks WHERE user_sks = ? LIMIT 1',
        [userSks]
      );
      return {
        access: {
          isAdmin: false,
          hcode: userSks,
          username: userSks,
          hospitalName: rows[0]?.hosname ? String(rows[0].hosname) : null,
          role: 'login_sks',
        },
      };
    } finally {
      await db.end();
    }
  }

  return { error: 'ต้องระบุ user_id หรือ user_sks', status: 401 };
}
