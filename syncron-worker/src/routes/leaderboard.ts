/**
 * DOSYA AMACI: Bu dosya, oyuncuların yıldız sayısı, seviye sayısı, rekor sayısı
 * ve seviye tasarımcısı gibi kategorilerde günlük, haftalık, aylık ve tüm zamanlar liderlik tablolarını getiren API ucunu tanımlar.
 *
 * Anonim oyuncular (`user_profiles.is_ranked = 0`) hiçbir listede, sayımda ya da
 * sıra hesabında yer almaz; yalnızca kendi sıralarını, listelenen oyunculara
 * göre görürler.
 */

import { Hono } from 'hono';
import type { AppContext } from '../types';
import { optionalFirebaseAuth } from '../middleware/auth';
import { leaderboardQuerySchema } from '../schemas/leaderboard';
import { getCurrentPeriodIds, markRanked, rankedUidClause } from '../services/leaderboard';

export const leaderboardRouter = new Hono<AppContext>();

/**
 * Okuma yüzeyi kapalıyken (bkz. `Env.LEADERBOARD_ENABLED`) rota hiç yokmuş gibi
 * davranır: `app.notFound` ile birebir aynı yanıt. Skorlar yazılmaya devam eder.
 */
export function isLeaderboardEnabled(env: { LEADERBOARD_ENABLED?: string }): boolean {
  return env.LEADERBOARD_ENABLED === 'true';
}

leaderboardRouter.use('/leaderboard/*', async (c, next) => {
  if (!isLeaderboardEnabled(c.env)) return c.text('Not Found', 404);
  await next();
});

const VALID_COMBINATIONS: Record<string, string[]> = {
  stars: ['daily', 'weekly', 'all_time'],
  levels: ['daily', 'weekly', 'all_time'],
  records: ['daily', 'weekly', 'all_time'],
  creators: ['monthly', 'all_time'],
};

interface DbEntryRow {
  uid: string;
  displayName: string | null;
  tag: string | null;
  showcaseBadges?: string | null;
  value: number;
  rank?: number;
}

interface ViewerRow {
  displayName: string | null;
  tag: string | null;
  showcaseBadges: string | null;
  isRanked: number;
}

interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  tag: string | null;
  showcaseBadges: unknown[];
  value: number;
}

interface UserScoreRow {
  score_val: number;
  secondary_val?: number;
  updated_at: string;
}

// Önbellekteki rozet JSON'unu çözer; bozuksa boş liste döner.
function parseShowcaseBadges(raw: string | null | undefined): unknown[] {
  if (typeof raw !== 'string') return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse showcaseBadges JSON:', e);
    return [];
  }
}

// İlgili kategori ve periyottaki liderlik tablosunu, giriş yapan kullanıcının sırası ve arkadaş filtreleriyle birlikte getirir.
leaderboardRouter.get('/leaderboard/:category/:period', optionalFirebaseAuth, async (c) => {
  const category = c.req.param('category');
  const period = c.req.param('period');

  // 1. Validate category and period combinations
  if (!VALID_COMBINATIONS[category]) {
    return c.json({ success: false, error: 'Invalid category' }, 400);
  }
  if (!VALID_COMBINATIONS[category].includes(period)) {
    return c.json({ success: false, error: 'Invalid period for this category' }, 400);
  }

  // 2. Validate query parameters
  const queryParams = {
    limit: c.req.query('limit'),
    around_me: c.req.query('around_me'),
    friends_only: c.req.query('friends_only'),
  };
  const validation = leaderboardQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    const error = validation.error.errors[0]?.message || 'Invalid query parameters';
    return c.json({ success: false, error }, 400);
  }

  const { limit, around_me, friends_only } = validation.data;
  const uid = c.get('uid');

  // 3. Authorization check for around_me / friends_only
  if (around_me && !uid) {
    return c.json({ success: false, error: 'Authentication required for around_me' }, 401);
  }
  if (friends_only && !uid) {
    return c.json({ success: false, error: 'Authentication required for friends_only' }, 401);
  }

  // 4. Determine periodId
  const nowPeriods = getCurrentPeriodIds();
  let periodId = '';
  if (period === 'all_time') {
    periodId = 'all_time';
  } else if (period === 'daily') {
    periodId = nowPeriods.daily;
  } else if (period === 'weekly') {
    periodId = nowPeriods.weekly;
  } else if (period === 'monthly') {
    periodId = nowPeriods.monthly;
  }

  // Allow custom periodId via query parameter if validated
  const periodIdQuery = c.req.query('periodId');
  if (periodIdQuery) {
    let isValidFormat = false;
    if (period === 'daily' && /^\d{4}-\d{2}-\d{2}$/.test(periodIdQuery)) {
      isValidFormat = true;
    } else if (period === 'weekly' && /^\d{4}-W\d{2}$/.test(periodIdQuery)) {
      isValidFormat = true;
    } else if (period === 'monthly' && /^\d{4}-\d{2}$/.test(periodIdQuery)) {
      isValidFormat = true;
    } else if (period === 'all_time' && periodIdQuery === 'all_time') {
      isValidFormat = true;
    }

    if (!isValidFormat) {
      return c.json({ success: false, error: 'Invalid periodId format for this period type' }, 400);
    }
    periodId = periodIdQuery;
  }

  // 5. Determine D1 table and columns
  let tableName = '';
  let valueCol = '';
  if (category === 'stars') {
    tableName = 'user_period_scores';
    valueCol = 'stars_gained';
  } else if (category === 'levels') {
    tableName = 'user_period_scores';
    valueCol = 'levels_done';
  } else if (category === 'records') {
    tableName = 'user_world_records';
    valueCol = 'records_count';
  } else if (category === 'creators') {
    tableName = 'creator_scores';
    valueCol = 'plays_gained';
  }

  const db = c.env.AUDIT_DB;
  const isCreators = category === 'creators';
  const ranked = rankedUidClause('s.uid');
  // Sıralama ölçütü: skor (azalan), eşitlikte önce ulaşan üstte.
  const orderBy = isCreators
    ? 's.plays_gained DESC, s.stars_gained DESC, s.updated_at ASC'
    : `s.${valueCol} DESC, s.updated_at ASC`;

  try {
    // Anonim oyuncu hiçbir listede yer almaz ama kendi sırasını görebilir.
    // Doğrulanmış oyuncunun bayrağı burada da tazelenir (eski satırlar için).
    let viewer: ViewerRow | null = null;
    if (uid) {
      if (c.get('emailVerified') === true) {
        await markRanked(db, uid).catch((err) => console.error('[LeaderboardAPI] markRanked failed:', err));
      }
      viewer = await db
        .prepare('SELECT display_name AS displayName, tag, showcase_badges AS showcaseBadges, is_ranked AS isRanked FROM user_profiles WHERE uid = ?1')
        .bind(uid)
        .first<ViewerRow>();
    }
    const viewerRanked = viewer?.isRanked === 1;

    // Fetch friends list if friends_only=true
    let allowedUids: string[] = [];
    if (friends_only && uid) {
      try {
        const { results } = await db.prepare(`
          SELECT CASE WHEN user_a = ?1 THEN user_b ELSE user_a END AS friendUid
          FROM friendships
          WHERE (user_a = ?1 OR user_b = ?1) AND status = 'accepted'
        `).bind(uid).all<{ friendUid: string }>();
        const friendUids = results?.map(r => r.friendUid) ?? [];
        allowedUids = [uid, ...friendUids];
      } catch (err) {
        console.error('[LeaderboardAPI] Failed to fetch friends list:', err);
        return c.json({ success: false, error: 'Database error' }, 500);
      }
    }
    // Arkadaş kapsamı: `firstIdx`, çağıran sorgudaki ilk boş `?N` numarasıdır.
    const friendClause = (firstIdx: number) =>
      friends_only ? ` AND s.uid IN (${allowedUids.map((_, i) => `?${firstIdx + i}`).join(', ')})` : '';
    const friendParams = friends_only ? allowedUids : [];

    // 6. Query Total Players (yalnızca listelenebilir oyuncular)
    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM ${tableName} s WHERE s.period_type = ?1 AND s.period_id = ?2 AND ${ranked}${friendClause(3)}`
    ).bind(period, periodId, ...friendParams).first<{ total: number }>();
    const totalPlayers = countResult?.total ?? 0;

    let myRank: number | null = null;
    let myValue = uid ? 0 : null;

    let userScoreRow: UserScoreRow | null = null;

    // 7. Get logged-in user's stats
    if (uid) {
      const scoreQuery = `SELECT ${valueCol} AS score_val, ${isCreators ? 'stars_gained AS secondary_val, ' : ''}updated_at FROM ${tableName} WHERE uid = ?1 AND period_type = ?2 AND period_id = ?3`;
      const userRow = await db.prepare(scoreQuery).bind(uid, period, periodId).first<UserScoreRow>();
      if (userRow) {
        userScoreRow = userRow;
        myValue = userRow.score_val;

        // Sıra = kendinden iyi olan LİSTELENEBİLİR oyuncu sayısı + 1. Kendi satırı
        // katı eşitsizliklerle zaten sayılmaz; anonim de bu sayede gerçek sırasını görür.
        const better = isCreators
          ? {
              cond: '(s.plays_gained > ?3 OR (s.plays_gained = ?3 AND s.stars_gained > ?4) OR (s.plays_gained = ?3 AND s.stars_gained = ?4 AND s.updated_at < ?5))',
              params: [userRow.score_val, userRow.secondary_val ?? 0, userRow.updated_at],
            }
          : {
              cond: `(s.${valueCol} > ?3 OR (s.${valueCol} = ?3 AND s.updated_at < ?4))`,
              params: [userRow.score_val, userRow.updated_at],
            };
        const rankResult = await db.prepare(`
          SELECT COUNT(*) + 1 AS rank
          FROM ${tableName} s
          WHERE s.period_type = ?1 AND s.period_id = ?2
            AND ${better.cond}
            AND ${ranked}${friendClause(3 + better.params.length)}
        `).bind(period, periodId, ...better.params, ...friendParams).first<{ rank: number }>();
        myRank = rankResult?.rank ?? null;
      }
    }

    const select = `
      s.uid, p.display_name AS displayName, p.tag, p.showcase_badges AS showcaseBadges,
      s.${valueCol} AS value`;
    const from = `${tableName} s LEFT JOIN user_profiles p ON s.uid = p.uid`;
    const toEntry = (row: DbEntryRow, rank: number): LeaderboardEntry => ({
      rank,
      uid: row.uid,
      displayName: row.displayName ?? 'Player',
      tag: row.tag,
      showcaseBadges: parseShowcaseBadges(row.showcaseBadges),
      value: row.value,
    });

    let entries: LeaderboardEntry[] = [];

    // 8. Fetch Entries
    if (around_me && uid && myRank !== null && userScoreRow) {
      // Fetch ±5 around user using window function CTE. Anonim izleyici listede
      // olmadığı için altındaki satırlar bir basamak kayar; kendisi ayrıca eklenir.
      const rankAtMe = myRank;
      const minRank = Math.max(1, rankAtMe - 5);
      const maxRank = viewerRanked ? rankAtMe + 5 : rankAtMe + 4;
      const { results } = await db.prepare(`
        WITH Ranked AS (
          SELECT ${select}, ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS rank
          FROM ${from}
          WHERE s.period_type = ?1 AND s.period_id = ?2 AND ${ranked}${friendClause(5)}
        )
        SELECT uid, displayName, tag, showcaseBadges, value, rank
        FROM Ranked
        WHERE rank BETWEEN ?3 AND ?4
      `).bind(period, periodId, minRank, maxRank, ...friendParams).all<DbEntryRow>();

      entries = results.map((row) => {
        const r = row.rank ?? 0;
        return toEntry(row, viewerRanked || r < rankAtMe ? r : r + 1);
      });
      if (!viewerRanked) {
        // Yalnızca kendi yanıtında, kendi satırı: hiçbir listede görünmez.
        entries.push(toEntry({
          uid,
          displayName: viewer?.displayName ?? null,
          tag: viewer?.tag ?? null,
          showcaseBadges: viewer?.showcaseBadges ?? null,
          value: userScoreRow.score_val,
        }, rankAtMe));
        entries.sort((a, b) => a.rank - b.rank);
      }
    } else {
      // Standard top list query
      const { results } = await db.prepare(`
        SELECT ${select}
        FROM ${from}
        WHERE s.period_type = ?1 AND s.period_id = ?2 AND ${ranked}${friendClause(4)}
        ORDER BY ${orderBy}
        LIMIT ?3
      `).bind(period, periodId, limit, ...friendParams).all<DbEntryRow>();

      entries = results.map((row, idx) => toEntry(row, idx + 1));
    }

    return c.json({
      success: true,
      category,
      period,
      periodId,
      entries,
      myRank,
      myValue,
      myRanked: uid ? viewerRanked : null,
      totalPlayers,
    });
  } catch (err) {
    console.error(`[LeaderboardAPI] Failed to fetch leaderboard:`, err);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }
});
