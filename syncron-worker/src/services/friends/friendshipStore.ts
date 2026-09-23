/**
 * DOSYA AMACI: Arkadaşlık modülünün TEK D1 erişim katmanı. Tüm sorgular burada,
 * hepsi `.bind()` ile parametreli. Karar mantığı yoktur (o `lib/friendPolicy.ts`
 * içindedir), HTTP bilgisi yoktur; yalnızca satır okur/yazar.
 */

import type { ExistingFriendship } from './lib/friendPolicy';
import type { BlockedRow, FriendRequestRow, FriendRow, SearchRow } from './lib/friendRows';
import type { CanonicalPair } from './lib/canonicalPair';

/** İki kullanıcı arasındaki ilişki satırı (yoksa `null`). */
export async function getFriendship(
  db: D1Database,
  pair: CanonicalPair,
): Promise<ExistingFriendship | null> {
  return await db
    .prepare('SELECT status, requested_by FROM friendships WHERE user_a = ?1 AND user_b = ?2')
    .bind(pair.user_a, pair.user_b)
    .first<ExistingFriendship>();
}

/** Yalnızca durum bilgisi gereken akışlar için (arkadaş silme). */
export async function getFriendshipStatus(
  db: D1Database,
  pair: CanonicalPair,
): Promise<{ status: string } | null> {
  return await db
    .prepare('SELECT status FROM friendships WHERE user_a = ?1 AND user_b = ?2')
    .bind(pair.user_a, pair.user_b)
    .first<{ status: string }>();
}

/** Kullanıcının kabul edilmiş arkadaş sayısı. */
export async function countAcceptedFriends(db: D1Database, uid: string): Promise<number | null> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) as count FROM friendships WHERE (user_a = ?1 OR user_b = ?1) AND status = 'accepted'",
    )
    .bind(uid)
    .first<{ count: number }>();
  return row ? row.count : null;
}

/** Kullanıcının gönderdiği ve hâlâ bekleyen istek sayısı. */
export async function countPendingOutgoing(db: D1Database, uid: string): Promise<number | null> {
  const row = await db
    .prepare("SELECT COUNT(*) as count FROM friendships WHERE requested_by = ?1 AND status = 'pending'")
    .bind(uid)
    .first<{ count: number }>();
  return row ? row.count : null;
}

export async function insertPendingFriendship(
  db: D1Database,
  pair: CanonicalPair,
  requestedBy: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO friendships (user_a, user_b, status, requested_by, created_at, updated_at)
         VALUES (?1, ?2, 'pending', ?3, ?4, ?4)`,
    )
    .bind(pair.user_a, pair.user_b, requestedBy, now)
    .run();
}

export async function markFriendshipAccepted(
  db: D1Database,
  pair: CanonicalPair,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE friendships
         SET status = 'accepted', updated_at = ?3
         WHERE user_a = ?1 AND user_b = ?2`,
    )
    .bind(pair.user_a, pair.user_b, now)
    .run();
}

export async function deleteFriendship(db: D1Database, pair: CanonicalPair): Promise<void> {
  await db
    .prepare('DELETE FROM friendships WHERE user_a = ?1 AND user_b = ?2')
    .bind(pair.user_a, pair.user_b)
    .run();
}

/** Var olan ilişkiyi engellemeye çevirir; `requested_by` engelleyene geçer. */
export async function markFriendshipBlocked(
  db: D1Database,
  pair: CanonicalPair,
  blockerUid: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE friendships
           SET status = 'blocked', requested_by = ?3, updated_at = ?4
           WHERE user_a = ?1 AND user_b = ?2`,
    )
    .bind(pair.user_a, pair.user_b, blockerUid, now)
    .run();
}

export async function insertBlockedFriendship(
  db: D1Database,
  pair: CanonicalPair,
  blockerUid: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO friendships (user_a, user_b, status, requested_by, created_at, updated_at)
           VALUES (?1, ?2, 'blocked', ?3, ?4, ?4)`,
    )
    .bind(pair.user_a, pair.user_b, blockerUid, now)
    .run();
}

/** D1 profil önbelleğinde tag ile arama (büyük/küçük harf duyarsız). */
export async function findProfileUidByTag(db: D1Database, tag: string): Promise<{ uid: string } | null> {
  return await db
    .prepare('SELECT uid FROM user_profiles WHERE tag = ?1 COLLATE NOCASE')
    .bind(tag)
    .first<{ uid: string }>();
}

/** D1 profil önbelleğinde uid doğrulaması. */
export async function findProfileByUid(db: D1Database, uid: string): Promise<{ uid: string } | null> {
  return await db
    .prepare('SELECT uid FROM user_profiles WHERE uid = ?1')
    .bind(uid)
    .first<{ uid: string }>();
}

export async function listFriendRows(db: D1Database, uid: string): Promise<FriendRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
           CASE WHEN f.user_a = ?1 THEN f.user_b ELSE f.user_a END AS friendUid,
           p.display_name AS displayName,
           p.tag,
           p.showcase_badges AS showcaseBadges,
           f.created_at AS friendsSince
         FROM friendships f
         LEFT JOIN user_profiles p ON p.uid = CASE WHEN f.user_a = ?1 THEN f.user_b ELSE f.user_a END
         WHERE (f.user_a = ?1 OR f.user_b = ?1) AND f.status = 'accepted'`,
    )
    .bind(uid)
    .all<FriendRow>();
  return results ?? [];
}

export async function listIncomingRequestRows(
  db: D1Database,
  uid: string,
): Promise<FriendRequestRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
           CASE WHEN f.user_a = ?1 THEN f.user_b ELSE f.user_a END AS requesterUid,
           p.display_name AS displayName,
           p.tag,
           p.showcase_badges AS showcaseBadges,
           f.created_at AS requestedAt
         FROM friendships f
         LEFT JOIN user_profiles p ON p.uid = CASE WHEN f.user_a = ?1 THEN f.user_b ELSE f.user_a END
         WHERE (f.user_a = ?1 OR f.user_b = ?1)
           AND f.status = 'pending'
           AND f.requested_by != ?1`,
    )
    .bind(uid)
    .all<FriendRequestRow>();
  return results ?? [];
}

export async function listBlockedRows(db: D1Database, uid: string): Promise<BlockedRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
           CASE WHEN f.user_a = ?1 THEN f.user_b ELSE f.user_a END AS blockedUid,
           p.display_name AS displayName,
           p.tag,
           p.showcase_badges AS showcaseBadges
         FROM friendships f
         LEFT JOIN user_profiles p ON p.uid = CASE WHEN f.user_a = ?1 THEN f.user_b ELSE f.user_a END
         WHERE (f.user_a = ?1 OR f.user_b = ?1)
           AND f.status = 'blocked'
           AND f.requested_by = ?1`,
    )
    .bind(uid)
    .all<BlockedRow>();
  return results ?? [];
}

/** Tag ile kullanıcı arama: engellenmiş ilişkiler ve arayanın kendisi hariç. */
export async function searchProfilesByTag(
  db: D1Database,
  tag: string,
  callerUid: string,
): Promise<SearchRow[]> {
  const { results } = await db
    .prepare(
      `SELECT
           p.uid,
           p.display_name AS displayName,
           p.tag,
           p.showcase_badges AS showcaseBadges,
           f.status AS friendshipStatus,
           f.requested_by AS friendshipRequestedBy
         FROM user_profiles p
         LEFT JOIN friendships f ON
           ((f.user_a = ?2 AND f.user_b = p.uid) OR (f.user_a = p.uid AND f.user_b = ?2))
         WHERE p.tag = ?1 COLLATE NOCASE
           AND p.uid != ?2
           AND (f.status IS NULL OR f.status != 'blocked')`,
    )
    .bind(tag, callerUid)
    .all<SearchRow>();
  return results ?? [];
}

/** Kanonik sıra bilinmeden iki kullanıcı arasındaki ilişkiyi arar (arama akışı). */
export async function findFriendshipEitherDirection(
  db: D1Database,
  uid: string,
  targetUid: string,
): Promise<ExistingFriendship | null> {
  return await db
    .prepare(
      `SELECT status, requested_by FROM friendships
                   WHERE (user_a = ?1 AND user_b = ?2) OR (user_a = ?2 AND user_b = ?1)`,
    )
    .bind(uid, targetUid)
    .first<ExistingFriendship>();
}
