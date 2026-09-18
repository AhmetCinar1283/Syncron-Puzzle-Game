/**
 * DOSYA AMACI: Bu dosya, oyuncuların bitirdiği seviyelere (played_levels) ait
 * verileri okuyan ve güncelleyen (upsert) veritabanı işlemlerini barındırır.
 * Bölümün silinmesi/geri getirilmesi ayrı bir dosyadadır: `levelLifecycle.ts`.
 *
 * Soft delete (migration 0014): buradaki TÜM okumalar `deleted_at IS NULL`
 * filtresi taşır. Mantıksal olarak silinmiş satır hiçbir okuma yolunda görünmez.
 */

/**
 * D1 service layer for the `played_levels` and `deleted_levels` tables.
 *
 * All playedLevel writes go through here — no Firestore subcollection involvement.
 */

import type { StarCount } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface D1PlayedLevelRow {
  uid: string;
  level_id: string;
  stars: StarCount;
  score: number;
  move_count: number;
  time_spent: number;
  completed_at: string;
  updated_at: string;
}

export interface UpsertPlayedLevelParams {
  uid: string;
  levelId: string;
  stars: StarCount;
  score: number;
  moveCount: number;
  timeSpent: number;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

/**
 * Fetch a single played_levels row for (uid, levelId).
 * Returns null if the user has not yet completed this level.
 */
// Kullanıcının belirli bir seviyeyi bitirip bitirmediğini kontrol etmek için oynama kaydını sorgular.
export async function getPlayedLevel(
  db: D1Database,
  uid: string,
  levelId: string,
): Promise<D1PlayedLevelRow | null> {
  return db
    .prepare(
      `SELECT uid, level_id, stars, score, move_count, time_spent, completed_at, updated_at
       FROM played_levels
       WHERE uid = ?1 AND level_id = ?2 AND deleted_at IS NULL`,
    )
    .bind(uid, levelId)
    .first<D1PlayedLevelRow>();
}

/**
 * Fetch all played_levels rows for a user that were updated after `since`.
 * Pass `since = null` (or omit it) to return all rows (full sync).
 *
 * Returns rows in ascending `updated_at` order so the client can use the
 * last row's `updated_at` as its next `since` cursor if needed.
 */
// Belirli bir zaman damgasından (since) sonra tamamlanan veya güncellenen seviyeleri listeler (senkronizasyon için).
export async function getPlayedLevelsSince(
  db: D1Database,
  uid: string,
  since: string | null,
): Promise<D1PlayedLevelRow[]> {
  if (since) {
    const result = await db
      .prepare(
        `SELECT uid, level_id, stars, score, move_count, time_spent, completed_at, updated_at
         FROM played_levels
         WHERE uid = ?1 AND updated_at > ?2 AND deleted_at IS NULL
         ORDER BY updated_at ASC`,
      )
      .bind(uid, since)
      .all<D1PlayedLevelRow>();
    return result.results;
  } else {
    const result = await db
      .prepare(
        `SELECT uid, level_id, stars, score, move_count, time_spent, completed_at, updated_at
         FROM played_levels
         WHERE uid = ?1 AND deleted_at IS NULL
         ORDER BY updated_at ASC`,
      )
      .bind(uid)
      .all<D1PlayedLevelRow>();
    return result.results;
  }
}

/**
 * Return level IDs that were deleted after `since` (tombstone lookup for delta sync).
 * If `since` is null, returns ALL deleted level IDs.
 */
// Belirli bir zaman damgasından (since) sonra silinmiş seviyelerin kimliklerini (IDs) getirir.
export async function getDeletedLevelsSince(
  db: D1Database,
  since: string | null,
): Promise<string[]> {
  const result = since
    ? await db
        .prepare(`SELECT level_id FROM deleted_levels WHERE deleted_at > ?1`)
        .bind(since)
        .all<{ level_id: string }>()
    : await db
        .prepare(`SELECT level_id FROM deleted_levels`)
        .all<{ level_id: string }>();

  return result.results.map((r) => r.level_id);
}

// ─── Writes ───────────────────────────────────────────────────────────────────

/**
 * UPSERT a level completion into played_levels.
 *
 * Returns `wasFirstCompletion: true` when the row was freshly INSERTed (not updated).
 * This is the authoritative source for isFirstCompletion — eliminates the race
 * condition where two concurrent requests both read the row as missing and both
 * try to increment completedCount in Firestore.
 *
 * Rules on conflict (same uid + level_id):
 *   - stars / score: only advance (MAX), never decrease
 *   - move_count: keep the lower value (best solution)
 *   - time_spent: overwrite with latest run
 *   - completed_at: keep the original first-completion timestamp
 *   - updated_at: always set to now
 *
 * Soft delete (0014) ile gelen ek kural — DİRİLTME:
 *   Satır mantıksal olarak silinmişse (`deleted_at IS NOT NULL`) çakışan satır
 *   "yok" kabul edilir: tüm alanlar yeni değerlerle EZİLİR, `deleted_at` NULL'a
 *   çekilir ve `wasFirstCompletion: true` döner.
 *   Gerekçe: silme anında liderlik sayaçları zaten geri alınmıştır
 *   (routes/playedLevels.ts Adım 3). Diriltilen satır MAX() ile eski yıldızını
 *   geri getirseydi, oyuncu geri alınmış puanı ikinci kez kazanmadan
 *   sayaçlarda tutmuş olurdu — yani silme+yeniden oynama bir puan sızıntısı
 *   üretirdi. "İlk tamamlama" sayılması da aynı sebeple doğrudur.
 *   Alternatif (reddedildi): diriltmeyi yasaklayıp 409 dönmek — oyuncu silinmiş
 *   bir kaydı olan bölümü bir daha asla kaydedemezdi (sessiz ilerleme kaybı).
 */
// Seviye bitirme kaydını veritabanına ekler veya günceller; ilk kez bitirildiyse wasFirstCompletion: true döner.
export async function upsertPlayedLevel(
  db: D1Database,
  params: UpsertPlayedLevelParams,
): Promise<{ wasFirstCompletion: boolean }> {
  const now = new Date().toISOString();

  // SQLite trick: the WHERE clause in DO UPDATE means the UPDATE only fires when
  // there is an actual improvement. If neither condition is met, nothing is written
  // (the row already has better or equal data). We track insertion vs update via
  // changes() — 1 on INSERT, 1 on UPDATE, 0 on no-op conflict.
  //
  // To reliably detect INSERT vs UPDATE we use a sentinel: set `completed_at` to
  // the insert value only on INSERT; the ON CONFLICT clause preserves the existing
  // `completed_at`. After the upsert we read `completed_at` back: if it equals
  // `now` then this was the first completion.
  const result = await db
    .prepare(
      `INSERT INTO played_levels
         (uid, level_id, stars, score, move_count, time_spent, completed_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT (uid, level_id) DO UPDATE SET
         -- Dirilme: satır silinmişse eski değerler yok sayılır (bkz. doc-comment)
         stars        = CASE WHEN played_levels.deleted_at IS NULL
                             THEN MAX(excluded.stars, played_levels.stars)
                             ELSE excluded.stars END,
         score        = CASE WHEN played_levels.deleted_at IS NULL
                             THEN MAX(excluded.score, played_levels.score)
                             ELSE excluded.score END,
         move_count   = CASE WHEN played_levels.deleted_at IS NULL
                             THEN MIN(excluded.move_count, played_levels.move_count)
                             ELSE excluded.move_count END,
         time_spent   = excluded.time_spent,
         -- Never overwrite the original completed_at timestamp (unless reviving)
         completed_at = CASE WHEN played_levels.deleted_at IS NULL
                             THEN played_levels.completed_at
                             ELSE excluded.completed_at END,
         updated_at   = excluded.updated_at,
         deleted_at   = NULL
       WHERE played_levels.deleted_at IS NOT NULL
          OR excluded.stars >= played_levels.stars
          OR excluded.move_count < played_levels.move_count
       RETURNING (completed_at = ?7) AS is_new`,
    )
    .bind(
      params.uid,
      params.levelId,
      params.stars,
      params.score,
      params.moveCount,
      params.timeSpent,
      now, // completed_at (= ?7, used in RETURNING check)
      now, // updated_at   (= ?8)
    )
    .first<{ is_new: number }>();

  // RETURNING gives us the row after write. is_new=1 means completed_at was just set
  // (INSERT path). is_new=0 means existing completed_at was preserved (UPDATE path).
  // null means the ON CONFLICT WHERE clause suppressed the update (no change needed).
  const wasFirstCompletion = result?.is_new === 1;
  return { wasFirstCompletion };
}
