/**
 * DOSYA AMACI: Arkadaşlık API uç noktalarının İNCE katmanı — kimlik doğrulama,
 * hız limiti, ban kontrolü, gövde/parametre doğrulaması ve servis sonucunun
 * JSON'a çevrilmesi. Tüm iş mantığı `services/friends` altındadır.
 *
 *   POST   /friends/request     — tag ya da uid ile istek gönder
 *   POST   /friends/accept      — gelen isteği kabul et
 *   POST   /friends/reject      — gelen isteği reddet
 *   DELETE /friends/:uid        — arkadaşlığı sonlandır
 *   GET    /friends             — arkadaş listesi
 *   GET    /friends/requests    — bekleyen (gelen) istekler
 *   GET    /users/search        — tag ile oyuncu arama
 *   POST   /friends/block/:uid  — engelle
 *   DELETE /friends/block/:uid  — engeli kaldır
 *   GET    /friends/blocked     — engellenenler
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { z } from 'zod';
import type { AppContext } from '../types';
import { firebaseAuth } from '../middleware/auth';
import { friendRequestSchema, friendActionSchema, tagSearchSchema } from '../schemas/friends';
import { checkActiveBan } from '../services/banService';
import { rateLimit } from '../middleware/rateLimiter';
import { trackSecurityEvent } from '../middleware/securityTrail';
import {
  acceptFriendRequest,
  blockUser,
  isAcceptableUidParam,
  listBlockedUsers,
  listFriendRequests,
  listFriends,
  rejectFriendRequest,
  removeFriend,
  searchUsersByTag,
  sendFriendRequest,
  unblockUser,
  type ActionOutcome,
  type QueryOutcome,
} from '../services/friends';

export const friendsRouter = new Hono<AppContext>();

/** JSON gövdesini okur ve şemayla doğrular; hata varsa hazır yanıtı döner. */
async function readJsonBody<T extends z.ZodTypeAny>(
  c: Context<AppContext>,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { ok: false, response: c.json({ success: false, error: 'Invalid JSON' }, 400) };
  }

  const validation = schema.safeParse(body);
  if (!validation.success) {
    const error = validation.error.errors[0]?.message || 'Invalid request';
    return { ok: false, response: c.json({ success: false, error }, 400) };
  }
  return { ok: true, data: validation.data };
}

/** Servis sonucunu yanıta çevirir: başarıda `{ success: true }`. */
function actionResponse(c: Context<AppContext>, outcome: ActionOutcome) {
  if (!outcome.ok) {
    return c.json({ success: false, error: outcome.error }, outcome.httpStatus);
  }
  return c.json({ success: true });
}

/** Liste sonucunu yanıta çevirir: başarıda `{ success: true, [key]: data }`. */
function queryResponse<T>(c: Context<AppContext>, key: string, outcome: QueryOutcome<T>) {
  if (!outcome.ok) {
    return c.json({ success: false, error: outcome.error }, outcome.httpStatus);
  }
  return c.json({ success: true, [key]: outcome.data });
}

// ─── POST /friends/request ───────────────────────────────────────────────────
// Başka bir oyuncuya arkadaşlık isteği gönderir (tag veya UID ile).
friendsRouter.post('/friends/request', firebaseAuth, rateLimit('friends-request'), async (c) => {
  const uid = c.get('uid');

  // Check for active social ban
  if (await checkActiveBan(c.env.AUDIT_DB, uid, 'social')) {
    trackSecurityEvent(c, 'ban.blocked', { banType: 'social' });
    return c.json({ success: false, error: 'Social features are restricted' }, 403);
  }

  const req = await readJsonBody(c, friendRequestSchema);
  if (!req.ok) return req.response;

  return actionResponse(c, await sendFriendRequest(c.env, uid, req.data));
});

// ─── POST /friends/accept ────────────────────────────────────────────────────
// Başka bir oyuncunun gönderdiği arkadaşlık isteğini onaylar ve arkadaşlığı başlatır.
friendsRouter.post('/friends/accept', firebaseAuth, async (c) => {
  const req = await readJsonBody(c, friendActionSchema);
  if (!req.ok) return req.response;

  return actionResponse(c, await acceptFriendRequest(c.env, c.get('uid'), req.data.uid));
});

// ─── POST /friends/reject ────────────────────────────────────────────────────
// Gelen bir arkadaşlık isteğini reddeder.
friendsRouter.post('/friends/reject', firebaseAuth, async (c) => {
  const req = await readJsonBody(c, friendActionSchema);
  if (!req.ok) return req.response;

  return actionResponse(c, await rejectFriendRequest(c.env, c.get('uid'), req.data.uid));
});

// ─── DELETE /friends/:uid ────────────────────────────────────────────────────
// Mevcut bir arkadaşlığı sonlandırır (arkadaşı siler).
friendsRouter.delete('/friends/:uid', firebaseAuth, async (c) => {
  const targetUid = c.req.param('uid');
  if (!isAcceptableUidParam(targetUid)) {
    return c.json({ success: false, error: 'Invalid UID' }, 400);
  }

  return actionResponse(c, await removeFriend(c.env, c.get('uid'), targetUid));
});

// ─── GET /friends ────────────────────────────────────────────────────────────
// Kullanıcının arkadaşlarını ve profil detaylarını listeler.
friendsRouter.get('/friends', firebaseAuth, async (c) => {
  return queryResponse(c, 'friends', await listFriends(c.env, c.get('uid')));
});

// ─── GET /friends/requests ───────────────────────────────────────────────────
// Kullanıcıya gelen bekleyen arkadaşlık isteklerini listeler.
friendsRouter.get('/friends/requests', firebaseAuth, async (c) => {
  return queryResponse(c, 'requests', await listFriendRequests(c.env, c.get('uid')));
});

// ─── GET /users/search ────────────────────────────────────────────────────────
// Oyuncuları tag (etiket) bazlı aramak için kullanılır.
friendsRouter.get('/users/search', firebaseAuth, async (c) => {
  const validation = tagSearchSchema.safeParse({ tag: c.req.query('tag') });
  if (!validation.success) {
    const error = validation.error.errors[0]?.message || 'Invalid search parameters';
    return c.json({ success: false, error }, 400);
  }

  return queryResponse(c, 'users', await searchUsersByTag(c.env, c.get('uid'), validation.data.tag));
});

// ─── POST /friends/block/:uid ───────────────────────────────────────────────
// Belirtilen bir kullanıcıyı engeller.
friendsRouter.post('/friends/block/:uid', firebaseAuth, async (c) => {
  const uid = c.get('uid');
  const targetUid = c.req.param('uid');
  if (!isAcceptableUidParam(targetUid) || targetUid === uid) {
    return c.json({ success: false, error: 'Invalid target user' }, 400);
  }

  return actionResponse(c, await blockUser(c.env, uid, targetUid));
});

// ─── DELETE /friends/block/:uid ─────────────────────────────────────────────
// Engellenmiş bir kullanıcının engelini kaldırır.
friendsRouter.delete('/friends/block/:uid', firebaseAuth, async (c) => {
  const targetUid = c.req.param('uid');
  if (!isAcceptableUidParam(targetUid)) {
    return c.json({ success: false, error: 'Invalid UID' }, 400);
  }

  return actionResponse(c, await unblockUser(c.env, c.get('uid'), targetUid));
});

// ─── GET /friends/blocked ───────────────────────────────────────────────────
// Kullanıcının engellediği kişilerin listesini getirir.
friendsRouter.get('/friends/blocked', firebaseAuth, async (c) => {
  return queryResponse(c, 'blocked', await listBlockedUsers(c.env, c.get('uid')));
});
