/**
 * DOSYA AMACI: Bir bölümün D1 yaşam döngüsü: silmeden önce etkinin ölçülmesi,
 * MANTIKSAL silme (soft delete) kaskadı, geri getirme ve liderlik sayacı geri
 * alma ifadelerinin kurulması.
 * bkz. .plans/yayin-hazirlik/02-veri-dayanikliligi.md §3.1
 */

import { deleteSkippedLevelsStatement } from './skipLevel/skippedLevels';


export interface LevelDeletionImpact {
  /** Map of uid → { stars, isFirstCompletion } for rebuilding leaderboard counters */
  affectedUsers: Array<{
    uid: string;
    stars: number;
  }>;
  /** uid of the player who held the world record (best move_count) for this level, if any */
  worldRecordHolderUid: string | null;
}

/**
 * Reads all played_levels rows for a level before deleting them.
 * Returns the data needed to roll back leaderboard counters.
 */
// Bir seviye silinmeden önce, bu seviyeden etkilenen oyuncuları ve dünya rekoru sahibini tespit eder.
export async function getLevelDeletionImpact(
  db: D1Database,
  levelId: string,
): Promise<LevelDeletionImpact> {
  const rows = await db
    .prepare(
      `SELECT uid, stars, move_count FROM played_levels
       WHERE level_id = ?1 AND deleted_at IS NULL
       ORDER BY move_count ASC`,
    )
    .bind(levelId)
    .all<{ uid: string; stars: number; move_count: number }>();

  const affectedUsers = rows.results.map((r) => ({ uid: r.uid, stars: r.stars }));
  const worldRecordHolderUid = rows.results[0]?.uid ?? null;

  return { affectedUsers, worldRecordHolderUid };
}

/**
 * Bir seviyenin tüm ilerleme kayıtlarını MANTIKSAL olarak siler (soft delete) ve
 * tombstone yazar. Liderlik sayaçları geri alındıktan SONRA çağrılır.
 *
 * Satırlar diskte kalır: `deleted_at` dolar, okuma sorguları onları görmez.
 * İstemci tarafındaki etki değişmez — GET /played-levels kaydı döndürmez ve
 * `deletedLevelIds` tombstone'u Dexie'yi temizler (oyuncunun gördüğü davranış aynı).
 *
 * Alternatifi neydi ve neden reddettim? Satırları `deleted_played_levels` gölge
 *   tablosuna TAŞIMAK. Reddedildi: taşıma iki ifadeye bölünür, D1 batch'i yarıda
 *   kalırsa satır hiçbir tabloda olmaz; ayrıca her yeni kaynak tablo yeni bir
 *   gölge tablo ister.
 * Yeni bir tablo eklenince bu dosya değişmek zorunda mı? Hayır — kaskada giren
 *   her tablo kendi servisinde kendi "soft delete ifadesi"ni üretir
 *   (bkz. `deleteSkippedLevelsStatement`); burası yalnızca onları batch'ler.
 * Değer eksik/NULL gelirse? `deleted_at IS NULL` canlı demektir; 0014 öncesi
 *   tüm satırlar canlıdır. Migration uygulanmadan bu kod çalışırsa UPDATE
 *   "no such column" ile patlar ve batch tamamen geri alınır — yani veri yine
 *   kaybolmaz, işlem başarısız olur.
 */
// Seviyeye ait tüm oynama kayıtlarını mantıksal olarak siler ve silinme geçmişine (tombstones) ekler.
export async function deleteLevelRecords(
  db: D1Database,
  levelId: string,
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `UPDATE played_levels
         SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE level_id = ?1 AND deleted_at IS NULL`,
      )
      .bind(levelId),
    deleteSkippedLevelsStatement(db, levelId),
    db
      .prepare(
        `INSERT OR IGNORE INTO deleted_levels (level_id) VALUES (?1)`,
      )
      .bind(levelId),
  ]);
}

/**
 * Soft delete'in karşılığı: bir seviyenin mantıksal olarak silinmiş ilerleme
 * kayıtlarını geri getirir ve tombstone'u kaldırır.
 *
 * Bu fonksiyon liderlik sayaçlarına DOKUNMAZ. Geri yükleme sonrası
 * `services/recovery/recomputeUserScores` çağrılmalıdır — sayaçları elle
 * "geri artırmak" yerine kaynaktan yeniden hesaplamak idempotenttir ve
 * yarım kalan bir geri yüklemede sayacı şişirmez.
 * Bkz. docs/release/veri-kurtarma.md.
 *
 * @returns Geri getirilen played_levels satır sayısı.
 */
export async function restoreLevelRecords(
  db: D1Database,
  levelId: string,
): Promise<{ restoredRows: number }> {
  const [played] = await db.batch([
    db
      .prepare(
        `UPDATE played_levels
         SET deleted_at = NULL,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE level_id = ?1 AND deleted_at IS NOT NULL`,
      )
      .bind(levelId),
    db
      .prepare(
        `UPDATE skipped_levels
         SET deleted_at = NULL,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE level_id = ?1 AND deleted_at IS NOT NULL`,
      )
      .bind(levelId),
    db.prepare(`DELETE FROM deleted_levels WHERE level_id = ?1`).bind(levelId),
  ]);

  return { restoredRows: played.meta?.changes ?? 0 };
}

/**
 * Bir seviyenin silinmesinin kaç satırı etkileyeceğini ÖNCEDEN sayar.
 * Yıkıcı admin uç noktaları bu sayıyı onay öncesinde döndürür
 * (bkz. services/recovery/confirmDestructive.ts).
 */
export async function countLevelDeletionRows(
  db: D1Database,
  levelId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM played_levels  WHERE level_id = ?1 AND deleted_at IS NULL) +
         (SELECT COUNT(*) FROM skipped_levels WHERE level_id = ?1 AND deleted_at IS NULL) AS n`,
    )
    .bind(levelId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// ─── Liderlik sayacı geri alma ────────────────────────────────────────────────

export interface RollbackInput extends LevelDeletionImpact {
  /** Bölümün yapımcısı (Firestore `levels/{id}.createdBy`); yoksa null. */
  createdBy: string | null;
}

/**
 * Bölüm silinirken liderlik sayaçlarını geri alan D1 ifadelerini kurar.
 * Route katmanı bu ifadeleri yalnızca `db.batch()` ile çalıştırır — karar
 * mantığı burada, uç noktada değil.
 *
 * Tüm azaltmalar `MAX(0, ...)` ile sınırlanır: sayaç negatife düşemez (şema
 * CHECK kısıtı da bunu reddederdi ve tüm batch geri alınırdı).
 *
 * Alternatifi neydi ve neden reddettim? Silme sonrası doğrudan
 *   `recomputeUserScores` çağırmak. Reddedildi: yeniden hesaplama yalnızca
 *   audit kanıtı olan periyotlara dokunabilir; eski periyotlar düzeltilmeden
 *   kalırdı. Geri alma, silme anındaki tam bilgiyle çalışır.
 * Yeni bir türetilmiş tablo eklenince bu fonksiyon değişir mi? Evet — ve bu
 *   doğrudur: yeni bir sayaç, silme anında nasıl geri alınacağına dair bir
 *   karar gerektirir; sessizce bozuk kalmasındansa burada görünür olsun.
 * Değer eksik/null gelirse? `createdBy` null ise yapımcı satırı hiç üretilmez;
 *   `worldRecordHolderUid` null ise rekor satırı üretilmez. Boş dizi dönmesi
 *   geçerli bir sonuçtur (etkilenen kimse yok).
 */
export function buildLeaderboardRollbackStatements(
  db: D1Database,
  input: RollbackInput,
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];
  const { affectedUsers, worldRecordHolderUid, createdBy } = input;

  // period_type/period_id geçmişe aittir: kullanıcının TÜM periyot satırlarından düşülür.
  for (const { uid, stars } of affectedUsers) {
    statements.push(
      db
        .prepare(
          `UPDATE user_period_scores
           SET stars_gained = MAX(0, stars_gained - ?2),
               levels_done  = MAX(0, levels_done - 1),
               updated_at   = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE uid = ?1`,
        )
        .bind(uid, stars),
    );
  }

  if (worldRecordHolderUid) {
    statements.push(
      db
        .prepare(
          `UPDATE user_world_records
           SET records_count = MAX(0, records_count - 1),
               updated_at    = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE uid = ?1 AND period_type = 'all_time' AND period_id = 'all_time'`,
        )
        .bind(worldRecordHolderUid),
    );
  }

  if (createdBy) {
    const totalStarsEarned = affectedUsers.reduce((sum, u) => sum + u.stars, 0);
    const totalPlays = affectedUsers.length;
    statements.push(
      db
        .prepare(
          `UPDATE creator_scores
           SET plays_gained = MAX(0, plays_gained - ?2),
               stars_gained = MAX(0, stars_gained - ?3),
               updated_at   = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE uid = ?1`,
        )
        .bind(createdBy, totalPlays, totalStarsEarned),
    );
  }

  return statements;
}
