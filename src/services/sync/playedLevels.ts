/**
 * DOSYA AMACI: Bu dosya, oynanan bölümlerin kayıtlarını Cloudflare D1 Worker'dan
 * çekip yerel Dexie (IndexedDB) veritabanına entegre eden istemci senkronizasyon mantığını barındırır.
 *
 * Strateji: Dexie syncMeta içinde tutulan `since` parametresiyle delta senkronizasyonu yapılır.
 *   - İlk çağrı (imleç yoksa): Kullanıcının tüm kayıtları getirilir.
 *   - Sonraki çağrılar: Sadece son senkronizasyondan sonra güncellenen kayıtlar çekilir.
 */

import type { User } from 'firebase/auth';
import { getDB } from '../db';
import type { StoredPlayedLevel } from '../db';

// ─── Constants (Sabitler) ──────────────────────────────────────────────────────

const SYNC_KEY = 'playedLevels_d1';
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 dakika bekleme süresi

const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL ?? 'https://syncron-worker.ahmetemre.workers.dev';

// ─── Helpers (Yardımcı Fonksiyonlar) ──────────────────────────────────────────

/**
 * Son başarılı senkronizasyon zaman damgasını ve ISO formatındaki imleci okur.
 */
async function readLastSync(): Promise<{ timestamp: number; cursor: string | null }> {
  try {
    const db = getDB();
    const record = await db.syncMeta.get(SYNC_KEY);
    if (!record || record.lastSync === 0) return { timestamp: 0, cursor: null };
    // Kaydedilen ms zaman damgasından ISO imlecini oluşturur
    return {
      timestamp: record.lastSync,
      cursor: new Date(record.lastSync).toISOString(),
    };
  } catch {
    return { timestamp: 0, cursor: null };
  }
}

/**
 * Sunucu tarafından dönülen zaman damgasını bir sonraki senkronizasyon için kaydeder.
 */
async function writeLastSync(serverTimeIso: string): Promise<void> {
  try {
    const db = getDB();
    const tsMs = new Date(serverTimeIso).getTime();
    if (isNaN(tsMs)) return;
    await db.syncMeta.put({ collection: SYNC_KEY, lastSync: tsMs });
  } catch { /* yazma hataları yoksayılır */ }
}

// ─── Main export (Ana Dışa Aktarılan Fonksiyonlar) ──────────────────────────────

export interface SyncPlayedLevelsResult {
  /** Dexie'ye eklenen/güncellenen kayıt sayısı */
  upserted: number;
  /** Silinen Dexie kayıt sayısı */
  deleted: number;
}

/**
 * Mevcut kullanıcının oynadığı bölümlerin kayıtlarını Cloudflare D1 veritabanından Dexie'ye senkronize eder.
 *
 * @param user   Firebase Auth kullanıcı nesnesi (ID belirteci almak için)
 * @param force  true ise 5 dakikalık bekleme süresini yoksayar ve tam senkronizasyon yapar
 */
export async function syncPlayedLevelsFromWorker(
  user: User,
  force = false,
): Promise<SyncPlayedLevelsResult> {
  const { timestamp: lastSyncMs, cursor: lastCursor } = await readLastSync();

  if (!force && Date.now() - lastSyncMs < SYNC_COOLDOWN_MS) {
    return { upserted: 0, deleted: 0 };
  }

  // İstek URL'sini hazırlar - ilk senkronizasyonda `since` parametresi eklenmez
  let url = `${WORKER_URL}/played-levels`;
  if (!force && lastCursor) {
    url += `?since=${encodeURIComponent(lastCursor)}`;
  }

  let token: string;
  try {
    token = await user.getIdToken();
  } catch {
    return { upserted: 0, deleted: 0 };
  }

  let data: {
    success: boolean;
    records: Array<{
      levelId: string;
      stars: 1 | 2 | 3;
      score: number;
      moveCount: number;
      timeSpent: number;
      completedAt: string;
      updatedAt: string;
    }>;
    deletedLevelIds: string[];
    serverTime: string;
  };

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn('[PlayedSync] Worker responded', res.status);
      return { upserted: 0, deleted: 0 };
    }
    data = await res.json();
    if (!data.success) return { upserted: 0, deleted: 0 };
  } catch (e) {
    console.warn('[PlayedSync] Fetch error:', e);
    return { upserted: 0, deleted: 0 };
  }

  const dexie = getDB();
  let upserted = 0;
  let deleted = 0;

  // ── Kayıtları Uygula (Upsert: Sunucudaki yıldız sayısı daha iyiyse yerel güncellenir) ──
  if (data.records.length > 0) {
    await dexie.transaction('rw', dexie.playedLevels, async () => {
      for (const r of data.records) {
        const existing = await dexie.playedLevels.get(r.levelId);
        // Sunucu yetkili kaynaktır - sunucu yıldızı >= yerel yıldız ise veya yerel kayıt yoksa yazar
        if (!existing || r.stars >= (existing.stars ?? 0)) {
          const record: StoredPlayedLevel = {
            levelId:     r.levelId,
            score:       r.score,
            timeSpent:   r.timeSpent,
            completedAt: new Date(r.completedAt).getTime(),
            updatedAt:   new Date(r.updatedAt).getTime(),
            stars:       r.stars,
            moveCount:   r.moveCount,
          };
          await dexie.playedLevels.put(record);
          upserted++;
        }
      }
    });
  }

  // ── Silinenleri Uygula (Tombstones: Kaldırılan bölümlerin yerel kayıtlarını siler) ──
  if (data.deletedLevelIds.length > 0) {
    await dexie.transaction('rw', dexie.playedLevels, async () => {
      for (const levelId of data.deletedLevelIds) {
        const existed = await dexie.playedLevels.get(levelId);
        if (existed) {
          await dexie.playedLevels.delete(levelId);
          deleted++;
        }
      }
    });
  }

  // ── Sunucu tarafından verilen zaman damgası imlecini kaydeder ──
  await writeLastSync(data.serverTime);

  if (upserted > 0 || deleted > 0) {
    console.log(`[PlayedSync] upserted=${upserted} deleted=${deleted}`);
  }

  return { upserted, deleted };
}

