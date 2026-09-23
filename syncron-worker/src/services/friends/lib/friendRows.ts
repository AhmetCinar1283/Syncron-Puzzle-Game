/**
 * DOSYA AMACI: D1 satırlarını API yanıt nesnelerine çeviren SAF dönüştürücüler ve
 * sıralama ölçütleri. Rozet listesi D1'de JSON metni olarak durduğu için burada
 * çözülür; bozuk JSON yanıtı düşürmez, yalnızca boş liste üretir.
 * Veritabanı, Firestore ve HTTP bilgisi yoktur — bu yüzden birim testlidir.
 */

/** Profil alanları D1'de LEFT JOIN ile geldiği için hepsi eksik olabilir. */
export interface ProfileRow {
  displayName?: string | null;
  tag?: string | null;
  showcaseBadges?: unknown;
}

export interface FriendRow extends ProfileRow {
  friendUid: string;
  friendsSince?: string | null;
}

export interface FriendRequestRow extends ProfileRow {
  requesterUid: string;
  requestedAt?: string | null;
}

export interface BlockedRow extends ProfileRow {
  blockedUid: string;
}

export interface SearchRow extends ProfileRow {
  uid: string;
  friendshipStatus?: string | null;
  friendshipRequestedBy?: string | null;
}

/** Profil yoksa istemciye gösterilen ad. */
export const FALLBACK_DISPLAY_NAME = 'Player';

/**
 * Rozet listesini normalize eder: JSON metni çözülür, dizi olduğu gibi geçer,
 * başka her şey (null, sayı, bozuk metin) boş listeye düşer.
 *
 * NOT: JSON metni dizi DEĞİLSE (ör. `"null"`) çözülen değer olduğu gibi geçer —
 * bu, uç noktanın bugünkü davranışıdır ve refactor sırasında bilinçli olarak
 * korunmuştur. Bu yüzden dönüş tipi `unknown`, `unknown[]` değildir.
 */
export function parseShowcaseBadges(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('Failed to parse showcaseBadges JSON:', e);
      return [];
    }
  }
  if (Array.isArray(value)) return value;
  return [];
}

export function toFriendEntry(row: FriendRow) {
  return {
    uid: row.friendUid,
    displayName: row.displayName ?? FALLBACK_DISPLAY_NAME,
    tag: row.tag,
    showcaseBadges: parseShowcaseBadges(row.showcaseBadges),
    friendsSince: row.friendsSince,
  };
}

export function toRequestEntry(row: FriendRequestRow) {
  return {
    uid: row.requesterUid,
    displayName: row.displayName ?? FALLBACK_DISPLAY_NAME,
    tag: row.tag,
    showcaseBadges: parseShowcaseBadges(row.showcaseBadges),
    requestedAt: row.requestedAt,
  };
}

export function toBlockedEntry(row: BlockedRow) {
  return {
    uid: row.blockedUid,
    displayName: row.displayName ?? FALLBACK_DISPLAY_NAME,
    tag: row.tag,
    showcaseBadges: parseShowcaseBadges(row.showcaseBadges),
  };
}

export function toSearchEntry(row: SearchRow) {
  return {
    uid: row.uid,
    displayName: row.displayName ?? FALLBACK_DISPLAY_NAME,
    tag: row.tag,
    showcaseBadges: parseShowcaseBadges(row.showcaseBadges),
    friendshipStatus: row.friendshipStatus ?? 'none',
    friendshipRequestedBy: row.friendshipRequestedBy ?? null,
  };
}

/** Arkadaş listesi: ada göre, büyük/küçük harf duyarsız artan. */
export function compareByDisplayName(a: ProfileRow, b: ProfileRow): number {
  const nameA = (a.displayName ?? FALLBACK_DISPLAY_NAME).toLowerCase();
  const nameB = (b.displayName ?? FALLBACK_DISPLAY_NAME).toLowerCase();
  return nameA.localeCompare(nameB);
}

/** İstek listesi: en yeni istek önce. */
export function compareByRequestedAtDesc(a: FriendRequestRow, b: FriendRequestRow): number {
  const dateA = new Date(a.requestedAt ?? 0).getTime();
  const dateB = new Date(b.requestedAt ?? 0).getTime();
  return dateB - dateA;
}
