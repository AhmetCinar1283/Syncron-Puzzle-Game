/**
 * DOSYA AMACI: Arkadaşlık servisinin tek public API'si. Modül dışından
 * `lib/*`, `friendshipStore` veya `profileCacheSync` doğrudan import EDİLMEZ;
 * route dosyası yalnızca buradan okur.
 */

export type { ActionOutcome, QueryOutcome, Rejection, FriendsEnv } from './types';

export {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  type FriendRequestInput,
} from './friendRequestActions';

export { blockUser, unblockUser, listBlockedUsers } from './friendBlockActions';

export { listFriends, listFriendRequests } from './friendQueries';

export { searchUsersByTag } from './userSearch';

export { isAcceptableUidParam } from './lib/canonicalPair';

export { MAX_FRIENDS, MAX_PENDING_OUTGOING_REQUESTS } from './lib/friendPolicy';
