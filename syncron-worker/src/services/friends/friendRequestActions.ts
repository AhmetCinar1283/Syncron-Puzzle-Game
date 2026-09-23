/**
 * DOSYA AMACI: Arkadaşlık isteği yaşam döngüsünün sunucu uygulaması — gönderme,
 * kabul, ret ve arkadaşlığı sonlandırma. Kurallar `lib/friendPolicy.ts`, veri
 * erişimi `friendshipStore.ts`, Firestore köprüsü `profileCacheSync.ts`
 * dosyalarındadır; burada yalnızca sıralama (orkestrasyon) vardır.
 */

import { getCanonicalKeys } from './lib/canonicalPair';
import {
  rejectForOwnFriendLimit,
  rejectForPendingOutgoingLimit,
  rejectForTargetFriendLimit,
  rejectPendingDecision,
  rejectRequestForExisting,
} from './lib/friendPolicy';
import {
  countAcceptedFriends,
  countPendingOutgoing,
  deleteFriendship,
  findProfileByUid,
  findProfileUidByTag,
  getFriendship,
  getFriendshipStatus,
  insertPendingFriendship,
  markFriendshipAccepted,
} from './friendshipStore';
import {
  cacheProfileFromFirestore,
  canUseFirestoreFallback,
  openFirestoreAccess,
  resolveUidFromTag,
} from './profileCacheSync';
import { ACTION_OK, fail, type ActionOutcome, type FriendsEnv } from './types';

export interface FriendRequestInput {
  targetUid?: string;
  targetTag?: string;
}

/**
 * Tag'i uid'e çevirir. Önce D1 önbelleği, bulunamazsa Firestore. Firestore
 * denemesi başarısız olursa istek düşmez; yalnızca "bulunamadı" sonucu üretir.
 */
async function resolveTargetByTag(env: FriendsEnv, targetTag: string): Promise<string | null> {
  const db = env.AUDIT_DB;
  let profile = await findProfileUidByTag(db, targetTag);

  if (!profile && canUseFirestoreFallback(env.GOOGLE_SERVICE_ACCOUNT)) {
    try {
      const { projectId, adminToken } = await openFirestoreAccess(env);
      const resolvedUid = await resolveUidFromTag(projectId, adminToken, targetTag);
      if (resolvedUid) {
        const cached = await cacheProfileFromFirestore(db, projectId, adminToken, resolvedUid);
        if (cached) profile = { uid: resolvedUid };
      }
    } catch (fallbackErr) {
      console.error('[FriendsAPI] Firestore tag resolution fallback failed:', fallbackErr);
    }
  }

  return profile ? profile.uid : null;
}

/** Verilen uid gerçekten var mı? Önbellekte yoksa Firestore'dan doğrulanır. */
async function targetUidExists(env: FriendsEnv, targetUid: string): Promise<boolean> {
  const db = env.AUDIT_DB;
  let profile = await findProfileByUid(db, targetUid);

  if (!profile && canUseFirestoreFallback(env.GOOGLE_SERVICE_ACCOUNT)) {
    try {
      const { projectId, adminToken } = await openFirestoreAccess(env);
      const cached = await cacheProfileFromFirestore(db, projectId, adminToken, targetUid);
      if (cached) profile = { uid: targetUid };
    } catch (fallbackErr) {
      console.error('[FriendsAPI] Firestore UID verification fallback failed:', fallbackErr);
    }
  }

  return profile !== null;
}

/** POST /friends/request — tag ya da uid ile arkadaşlık isteği gönderir. */
export async function sendFriendRequest(
  env: FriendsEnv,
  uid: string,
  input: FriendRequestInput,
): Promise<ActionOutcome> {
  const db = env.AUDIT_DB;
  let targetUid = input.targetUid;

  if (input.targetTag) {
    try {
      const resolved = await resolveTargetByTag(env, input.targetTag);
      if (!resolved) {
        return fail({ error: 'User profile with this tag not found', httpStatus: 404 });
      }
      targetUid = resolved;
    } catch (err) {
      console.error('[FriendsAPI] Tag resolution database error:', err);
      return fail({ error: 'Database error', httpStatus: 500 });
    }
  } else if (targetUid) {
    try {
      if (!(await targetUidExists(env, targetUid))) {
        return fail({ error: 'User profile not found', httpStatus: 404 });
      }
    } catch (err) {
      console.error('[FriendsAPI] Profile verification database error:', err);
      return fail({ error: 'Database error', httpStatus: 500 });
    }
  }

  if (!targetUid) {
    return fail({ error: 'Could not resolve target user UID', httpStatus: 400 });
  }
  if (targetUid === uid) {
    return fail({ error: 'Cannot send friend request to yourself', httpStatus: 400 });
  }

  const pair = getCanonicalKeys(uid, targetUid);

  try {
    const existingRejection = rejectRequestForExisting(await getFriendship(db, pair), uid);
    if (existingRejection) return fail(existingRejection);

    const friendLimitRejection = rejectForOwnFriendLimit(await countAcceptedFriends(db, uid));
    if (friendLimitRejection) return fail(friendLimitRejection);

    const pendingRejection = rejectForPendingOutgoingLimit(await countPendingOutgoing(db, uid));
    if (pendingRejection) return fail(pendingRejection);

    await insertPendingFriendship(db, pair, uid, new Date().toISOString());
    return ACTION_OK;
  } catch (err) {
    console.error('[FriendsAPI] Friend request insertion failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}

/** POST /friends/accept — gelen isteği onaylar; iki tarafın da sınırı kontrol edilir. */
export async function acceptFriendRequest(
  env: FriendsEnv,
  uid: string,
  targetUid: string,
): Promise<ActionOutcome> {
  const db = env.AUDIT_DB;
  const pair = getCanonicalKeys(uid, targetUid);

  try {
    const pendingRejection = rejectPendingDecision(await getFriendship(db, pair), uid, 'accept');
    if (pendingRejection) return fail(pendingRejection);

    const callerRejection = rejectForOwnFriendLimit(await countAcceptedFriends(db, uid));
    if (callerRejection) return fail(callerRejection);

    const targetRejection = rejectForTargetFriendLimit(await countAcceptedFriends(db, targetUid));
    if (targetRejection) return fail(targetRejection);

    await markFriendshipAccepted(db, pair, new Date().toISOString());
    return ACTION_OK;
  } catch (err) {
    console.error('[FriendsAPI] Friend request accept failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}

/** POST /friends/reject — gelen isteği siler. */
export async function rejectFriendRequest(
  env: FriendsEnv,
  uid: string,
  targetUid: string,
): Promise<ActionOutcome> {
  const db = env.AUDIT_DB;
  const pair = getCanonicalKeys(uid, targetUid);

  try {
    const pendingRejection = rejectPendingDecision(await getFriendship(db, pair), uid, 'reject');
    if (pendingRejection) return fail(pendingRejection);

    await deleteFriendship(db, pair);
    return ACTION_OK;
  } catch (err) {
    console.error('[FriendsAPI] Friend request rejection failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}

/** DELETE /friends/:uid — kabul edilmiş bir arkadaşlığı sonlandırır. */
export async function removeFriend(
  env: FriendsEnv,
  uid: string,
  targetUid: string,
): Promise<ActionOutcome> {
  const db = env.AUDIT_DB;
  const pair = getCanonicalKeys(uid, targetUid);

  try {
    const existing = await getFriendshipStatus(db, pair);
    if (!existing || existing.status !== 'accepted') {
      return fail({ error: 'Friendship not found', httpStatus: 404 });
    }

    await deleteFriendship(db, pair);
    return ACTION_OK;
  } catch (err) {
    console.error('[FriendsAPI] Friendship deletion failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}
