/**
 * DOSYA AMACI: Günlük bulmacanın oyuncu uç noktaları (ince katman; kurallar services/daily).
 *
 *   GET  /daily/archive?days=        — geçmiş bulmacalar (kullanıcı varsa resmî yıldızıyla)
 *   GET  /daily/streak               — seri özeti
 *   GET  /daily/leaderboard/:date    — günlük liderlik (+ kullanıcının sırası)
 *   GET  /daily/:date                — 'today' veya 'YYYY-MM-DD': oynatılacak bulmaca
 *   POST /daily/complete             — hamleleri doğrular; bugünse resmî sonucu kaydeder
 */

import { Hono } from 'hono';
import type { AppContext } from '../types';
import { firebaseAuth, optionalFirebaseAuth } from '../middleware/auth';
import { checkActiveBan } from '../services/banService';
import { writeAuditLog } from '../services/auditLog';
import { completeDailySchema } from '../schemas/daily';
import { isValidDate, utcDate } from '../services/daily/dailyDate';
import { DAILY_POLICY } from '../services/daily/dailyPolicy';
import { completeDaily } from '../services/daily/completeDaily';
import { getArchiveView, getDailyPuzzleView, getStreakView } from '../services/daily/dailyView';
import { getDailyLeaderboard, getDailyRank, getOfficialResult } from '../services/daily/dailyResults';
import { grantDailyXp } from '../services/daily/dailyXp';
import { rateLimit } from '../middleware/rateLimiter';
import { trackSecurityEvent } from '../middleware/securityTrail';

export const dailyRouter = new Hono<AppContext>();

dailyRouter.get('/daily/archive', optionalFirebaseAuth, async (c) => {
  const days = Number(c.req.query('days') ?? 30);
  try {
    const entries = await getArchiveView(c.env.AUDIT_DB, c.get('uid'), Number.isFinite(days) ? days : 30);
    return c.json({ success: true, entries });
  } catch (err) {
    console.error('[Daily] archive failed:', err);
    return c.json({ success: false, error: 'Failed to load archive' }, 500);
  }
});

dailyRouter.get('/daily/streak', firebaseAuth, async (c) => {
  try {
    return c.json({ success: true, streak: await getStreakView(c.env.AUDIT_DB, c.get('uid')) });
  } catch (err) {
    console.error('[Daily] streak failed:', err);
    return c.json({ success: false, error: 'Failed to load streak' }, 500);
  }
});

dailyRouter.get('/daily/leaderboard/:date', optionalFirebaseAuth, async (c) => {
  const date = c.req.param('date');
  if (!isValidDate(date) || date > utcDate()) return c.json({ success: false, error: 'invalid-date' }, 400);
  const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 50) || 50, 1), DAILY_POLICY.leaderboardMaxLimit);
  const uid = c.get('uid');
  try {
    const [board, myRank, mine] = await Promise.all([
      getDailyLeaderboard(c.env.AUDIT_DB, date, limit),
      uid ? getDailyRank(c.env.AUDIT_DB, uid, date) : Promise.resolve(null),
      uid ? getOfficialResult(c.env.AUDIT_DB, uid, date) : Promise.resolve(null),
    ]);
    return c.json({
      success: true,
      date,
      total: board.total,
      entries: board.entries,
      me: mine ? { rank: myRank, moveCount: mine.move_count, timeSpent: mine.time_spent, stars: mine.stars, hinted: mine.hinted === 1 } : null,
    });
  } catch (err) {
    console.error('[Daily] leaderboard failed:', err);
    return c.json({ success: false, error: 'Failed to load leaderboard' }, 500);
  }
});

dailyRouter.get('/daily/:date', optionalFirebaseAuth, async (c) => {
  const param = c.req.param('date');
  const date = param === 'today' ? utcDate() : param;
  try {
    const view = await getDailyPuzzleView(c.env.AUDIT_DB, c.get('uid'), date);
    if (!view) return c.json({ success: false, error: 'invalid-date' }, 400);
    return c.json({ success: true, ...view });
  } catch (err) {
    console.error('[Daily] puzzle view failed:', err);
    return c.json({ success: false, error: 'Failed to load daily puzzle' }, 500);
  }
});

dailyRouter.post('/daily/complete', firebaseAuth, rateLimit('daily-complete'), async (c) => {
  const uid = c.get('uid');
  if (await checkActiveBan(c.env.AUDIT_DB, uid, 'platform')) {
    trackSecurityEvent(c, 'ban.blocked', { banType: 'platform' });
    return c.json({ success: false, error: 'Account suspended' }, 403);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON' }, 400);
  }
  const validation = completeDailySchema.safeParse(body);
  if (!validation.success) {
    return c.json({ success: false, error: validation.error.errors[0]?.message || 'Invalid request' }, 400);
  }

  try {
    const outcome = await completeDaily(c.env.AUDIT_DB, { uid, ...validation.data });
    if (!outcome.ok) {
      // 05 §3.2 — günlük bulmacada da reddedilen çözüm iddiası adli iz bırakır.
      // Karar `completeDaily`'de (saf); route yalnızca sonucu izlere çevirir.
      if (outcome.error === 'invalid-solution') {
        trackSecurityEvent(c, 'solution.invalid', {
          date: validation.data.date,
          moveCount: validation.data.moves.length,
          surface: 'daily',
        });
      }
      return c.json({ success: false, error: outcome.error }, outcome.status);
    }

    const { response, xpDelta } = outcome;
    if (xpDelta > 0) {
      // XP yazımı başarısız olursa resmî sonuç ve seri yine geçerlidir (loglanır).
      c.executionCtx.waitUntil(
        grantDailyXp(c.env, uid, xpDelta).catch((err) => console.error('[Daily] XP grant failed:', err)),
      );
    }
    c.executionCtx.waitUntil(
      writeAuditLog(c.env.AUDIT_DB, uid, 'daily.complete', 'game', {
        date: response.date,
        moveCount: response.moveCount,
        stars: response.stars,
        hinted: response.hinted,
        isOfficial: response.isOfficial,
        isArchive: response.isArchive,
      }).catch((err) => console.error('[AuditLog] daily.complete write failed:', err)),
    );
    return c.json(response);
  } catch (err) {
    console.error('[Daily] complete failed:', err);
    return c.json({ success: false, error: 'Failed to save daily result' }, 500);
  }
});
