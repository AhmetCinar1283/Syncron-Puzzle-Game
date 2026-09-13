/**
 * DOSYA AMACI: `reward_grants` tablosunun D1 işlemleri (aksiyondan bağımsız).
 * Tüm yazmalar `uid` ile sınırlıdır: bir kullanıcı başkasının kaydını okuyamaz,
 * teslim alamaz, iptal edemez ya da tüketemez.
 */

export type RewardGrantVia = 'ad' | 'ad-free' | 'free';
export const REWARD_GRANT_VIAS = ['ad', 'ad-free', 'free'] as const;

export type RewardGrantStatus = 'prepared' | 'delivered' | 'cancelled' | 'unavailable';

export interface RewardGrantRow {
  id: string;
  uid: string;
  action: string;
  level_id: string | null;
  level_version: number | null;
  input_key: string;
  status: RewardGrantStatus;
  via: RewardGrantVia | null;
  platform: string | null;
  result_json: string | null;
  reason: string | null;
  created_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  consumed_at: string | null;
}

const NOW_SQL = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

export interface InsertGrantParams {
  id: string;
  uid: string;
  action: string;
  levelId: string | null;
  levelVersion: number | null;
  inputKey: string;
  status: 'prepared' | 'unavailable';
  platform: string | null;
  resultJson: string | null;
  reason: string | null;
}

export async function insertGrant(db: D1Database, p: InsertGrantParams): Promise<void> {
  await db
    .prepare(
      `INSERT INTO reward_grants (id, uid, action, level_id, level_version, input_key, status, platform, result_json, reason)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
    .bind(p.id, p.uid, p.action, p.levelId, p.levelVersion, p.inputKey, p.status, p.platform, p.resultJson, p.reason)
    .run();
}

/** Kullanıcının kendi kaydı; başkasına ait ya da olmayan id için `null`. */
export async function getOwnGrant(db: D1Database, uid: string, id: string): Promise<RewardGrantRow | null> {
  return db.prepare('SELECT * FROM reward_grants WHERE id = ?1 AND uid = ?2').bind(id, uid).first<RewardGrantRow>();
}

/**
 * Aynı kullanıcı + aksiyon + level sürümü + girdi için yeniden kullanılabilir son
 * kayıt (hesaplamayı ve — teslim edildiyse — ödülü tekrarlamamak için).
 */
export async function findReusableGrant(
  db: D1Database,
  p: { uid: string; action: string; levelId: string | null; levelVersion: number | null; inputKey: string; sinceIso: string },
): Promise<RewardGrantRow | null> {
  return db
    .prepare(
      `SELECT * FROM reward_grants
       WHERE uid = ?1 AND action = ?2 AND level_id IS ?3 AND level_version IS ?4 AND input_key = ?5
         AND status IN ('prepared', 'cancelled', 'delivered') AND created_at >= ?6
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(p.uid, p.action, p.levelId, p.levelVersion, p.inputKey, p.sinceIso)
    .first<RewardGrantRow>();
}

/** Belirli bir andan beri açılan kayıt sayısı (hesaplama yapan her istek sayılır). */
export async function countGrantsSince(db: D1Database, uid: string, action: string, sinceIso: string): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM reward_grants WHERE uid = ?1 AND action = ?2 AND created_at >= ?3')
    .bind(uid, action, sinceIso)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Level başına harcanmış ücretsiz hak. */
export async function countDeliveredFree(db: D1Database, uid: string, action: string, levelId: string | null): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM reward_grants
       WHERE uid = ?1 AND action = ?2 AND level_id IS ?3 AND status = 'delivered' AND via = 'free'`,
    )
    .bind(uid, action, levelId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * Hazırlanmış kaydı teslim edildi olarak işaretler. Tek koşullu UPDATE atomiktir:
 * aynı kayıt için eşzamanlı iki claim'den yalnızca biri `true` alır ve ücretsiz
 * yolda kota kontrolü de aynı ifadede yapılır (eşzamanlı iki ücretsiz claim kotayı aşamaz).
 */
export async function markDelivered(
  db: D1Database,
  p: { uid: string; id: string; via: RewardGrantVia; freePerLevel: number },
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE reward_grants SET status = 'delivered', via = ?3, delivered_at = ${NOW_SQL}
       WHERE id = ?1 AND uid = ?2 AND status IN ('prepared', 'cancelled')
         AND (?3 != 'free' OR (
           SELECT COUNT(*) FROM reward_grants AS g
           WHERE g.uid = ?2 AND g.action = reward_grants.action AND g.level_id IS reward_grants.level_id
             AND g.status = 'delivered' AND g.via = 'free'
         ) < ?4)`,
    )
    .bind(p.id, p.uid, p.via, p.freePerLevel)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

/** İstemcinin bildirdiği başarısızlık (ör. reklam tamamlanmadı). Kayıt tekrar denenebilir kalır. */
export async function markCancelled(db: D1Database, uid: string, id: string, reason: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE reward_grants SET status = 'cancelled', reason = ?3, cancelled_at = ${NOW_SQL}
       WHERE id = ?1 AND uid = ?2 AND status IN ('prepared', 'cancelled')`,
    )
    .bind(id, uid, reason)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

/** Teslim edilmiş ama henüz bir level tamamlamaya uygulanmamış kayıtlar. */
export async function listOpenGrantIds(db: D1Database, uid: string, action: string, levelId: string): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT id FROM reward_grants
       WHERE uid = ?1 AND action = ?2 AND level_id = ?3 AND status = 'delivered' AND consumed_at IS NULL`,
    )
    .bind(uid, action, levelId)
    .all<{ id: string }>();
  return result.results.map((row) => row.id);
}

/**
 * Verilen kayıtları "uygulandı" olarak kapatır. Yalnızca önceden okunan id'ler
 * kapatılır; arada teslim edilen yeni ipuçları bir sonraki tamamlamaya uygulanır.
 */
export async function consumeGrants(db: D1Database, uid: string, grantIds: string[]): Promise<void> {
  if (grantIds.length === 0) return;
  const placeholders = grantIds.map((_, i) => `?${i + 2}`).join(', ');
  await db
    .prepare(
      `UPDATE reward_grants SET consumed_at = ${NOW_SQL}
       WHERE uid = ?1 AND consumed_at IS NULL AND status = 'delivered' AND id IN (${placeholders})`,
    )
    .bind(uid, ...grantIds)
    .run();
}
