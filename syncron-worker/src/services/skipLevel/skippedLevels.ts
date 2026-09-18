/**
 * DOSYA AMACI: `skipped_levels` tablosunun D1 işlemleri. Tüm okuma/yazmalar `uid`
 * ile sınırlıdır. Bu tablo skor taşımaz; played_levels'a hiçbir şey yazılmaz.
 */

export interface D1SkippedLevelRow {
  level_id: string;
  skipped_at: string;
  updated_at: string;
}

/**
 * Atlama kaydını yazar. Aynı level için tekrar çağrılırsa hiçbir şey değiştirmez
 * (claim yeniden teslim edildiğinde güvenle tekrar çağrılabilir).
 *
 * Soft delete (0014): satır mantıksal olarak silinmişse INSERT OR IGNORE hiçbir
 * şey yapmaz — bu bilinçlidir. Silinmiş atlama kaydını geri getirmek bir kurtarma
 * işidir (`restoreLevelRecords`), normal ödül akışının işi değildir.
 */
export async function insertSkippedLevel(
  db: D1Database,
  p: { uid: string; levelId: string; levelVersion: number | null; grantId: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO skipped_levels (uid, level_id, level_version, grant_id)
       VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(p.uid, p.levelId, p.levelVersion, p.grantId)
    .run();
}

export async function isLevelSkipped(db: D1Database, uid: string, levelId: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT 1 AS x FROM skipped_levels WHERE uid = ?1 AND level_id = ?2 AND deleted_at IS NULL')
    .bind(uid, levelId)
    .first<{ x: number }>();
  return row !== null;
}

/** Atlanmış ama henüz gerçekten çözülmemiş (played_levels'ta olmayan) level sayısı. */
export async function countOpenSkips(db: D1Database, uid: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM skipped_levels AS s
       WHERE s.uid = ?1 AND s.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM played_levels AS p
           WHERE p.uid = s.uid AND p.level_id = s.level_id AND p.deleted_at IS NULL
         )`,
    )
    .bind(uid)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Delta sync: `since` sonrasında yazılan kayıtlar (`null` → hepsi). */
export async function getSkippedLevelsSince(
  db: D1Database,
  uid: string,
  since: string | null,
): Promise<D1SkippedLevelRow[]> {
  const result = since
    ? await db
        .prepare(
          `SELECT level_id, skipped_at, updated_at FROM skipped_levels
           WHERE uid = ?1 AND updated_at > ?2 AND deleted_at IS NULL ORDER BY updated_at ASC`,
        )
        .bind(uid, since)
        .all<D1SkippedLevelRow>()
    : await db
        .prepare(
          `SELECT level_id, skipped_at, updated_at FROM skipped_levels
           WHERE uid = ?1 AND deleted_at IS NULL ORDER BY updated_at ASC`,
        )
        .bind(uid)
        .all<D1SkippedLevelRow>();
  return result.results;
}

/**
 * Admin level silme kaskadı için ifade (deleteLevelRecords batch'ine eklenir).
 * 0014'ten beri MANTIKSAL silme: satır diskte kalır, `deleted_at` dolar.
 * Oyuncunun gördüğü sonuç aynıdır (delta sync bu satırı döndürmez).
 */
export function deleteSkippedLevelsStatement(db: D1Database, levelId: string): D1PreparedStatement {
  return db
    .prepare(
      `UPDATE skipped_levels
       SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE level_id = ?1 AND deleted_at IS NULL`,
    )
    .bind(levelId);
}
