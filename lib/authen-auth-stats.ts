import { getDB } from '@/lib/database';
import { parseDateParam } from '@/lib/auth-date-range';

export const WITH_CARD_AUTH_TYPES = ['Auth_hospital', 'Auth_hosxp', 'Auth_OnSmartCard'] as const;
export const NO_CARD_AUTH_TYPES = ['Auth_card', 'Auth_manual', 'Auth_NoSmartCard', 'NoSmartcard'] as const;

export interface AuthVerificationStats {
  dateFrom: string | null;
  dateTo: string | null;
  hcode: string | null;
  total: number;
  with_card: number;
  no_card: number;
}

export interface AuthVerificationFacilityStats extends AuthVerificationStats {
  facility_name: string;
}

function buildFilters(options: {
  hcode?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  alias?: string;
}) {
  const params: Array<string | number> = [];
  let where = ' WHERE 1=1';
  const vstdateCol = options.alias ? `${options.alias}.vstdate` : 'vstdate';

  if (options.hcode) {
    where += options.alias ? ` AND ${options.alias}.hcode = ?` : ' AND hcode = ?';
    params.push(options.hcode);
  }

  if (options.dateFrom) {
    where += ` AND ${vstdateCol} >= ?`;
    params.push(options.dateFrom);
  }

  if (options.dateTo) {
    where += ` AND ${vstdateCol} <= ?`;
    params.push(options.dateTo);
  }

  return { where, params };
}

function mapAuthStatsRow(row: any) {
  const total = Number(row.total ?? 0);
  const with_card = Number(row.with_card ?? 0);
  const no_card = total - with_card;
  return { total, with_card, no_card };
}

export async function fetchAuthVerificationStats(options?: {
  hcode?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<AuthVerificationStats> {
  const hcode = options?.hcode?.trim() || null;
  const dateFrom = parseDateParam(options?.dateFrom);
  const dateTo = parseDateParam(options?.dateTo);
  const { where, params } = buildFilters({ hcode, dateFrom, dateTo });

  const withCardPlaceholders = WITH_CARD_AUTH_TYPES.map(() => '?').join(', ');

  const db = await getDB();
  try {
    const [rows]: any[] = await db.query(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN auth_type IN (${withCardPlaceholders}) THEN 1 ELSE 0 END) AS with_card
      FROM authen_code
      ${where}
      `,
      [...WITH_CARD_AUTH_TYPES, ...params]
    );

    const stats = mapAuthStatsRow(rows[0] || {});
    return {
      dateFrom,
      dateTo,
      hcode,
      ...stats,
    };
  } finally {
    await db.end();
  }
}

export async function fetchAuthVerificationStatsByFacility(options?: {
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<AuthVerificationFacilityStats[]> {
  const dateFrom = parseDateParam(options?.dateFrom);
  const dateTo = parseDateParam(options?.dateTo);
  const { where, params } = buildFilters({ dateFrom, dateTo, alias: 'ac' });

  const withCardPlaceholders = WITH_CARD_AUTH_TYPES.map(() => '?').join(', ');

  const db = await getDB();
  try {
    const [statsRows]: any[] = await db.query(
      `
      SELECT
        ac.hcode,
        COUNT(*) AS total,
        SUM(CASE WHEN ac.auth_type IN (${withCardPlaceholders}) THEN 1 ELSE 0 END) AS with_card
      FROM authen_code ac
      ${where.replace(' WHERE 1=1', ' WHERE ac.hcode IS NOT NULL AND ac.hcode != ""')}
      GROUP BY ac.hcode
      `,
      [...WITH_CARD_AUTH_TYPES, ...params]
    );

    const [nameRows]: any[] = await db.query(
      `
      SELECT user_sks AS hcode, hosname AS facility_name
      FROM login_sks
      UNION
      SELECT username AS hcode, hospital_name AS facility_name
      FROM sso_user
      WHERE status = 'active' AND username IS NOT NULL AND username != ''
      `
    );

    const nameMap = new Map<string, string>();
    for (const row of nameRows || []) {
      const hcode = String(row.hcode ?? '').trim();
      const facilityName = String(row.facility_name ?? '').trim();
      if (hcode && facilityName && !nameMap.has(hcode)) {
        nameMap.set(hcode, facilityName);
      }
    }

    const map = new Map<string, AuthVerificationFacilityStats>();

    const ensure = (hcode: string) => {
      if (!map.has(hcode)) {
        map.set(hcode, {
          dateFrom,
          dateTo,
          hcode,
          facility_name: nameMap.get(hcode) || hcode,
          total: 0,
          with_card: 0,
          no_card: 0,
        });
      }
      return map.get(hcode)!;
    };

    for (const row of statsRows || []) {
      const hcode = String(row.hcode ?? '').trim();
      if (!hcode) continue;
      const item = ensure(hcode);
      Object.assign(item, mapAuthStatsRow(row));
    }

    return [...map.values()]
      .filter((item) => item.total > 0)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.facility_name.localeCompare(b.facility_name, 'th');
      });
  } finally {
    await db.end();
  }
}
