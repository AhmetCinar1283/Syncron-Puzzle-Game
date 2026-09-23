/**
 * DOSYA AMACI: Engelleme akışının sunucu uygulaması — engelle, engeli kaldır ve
 * engellenenleri listele. Engelleme `friendships` satırının durumunu `blocked`
 * yapar ve `requested_by` alanını ENGELLEYENE yazar; engeli yalnızca o kişi
 * kaldırabilir.
 */

import { getCanonicalKeys } from './lib/canonicalPair';
import { toBlockedEntry } from './lib/friendRows';
import {
  deleteFriendship,
  getFriendship,
  insertBlockedFriendship,
  listBlockedRows,
  markFriendshipBlocked,
} from './friendshipStore';
import { ACTION_OK, fail, type ActionOutcome, type FriendsEnv, type QueryOutcome } from './types';

/** POST /friends/block/:uid */
export async function blockUser(
  env: FriendsEnv,
  uid: string,
  targetUid: string,
): Promise<ActionOutcome> {
  const db = env.AUDIT_DB;
  const pair = getCanonicalKeys(uid, targetUid);
  const now = new Date().toISOString();

  try {
    const existing = await getFriendship(db, pair);

    if (existing) {
      if (existing.status === 'blocked') {
        return fail({ error: 'Already blocked', httpStatus: 409 });
      }
      await markFriendshipBlocked(db, pair, uid, now);
    } else {
      await insertBlockedFriendship(db, pair, uid, now);
    }

    return ACTION_OK;
  } catch (err) {
    console.error('[FriendsAPI] Blocking user failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}

/** DELETE /friends/block/:uid — engeli yalnızca engelleyen kaldırabilir. */
export async function unblockUser(
  env: FriendsEnv,
  uid: string,
  targetUid: string,
): Promise<ActionOutcome> {
  const db = env.AUDIT_DB;
  const pair = getCanonicalKeys(uid, targetUid);

  try {
    const existing = await getFriendship(db, pair);

    if (!existing || existing.status !== 'blocked') {
      return fail({ error: 'Block relationship not found', httpStatus: 404 });
    }
    if (existing.requested_by !== uid) {
      return fail({ error: 'You cannot unblock this user', httpStatus: 403 });
    }

    await deleteFriendship(db, pair);
    return ACTION_OK;
  } catch (err) {
    console.error('[FriendsAPI] Unblocking user failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}

/** GET /friends/blocked — yalnızca kullanıcının kendi engellediği kişiler. */
export async function listBlockedUsers(
  env: FriendsEnv,
  uid: string,
): Promise<QueryOutcome<ReturnType<typeof toBlockedEntry>[]>> {
  try {
    const rows = await listBlockedRows(env.AUDIT_DB, uid);
    return { ok: true, data: rows.map(toBlockedEntry) };
  } catch (err) {
    console.error('[FriendsAPI] Fetching blocked users list failed:', err);
    return fail({ error: 'Database error', httpStatus: 500 });
  }
}
