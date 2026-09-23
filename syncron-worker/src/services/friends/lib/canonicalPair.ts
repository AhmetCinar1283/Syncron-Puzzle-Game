/**
 * DOSYA AMACI: Arkadaşlık satırlarının birincil anahtarı için SAF yardımcılar.
 * `friendships` tablosu `CHECK (user_a < user_b)` kısıtına sahiptir; iki kullanıcı
 * arasındaki ilişki her zaman tek bir satırla temsil edilir. Burada hiçbir D1,
 * Hono veya Firestore bilgisi yoktur.
 */

export interface CanonicalPair {
  user_a: string;
  user_b: string;
}

/** İki uid'i tablo kısıtına uygun (küçük olan `user_a`) sıraya koyar. */
export function getCanonicalKeys(uid1: string, uid2: string): CanonicalPair {
  return uid1 < uid2 ? { user_a: uid1, user_b: uid2 } : { user_a: uid2, user_b: uid1 };
}

/** URL parametresinden gelen uid kabul edilebilir mi (boş değil, 128 karakteri aşmıyor). */
export function isAcceptableUidParam(uid: string | undefined): uid is string {
  return !!uid && uid.length <= 128;
}
