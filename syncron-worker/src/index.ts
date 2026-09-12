/**
 * DOSYA AMACI: Bu dosya, Cloudflare Worker uygulamasının ana giriş noktasıdır. 
 * Hono framework'ünü başlatır, API rotalarını (routes) kaydeder ve haftalık/günlük 
 * zamanlanmış görevleri (cron triggers) yönetir.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppContext, Env } from './types';
import { gameRouter } from './routes/game';
import { ticketsRouter } from './routes/tickets';
import { internalLogRouter } from './routes/internalLog';
import { adminApiRouter } from './routes/adminApi';
import { leaderboardRouter } from './routes/leaderboard';
import { badgesRouter } from './routes/badges';
import { friendsRouter } from './routes/friends';
import { playedLevelsRouter } from './routes/playedLevels';
import { runLogRetention } from './scheduled/logRetention';
import { runBadgeDistribution } from './scheduled/badgeDistribution';
import { runAnonymousCleanup } from './scheduled/anonymousCleanup';
import { storeRouter } from './routes/store';
import { donorApiRouter } from './routes/donorApi';

const app = new Hono<AppContext>();

// Helper function to check and resolve CORS origin when multiple domains are allowed.
// Portal build'leri (CrazyGames/GameDistribution) oyunu kendi alt domain'lerinden
// (`*.crazygames.com`, `*.gamedistribution.com`) iframe içinde sunar — bu alt
// domain önceden bilinemez, bu yüzden sabit bir origin listesi bunlar için işe
// yaramaz. `*.` önekli desenler burada suffix (hostname sonu) eşleşmesiyle
// karşılanır (bkz. `.plans/monetization/02-portal-buildleri.md`).
function originMatchesPattern(origin: string, pattern: string): boolean {
  if (!pattern.startsWith('*.')) return origin === pattern;
  try {
    const { hostname } = new URL(origin);
    const suffix = pattern.slice(1); // "*.crazygames.com" -> ".crazygames.com"
    return hostname.endsWith(suffix);
  } catch {
    return false;
  }
}

function getAllowedOrigin(origin: string | undefined, allowedOriginVar: string | undefined): string {
  const allowed = allowedOriginVar || '';
  const list = allowed.split(',').map((x) => x.trim()).filter(Boolean);
  if (origin && list.some((pattern) => originMatchesPattern(origin, pattern))) {
    return origin;
  }
  return list[0] || 'http://localhost:3000';
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
// GET is required for admin read endpoints (/admin/users/:uid/logs, etc.)
// /internal/log is server-to-server only but still benefits from CORS config
// CORS politikalarını ayarlar ve belirtilen kök adrese (ALLOWED_ORIGIN) izin verir.
app.use('*', (c, next) => {
  return cors({
    origin: (origin) => getAllowedOrigin(origin, c.env.ALLOWED_ORIGIN),
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Timestamp', 'X-Signature'],
    maxAge: 86400,
  })(c, next);
});

// ─── Route handlers ───────────────────────────────────────────────────────────
app.route('/', gameRouter);
app.route('/', ticketsRouter);
app.route('/', internalLogRouter);  // POST /internal/log
app.route('/', adminApiRouter);     // GET  /admin/users/:uid/logs, etc.
app.route('/', leaderboardRouter);
app.route('/', badgesRouter);
app.route('/', friendsRouter);
app.route('/', playedLevelsRouter); // GET /played-levels, DELETE /admin/levels/:id
app.route('/', storeRouter);
app.route('/', donorApiRouter);

// ─── Error handlers ───────────────────────────────────────────────────────────
// Worker içerisinde yakalanamayan genel hataları (500) yönetir ve JSON yanıtı döner.
app.onError((err, c) => {
  console.error('Unhandled worker error:', err);
  const originHeader = c.req.header('Origin');
  const allowedOrigin = getAllowedOrigin(originHeader, c.env.ALLOWED_ORIGIN);
  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return c.json({ success: false, error: 'Internal error' }, 500);
});

// Tanımlanmamış rotalara gelen istekler için 404 yanıtı döner.
app.notFound((c) => c.text('Not Found', 404));

// ─── Exports ──────────────────────────────────────────────────────────────────
export default {
  // HTTP handler
  fetch: app.fetch,

  // Cron Trigger: runs weekly log retention (archive old logs to R2, delete from D1)
  // Schedule: "0 3 * * 0" = every Sunday at 03:00 UTC (configured in wrangler.jsonc)
  // Belirlenen zamanlanmış görevleri (cron) tetikleyerek temizlik, log arşivleme ve rozet dağıtımı yapar.
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === '0 3 * * SUN') {
      ctx.waitUntil(runLogRetention(env));
    } else if (event.cron === '5 0 * * MON') {
      ctx.waitUntil(runBadgeDistribution(env, 'weekly'));
    } else if (event.cron === '5 0 1 * *') {
      ctx.waitUntil(runBadgeDistribution(env, 'monthly'));
    } else if (event.cron === '0 4 * * *') {
      // Daily at 04:00 UTC — delete stale anonymous user data from D1.
      // Firebase Functions does the Auth+Firestore side at 04:05 UTC.
      ctx.waitUntil(runAnonymousCleanup(env));
    }
  },
};

