/**
 * DOSYA AMACI: Arkadaş listesi ve bekleyen istek listesi uç noktalarının sunucu
 * uygulaması. İki listenin ortak işi, D1 profil önbelleğinde eksik kalan
 * oyuncuları Firestore'dan tamamlamaktır; bu iş burada tek bir yardımcıda durur.
 */

import {
  compareByDisplayName,
  compareByRequestedAtDesc,
  toFriendEntry,
  toRequestEntry,
  type ProfileRow,
} from './lib/friendRows';
import { listFriendRows, listIncomingRequestRows } from './friendshipStore';
import {
  cacheProfilesFromFirestore,
  canUseFirestoreFallback,
  openFirestoreAccess,
} from './profileCacheSync';
import { fail, type FriendsEnv, type QueryOutcome } from './types';

/**
 * Tek istekte Firestore'dan tamamlanacak en fazla profil sayısı. Cloudflare'ın
 * "Too many subrequests" sınırına takılmamak için bilinçli olarak düşüktür.
 */
const MAX_PROFILE_SYNC_PER_REQUEST = 10;

/**
 * Profili eksik satırları Firestore'dan tamamlar. Servis hesabı yoksa ya da
 * eksik satır yoksa liste olduğu gibi döner. Firestore hatası YUTULMAZ, fırlatır —
 * çağıran kendi log metniyle yakalayıp listeyi eksik hâliyle sunar.
 */
async function fillMissingProfiles<T extends ProfileRow>(
  env: FriendsEnv,
  rows: T[],
  uidOf: (row: T) => string,
): Promise<T[]> {
  const missingUids = rows
    .filter((row) => !row.displayName)
    .map(uidOf)
    .slice(0, MAX_PROFILE_SYNC_PER_REQUEST);

  if (missingUids.length === 0 || !canUseFirestoreFallback(env.GOOGLE_SERVICE_ACCOUNT)) {
    return rows;
  }

  const { projectId, adminToken } = await openFirestoreAccess(env);
  const profileMap = await cacheProfilesFromFirestore(env.AUDIT_DB, projectId, adminToken, missingUids);

  return rows.map((row) => {
    if (!row.displayName) {
      const profile = profileMap.get(uidOf(row));
      if (profile) {
        return {
          ...row,
          displayName: profile.displayName,
          tag: profile.tag,
          showcaseBadges: profile.showcaseBadges,
        };
      }
    }
    return row;
  });
}

/** GET /friends — kabul edilmiş arkadaşlar, ada göre sıralı. */
export async function listFriends(
  env: FriendsEnv,
  uid: string,
): Promise<QueryOutcome<ReturnType<typeof toFriendEntry>[]>> {
  try {
    let rows = await listFriendRows(env.AUDIT_DB, uid);

    try {
      rows = await fillMissingProfiles(env, rows, (row) => row.friendUid);
    } catch (fallbackErr) {
      console.error('[FriendsAPI] Friends list cache sync failed:', fallbackErr);
    }

    rows.sort(compareByDisplayName);
    return { ok: true, data: rows.map(toFriendEntry) };
  } catch (err) {
    console.error('[FriendsAPI] Fetching friends list failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}

/** GET /friends/requests — kullanıcıya GELEN bekleyen istekler, en yeni önce. */
export async function listFriendRequests(
  env: FriendsEnv,
  uid: string,
): Promise<QueryOutcome<ReturnType<typeof toRequestEntry>[]>> {
  try {
    let rows = await listIncomingRequestRows(env.AUDIT_DB, uid);

    try {
      rows = await fillMissingProfiles(env, rows, (row) => row.requesterUid);
    } catch (fallbackErr) {
      console.error('[FriendsAPI] Friend requests cache sync failed:', fallbackErr);
    }

    rows.sort(compareByRequestedAtDesc);
    return { ok: true, data: rows.map(toRequestEntry) };
  } catch (err) {
    console.error('[FriendsAPI] Fetching pending requests failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}
