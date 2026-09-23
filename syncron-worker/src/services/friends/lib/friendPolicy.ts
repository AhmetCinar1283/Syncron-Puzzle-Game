/**
 * DOSYA AMACI: Arkadaşlık kuralları — eşikler ve SAF karar fonksiyonları.
 * "İstek gönderilebilir mi, kabul edilebilir mi, sınır aşıldı mı" sorularının
 * yanıtı yalnızca burada verilir; veritabanı erişimi ve HTTP burada yoktur.
 * Reddedilen her karar, uç noktanın olduğu gibi döndüreceği mesajı ve HTTP
 * durumunu taşır — böylece istemcinin gördüğü metinler tek bir yerde durur.
 */

/** Bir oyuncunun sahip olabileceği en fazla arkadaş sayısı. */
export const MAX_FRIENDS = 100;
/** Aynı anda bekleyebilecek en fazla GİDEN arkadaşlık isteği sayısı. */
export const MAX_PENDING_OUTGOING_REQUESTS = 20;

export type RejectionStatus = 400 | 403 | 404 | 409 | 500;

export interface Rejection {
  error: string;
  httpStatus: RejectionStatus;
}

/** `friendships` tablosundan okunan ilişki durumu (yoksa `null`). */
export interface ExistingFriendship {
  status: string;
  requested_by: string;
}

/**
 * Yeni bir arkadaşlık isteği, mevcut ilişkinin üzerine gönderilebilir mi?
 * `null` dönerse engel yok.
 */
export function rejectRequestForExisting(
  existing: ExistingFriendship | null,
  callerUid: string,
): Rejection | null {
  if (!existing) return null;

  if (existing.status === 'accepted') {
    return { error: 'Already friends', httpStatus: 400 };
  }
  if (existing.status === 'blocked') {
    return { error: 'Action not allowed', httpStatus: 400 };
  }
  if (existing.status === 'pending') {
    if (existing.requested_by === callerUid) {
      return { error: 'Friend request already pending', httpStatus: 400 };
    }
    return {
      error: 'You have a pending request from this user. Accept it instead.',
      httpStatus: 400,
    };
  }
  return null;
}

/** İsteği gönderen/kabul eden kişinin arkadaş sınırı doldu mu? */
export function rejectForOwnFriendLimit(friendCount: number | null | undefined): Rejection | null {
  if (friendCount !== null && friendCount !== undefined && friendCount >= MAX_FRIENDS) {
    return { error: `You have reached the maximum limit of ${MAX_FRIENDS} friends`, httpStatus: 400 };
  }
  return null;
}

/** Karşı tarafın arkadaş sınırı doldu mu (yalnızca kabul akışında bakılır)? */
export function rejectForTargetFriendLimit(friendCount: number | null | undefined): Rejection | null {
  if (friendCount !== null && friendCount !== undefined && friendCount >= MAX_FRIENDS) {
    return { error: 'The other user has reached their friend limit', httpStatus: 400 };
  }
  return null;
}

/** Bekleyen giden istek sınırı doldu mu? */
export function rejectForPendingOutgoingLimit(pendingCount: number | null | undefined): Rejection | null {
  if (
    pendingCount !== null &&
    pendingCount !== undefined &&
    pendingCount >= MAX_PENDING_OUTGOING_REQUESTS
  ) {
    return {
      error: `You have reached the limit of ${MAX_PENDING_OUTGOING_REQUESTS} pending outgoing requests`,
      httpStatus: 400,
    };
  }
  return null;
}

/**
 * Bekleyen bir istek kabul/ret edilebilir mi? Kendi gönderdiğin isteği ne kabul
 * ne de reddedebilirsin; istek yoksa 404.
 */
export function rejectPendingDecision(
  existing: ExistingFriendship | null,
  callerUid: string,
  decision: 'accept' | 'reject',
): Rejection | null {
  if (!existing || existing.status !== 'pending') {
    return { error: 'Friend request not found', httpStatus: 404 };
  }
  if (existing.requested_by === callerUid) {
    return {
      error: decision === 'accept' ? 'Cannot accept your own request' : 'Cannot reject your own request',
      httpStatus: 400,
    };
  }
  return null;
}
