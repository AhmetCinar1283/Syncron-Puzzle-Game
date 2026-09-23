/**
 * DOSYA AMACI: Tag ile oyuncu arama uç noktasının sunucu uygulaması.
 * Önce D1 profil önbelleğine bakılır; sonuç yoksa Firestore `tags/` kaydına
 * düşülür, bulunan profil önbelleğe alınır ve ilişki durumuyla birlikte döner.
 * Engellenmiş ilişkiler sonuçta GÖRÜNMEZ.
 */

import { toSearchEntry, type SearchRow } from './lib/friendRows';
import { findFriendshipEitherDirection, searchProfilesByTag } from './friendshipStore';
import {
  cacheProfileFromFirestore,
  canUseFirestoreFallback,
  openFirestoreAccess,
  resolveUidFromTag,
} from './profileCacheSync';
import { fail, type FriendsEnv, type QueryOutcome } from './types';

/**
 * Önbellekte bulunamayan tag için Firestore yedeği. Bulunursa tek elemanlı
 * sonuç listesi, bulunamaz ya da ilişki engelliyse boş liste döner.
 */
async function searchViaFirestore(env: FriendsEnv, tag: string, callerUid: string): Promise<SearchRow[]> {
  const db = env.AUDIT_DB;
  const { projectId, adminToken } = await openFirestoreAccess(env);

  const targetUid = await resolveUidFromTag(projectId, adminToken, tag);
  if (!targetUid || targetUid === callerUid) return [];

  const cached = await cacheProfileFromFirestore(db, projectId, adminToken, targetUid);
  if (!cached) return [];

  const friendship = await findFriendshipEitherDirection(db, callerUid, targetUid);
  if (friendship && friendship.status === 'blocked') return [];

  return [
    {
      uid: targetUid,
      displayName: cached.displayName,
      tag: cached.tag,
      showcaseBadges: cached.showcaseBadges,
      friendshipStatus: friendship ? friendship.status : null,
      friendshipRequestedBy: friendship ? friendship.requested_by : null,
    },
  ];
}

/** GET /users/search?tag=... */
export async function searchUsersByTag(
  env: FriendsEnv,
  uid: string,
  tag: string,
): Promise<QueryOutcome<ReturnType<typeof toSearchEntry>[]>> {
  try {
    let results = await searchProfilesByTag(env.AUDIT_DB, tag, uid);

    if (results.length === 0 && tag.toUpperCase() !== '' && canUseFirestoreFallback(env.GOOGLE_SERVICE_ACCOUNT)) {
      try {
        const fallbackResults = await searchViaFirestore(env, tag, uid);
        if (fallbackResults.length > 0) {
          results = fallbackResults;
        }
      } catch (fallbackErr) {
        console.error('[FriendsAPI] Firestore search fallback failed:', fallbackErr);
      }
    }

    return { ok: true, data: results.map(toSearchEntry) };
  } catch (err) {
    console.error('[FriendsAPI] Tag search failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}
