
/**
 * DOSYA AMACI: Bu dosya, kullanıcı profillerini (isim, tag, sergilenen rozetler) 
 * D1 veritabanındaki önbellek tablosuna (user_profiles) yazan ve güncelleyen fonksiyonları barındırır.
 */

/**
 * Upsert a user profile in the user_profiles table.
 * Resolves potential uniqueness violations on the 'tag' column by setting the tag of any other owner to null beforehand.
 */
// Kullanıcı profil bilgilerini ve rozetlerini D1 veritabanına ekler veya günceller; tag benzersizliğini korur.
export async function upsertUserProfile(
  db: D1Database,
  uid: string,
  displayName: string,
  tag: string | null,
  showcaseBadges: any[] | string,
  xp?: number | null,
): Promise<void> {
  const jsonBadges = typeof showcaseBadges === 'string' ? showcaseBadges : JSON.stringify(showcaseBadges);

  if (tag) {
    // Evict the tag from any other user to satisfy the UNIQUE constraint in SQLite.
    // In Firestore, tag registry ensures only one user owns a tag at any time.
    await db
      .prepare('UPDATE user_profiles SET tag = NULL WHERE tag = ?1 COLLATE NOCASE AND uid != ?2')
      .bind(tag, uid)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO user_profiles (uid, display_name, tag, showcase_badges, xp, updated_at)
       VALUES (?1, ?2, ?3, ?4, COALESCE(?5, 0), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(uid)
       DO UPDATE SET
         display_name = excluded.display_name,
         tag = excluded.tag,
         showcase_badges = excluded.showcase_badges,
         xp = CASE WHEN ?5 IS NOT NULL THEN ?5 ELSE user_profiles.xp END,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
    )
    .bind(uid, displayName, tag, jsonBadges, xp !== undefined && xp !== null ? xp : null)
    .run();
}
