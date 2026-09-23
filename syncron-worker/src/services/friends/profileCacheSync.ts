/**
 * DOSYA AMACI: D1 profil önbelleği (`user_profiles`) ile Firestore arasındaki
 * KÖPRÜ. D1'de bulunamayan bir oyuncu Firestore'dan okunur, önbelleğe yazılır ve
 * çağırana döner. Yalnızca geçerli bir servis hesabı varsa çalışır.
 *
 * Hata politikası: buradaki fonksiyonlar hatayı YUTMAZ, fırlatır. Hangi uç
 * noktanın hangi mesajla loglayıp sessizce devam edeceğine çağıran karar verir —
 * eski davranışta her uç noktanın kendi log metni vardı ve bu korunmuştur.
 */

import { getAdminAccessToken, isValidServiceAccount } from '../serviceAccount';
import { fsGet, fromDoc } from '../firestore';
import { upsertUserProfile } from '../profiles';

/** Firestore'dan okunup önbelleğe yazılan profilin özeti. */
export interface CachedProfile {
  uid: string;
  displayName: string;
  tag: string | null;
  /** D1'deki gibi JSON METNİ — liste uç noktaları satırı bu biçimde bekliyor. */
  showcaseBadges: string;
}

/** Firestore fallback'i bu istek için hiç denenmeli mi? */
export function canUseFirestoreFallback(serviceAccount: string): boolean {
  return isValidServiceAccount(serviceAccount);
}

/** Admin erişim jetonu + proje kimliği — fallback yapan her akışın ilk adımı. */
export async function openFirestoreAccess(env: {
  GOOGLE_SERVICE_ACCOUNT: string;
  FIREBASE_PROJECT_ID: string;
}): Promise<{ projectId: string; adminToken: string }> {
  const adminToken = await getAdminAccessToken(env.GOOGLE_SERVICE_ACCOUNT);
  return { projectId: env.FIREBASE_PROJECT_ID, adminToken };
}

/**
 * `tags/{TAG}` kaydından uid çözer. Kayıt yoksa ya da uid alanı boşsa `null`.
 * Tag her zaman BÜYÜK harfle saklanır.
 */
export async function resolveUidFromTag(
  projectId: string,
  adminToken: string,
  tag: string,
): Promise<string | null> {
  const tagDoc = await fsGet(projectId, `tags/${tag.toUpperCase()}`, adminToken);
  if (!tagDoc) return null;
  const tagData = fromDoc(tagDoc);
  const resolvedUid = tagData.uid as string | undefined;
  return resolvedUid ?? null;
}

/**
 * `users/{uid}` kaydını okur, D1 önbelleğine yazar ve özetini döner.
 * Kullanıcı Firestore'da yoksa `null` döner ve hiçbir şey yazılmaz.
 */
export async function cacheProfileFromFirestore(
  db: D1Database,
  projectId: string,
  adminToken: string,
  uid: string,
): Promise<CachedProfile | null> {
  const userDoc = await fsGet(projectId, `users/${uid}`, adminToken);
  if (!userDoc) return null;

  const userData = fromDoc(userDoc);
  const displayName = typeof userData.displayName === 'string' ? userData.displayName : 'Player';
  const userTag = typeof userData.tag === 'string' ? userData.tag : null;
  const xp = typeof userData.xp === 'number' ? userData.xp : null;
  const showcaseBadges: unknown[] = Array.isArray(userData.showcaseBadges) ? userData.showcaseBadges : [];

  await upsertUserProfile(db, uid, displayName, userTag, showcaseBadges, xp);

  return {
    uid,
    displayName,
    tag: userTag,
    showcaseBadges: JSON.stringify(showcaseBadges),
  };
}

/**
 * Listelerde profili eksik kalan uid'leri toplu tamamlar. Çağıran, alt istek
 * sınırına takılmamak için listeyi zaten kırpmış olarak verir.
 */
export async function cacheProfilesFromFirestore(
  db: D1Database,
  projectId: string,
  adminToken: string,
  uids: string[],
): Promise<Map<string, CachedProfile>> {
  const synced = await Promise.all(
    uids.map((uid) => cacheProfileFromFirestore(db, projectId, adminToken, uid)),
  );
  const map = new Map<string, CachedProfile>();
  for (const profile of synced) {
    if (profile) map.set(profile.uid, profile);
  }
  return map;
}
