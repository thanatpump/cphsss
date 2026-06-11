import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/database';

/** แปลง YYYY-MM-DD เป็น ddmmyyyy (รูปแบบใน authen_code) */
function isoToDbDate(isoDate: string): string | null {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${day}${month}${year}`;
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface MonthRange {
  key: string;
  year: number;
  month: number;
  label: string;
  start: string;
  end: string;
}

function getLastMonths(count: number, ref: Date = new Date()): MonthRange[] {
  const months: MonthRange[] = [];
  const cursor = new Date(ref.getFullYear(), ref.getMonth(), 1);

  for (let i = 0; i < count; i++) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const start = new Date(year, cursor.getMonth(), 1);
    const lastDay = new Date(year, cursor.getMonth() + 1, 0);
    const today = new Date(ref);
    today.setHours(0, 0, 0, 0);
    const endDate = lastDay > today ? today : lastDay;

    const label = start.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    months.push({
      key: `${year}-${String(month).padStart(2, '0')}`,
      year,
      month,
      label,
      start: toIsoDate(start),
      end: toIsoDate(endDate),
    });

    cursor.setMonth(cursor.getMonth() - 1);
  }

  return months;
}

function appendHospitalFilter(
  query: string,
  params: any[],
  currentUser: { role: string; hospital_name?: string },
  allowedHospitals: string[],
  useInListForServer: boolean
): { query: string; params: any[] } {
  if (currentUser.role !== 'admin_server' && currentUser.hospital_name) {
    query += ' AND COALESCE(u.hospital_name, ls.hosname) = ?';
    params.push(currentUser.hospital_name);
  } else if (useInListForServer && allowedHospitals.length > 0) {
    query += ` AND COALESCE(u.hospital_name, ls.hosname) IN (${allowedHospitals.map(() => '?').join(', ')})`;
    params.push(...allowedHospitals);
  }
  return { query, params };
}

async function countUniqueInRange(
  db: any,
  startIso: string,
  endIso: string,
  currentUser: { role: string; hospital_name?: string },
  allowedHospitals: string[]
): Promise<number> {
  let query = `
    SELECT COUNT(DISTINCT ac.citizen_id) AS total_unique
    FROM authen_code ac
    LEFT JOIN sso_user u ON ac.hcode = u.username
    LEFT JOIN login_sks ls ON ac.hcode = ls.user_sks
    WHERE STR_TO_DATE(ac.date, '%d%m%Y') >= ?
      AND STR_TO_DATE(ac.date, '%d%m%Y') <= ?
      AND COALESCE(u.hospital_name, ls.hosname) IS NOT NULL
      AND COALESCE(u.hospital_name, ls.hosname) != ''
  `;
  let params: any[] = [startIso, endIso];
  ({ query, params } = appendHospitalFilter(query, params, currentUser, allowedHospitals, true));

  const [rows]: any[] = await db.query(query, params);
  return Number(rows[0]?.total_unique) || 0;
}

async function getHospitalCountsInRange(
  db: any,
  startIso: string,
  endIso: string,
  currentUser: { role: string; hospital_name?: string },
  allowedHospitals: string[]
): Promise<Map<string, number>> {
  let query = `
    SELECT
      COALESCE(u.hospital_name, ls.hosname) AS hospital_name,
      COUNT(DISTINCT ac.citizen_id) AS service_count
    FROM authen_code ac
    LEFT JOIN sso_user u ON ac.hcode = u.username
    LEFT JOIN login_sks ls ON ac.hcode = ls.user_sks
    WHERE STR_TO_DATE(ac.date, '%d%m%Y') >= ?
      AND STR_TO_DATE(ac.date, '%d%m%Y') <= ?
      AND COALESCE(u.hospital_name, ls.hosname) IS NOT NULL
      AND COALESCE(u.hospital_name, ls.hosname) != ''
  `;
  let params: any[] = [startIso, endIso];
  ({ query, params } = appendHospitalFilter(query, params, currentUser, allowedHospitals, false));
  query += ' GROUP BY COALESCE(u.hospital_name, ls.hosname)';

  const [rows]: any[] = await db.query(query, params);
  return new Map(rows.map((r: any) => [r.hospital_name, Number(r.service_count) || 0]));
}

async function resolveUserContext(db: any, userId: string) {
  const [userRows]: any[] = await db.query(
    'SELECT role, hospital_name FROM sso_user WHERE id = ? AND status = "active"',
    [userId]
  );

  if (userRows.length === 0) {
    return { error: 'ไม่พบข้อมูลผู้ใช้หรือบัญชียังไม่ได้รับการอนุมัติ', status: 401 as const };
  }

  const currentUser = userRows[0];
  const allowedRoles = ['admin_server', 'admin_rps', 'user'];

  if (!allowedRoles.includes(currentUser.role)) {
    return { error: 'ไม่มีสิทธิ์เข้าถึง', status: 403 as const };
  }

  let hospitalQuery = '';
  let hospitalParams: string[] = [];

  if (currentUser.role === 'admin_server') {
    hospitalQuery = `SELECT DISTINCT hospital_name
                     FROM sso_user
                     WHERE hospital_name IS NOT NULL AND hospital_name != ''
                     ORDER BY hospital_name ASC`;
  } else if (currentUser.hospital_name) {
    hospitalQuery = `SELECT DISTINCT hospital_name
                     FROM sso_user
                     WHERE hospital_name = ?
                     ORDER BY hospital_name ASC`;
    hospitalParams = [currentUser.hospital_name];
  } else {
    return { error: 'ไม่พบข้อมูลสถานบริการ', status: 403 as const };
  }

  const [hospitalRows]: any[] = await db.query(hospitalQuery, hospitalParams);
  const allowedHospitals: string[] = hospitalRows.map((r: any) => r.hospital_name);

  return { currentUser, allowedHospitals };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || searchParams.get('admin_id');
    const mode = searchParams.get('mode') || 'daily';
    const dateParam = searchParams.get('date');
    const monthKey = searchParams.get('month');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลผู้ใช้' },
        { status: 401 }
      );
    }

    const db = await getDB();

    try {
      const ctx = await resolveUserContext(db, userId);
      if ('error' in ctx) {
        return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.status });
      }

      const { currentUser, allowedHospitals } = ctx;

      if (mode === 'recipients') {
        const hospitalName = searchParams.get('hospital_name');
        const startIso = searchParams.get('start');
        const endIso = searchParams.get('end');

        if (!hospitalName || !startIso || !endIso) {
          return NextResponse.json(
            { success: false, error: 'ต้องระบุ hospital_name, start, end' },
            { status: 400 }
          );
        }

        if (
          currentUser.role !== 'admin_server' &&
          currentUser.hospital_name &&
          currentUser.hospital_name !== hospitalName
        ) {
          return NextResponse.json(
            { success: false, error: 'ไม่มีสิทธิ์ดูข้อมูลสถานบริการนี้' },
            { status: 403 }
          );
        }

        let listQuery = `
          SELECT
            ac.citizen_id,
            ac.date,
            ac.time,
            ac.auth_type,
            ac.authen,
            DATE_FORMAT(ac.vstdate, '%Y-%m-%d') AS vstdate,
            si.hcode AS img_hcode,
            si.cid AS img_cid,
            DATE_FORMAT(si.vstdate, '%Y-%m-%d') AS img_vstdate,
            si.vn AS img_vn,
            si.hn AS img_hn,
            si.authen AS img_authen
          FROM authen_code ac
          LEFT JOIN sso_user u ON ac.hcode = u.username
          LEFT JOIN login_sks ls ON ac.hcode = ls.user_sks
          LEFT JOIN ssop_image si ON si.authen = ac.authen AND si.cid = ac.citizen_id
          WHERE COALESCE(u.hospital_name, ls.hosname) = ?
            AND STR_TO_DATE(ac.date, '%d%m%Y') >= ?
            AND STR_TO_DATE(ac.date, '%d%m%Y') <= ?
          ORDER BY STR_TO_DATE(ac.date, '%d%m%Y') DESC, ac.time DESC
        `;
        const listParams: any[] = [hospitalName, startIso, endIso];

        const [listRows]: any[] = await db.query(listQuery, listParams);
        const recipients = (listRows || []).map((r: any) => ({
          citizen_id: r.citizen_id,
          date: r.date,
          time: r.time,
          auth_type: r.auth_type || null,
          authen: r.authen,
          vstdate: r.vstdate || null,
          has_proof_image: Boolean(r.img_authen),
          image: r.img_authen
            ? {
                hcode: r.img_hcode,
                cid: r.img_cid,
                vstdate: r.img_vstdate,
                vn: r.img_vn,
                hn: r.img_hn,
                authen: r.img_authen,
              }
            : null,
        }));

        return NextResponse.json({
          success: true,
          hospital_name: hospitalName,
          start: startIso,
          end: endIso,
          recipients,
          total: recipients.length,
        });
      }

      if (mode === 'range') {
        const startIso = searchParams.get('start');
        const endIso = searchParams.get('end');

        if (!startIso || !endIso) {
          return NextResponse.json(
            { success: false, error: 'ต้องระบุ start และ end (YYYY-MM-DD)' },
            { status: 400 }
          );
        }

        if (!isoToDbDate(startIso) || !isoToDbDate(endIso)) {
          return NextResponse.json(
            { success: false, error: 'รูปแบบวันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD' },
            { status: 400 }
          );
        }

        if (startIso > endIso) {
          return NextResponse.json(
            { success: false, error: 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด' },
            { status: 400 }
          );
        }

        const countMap = await getHospitalCountsInRange(
          db,
          startIso,
          endIso,
          currentUser,
          allowedHospitals
        );

        const report = allowedHospitals.map((name) => ({
          hospital_name: name,
          service_count: countMap.get(name) || 0,
        }));

        if (currentUser.role === 'admin_server') {
          for (const [name, count] of countMap.entries()) {
            if (!allowedHospitals.includes(name)) {
              report.push({ hospital_name: name, service_count: count });
            }
          }
          report.sort((a, b) => a.hospital_name.localeCompare(b.hospital_name, 'th'));
        }

        const total = await countUniqueInRange(
          db,
          startIso,
          endIso,
          currentUser,
          allowedHospitals
        );

        const startLabel = new Date(startIso).toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const endLabel = new Date(endIso).toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

        return NextResponse.json({
          success: true,
          range: {
            start: startIso,
            end: endIso,
            label: `${startLabel} – ${endLabel}`,
            report,
            total,
          },
        });
      }

      if (mode === 'monthly') {
        const months = getLastMonths(12);
        const monthSummary = await Promise.all(
          months.map(async (m) => ({
            key: m.key,
            year: m.year,
            month: m.month,
            label: m.label,
            start: m.start,
            end: m.end,
            total: await countUniqueInRange(db, m.start, m.end, currentUser, allowedHospitals),
          }))
        );

        let monthDetail = null;
        if (monthKey) {
          const selected = months.find((m) => m.key === monthKey);
          if (selected) {
            const countMap = await getHospitalCountsInRange(
              db,
              selected.start,
              selected.end,
              currentUser,
              allowedHospitals
            );

            const report = allowedHospitals.map((name) => ({
              hospital_name: name,
              service_count: countMap.get(name) || 0,
            }));

            if (currentUser.role === 'admin_server') {
              for (const [name, count] of countMap.entries()) {
                if (!allowedHospitals.includes(name)) {
                  report.push({ hospital_name: name, service_count: count });
                }
              }
              report.sort((a, b) => a.hospital_name.localeCompare(b.hospital_name, 'th'));
            }

            const total = await countUniqueInRange(
              db,
              selected.start,
              selected.end,
              currentUser,
              allowedHospitals
            );

            monthDetail = {
              month: monthKey,
              label: selected.label,
              start: selected.start,
              end: selected.end,
              report,
              total,
            };
          }
        }

        return NextResponse.json({
          success: true,
          month_summary: monthSummary,
          month_detail: monthDetail,
        });
      }

      const today = new Date();
      const defaultIso = toIsoDate(today);
      const isoDate = dateParam || defaultIso;
      const dbDate = isoToDbDate(isoDate);

      if (!dbDate) {
        return NextResponse.json(
          { success: false, error: 'รูปแบบวันที่ไม่ถูกต้อง ใช้ YYYY-MM-DD' },
          { status: 400 }
        );
      }

      const countMap = await getHospitalCountsInRange(
        db,
        isoDate,
        isoDate,
        currentUser,
        allowedHospitals
      );

      const report = allowedHospitals.map((name) => ({
        hospital_name: name,
        service_count: countMap.get(name) || 0,
      }));

      if (currentUser.role === 'admin_server') {
        for (const [name, count] of countMap.entries()) {
          if (!allowedHospitals.includes(name)) {
            report.push({ hospital_name: name, service_count: count });
          }
        }
        report.sort((a, b) => a.hospital_name.localeCompare(b.hospital_name, 'th'));
      }

      const totalByHospital = report.reduce((sum, row) => sum + row.service_count, 0);
      const totalUnique = await countUniqueInRange(db, isoDate, isoDate, currentUser, allowedHospitals);

      return NextResponse.json({
        success: true,
        date: isoDate,
        date_display: dbDate,
        report,
        total: totalUnique,
        total_by_hospital: totalByHospital,
      });
    } finally {
      await db.end();
    }
  } catch (error) {
    console.error('Error fetching service report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงรายงาน',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
