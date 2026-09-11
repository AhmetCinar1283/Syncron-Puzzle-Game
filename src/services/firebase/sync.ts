import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  setDoc,
  serverTimestamp,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from './config';
import { getDB } from '../db';
import type { StoredLevel, StoredPlayedLevel } from '../db';
import type { LevelOrderEntry } from './admin';
import type { LevelEdges } from '@/game-engine/level-format';

// ─── Levels State Sync Helpers (Admin Senkronizasyon Yardımcıları) ───────────────

/**
 * Firestore'daki `/metadata/levelsState` belgesinin güncellenme zamanını günceller.
 * Böylece kullanıcılar bir değişiklik olduğunu anlayıp Dexie önbelleklerini tazeleyebilir.
 */
export async function touchLevelsState(): Promise<void> {
  try {
    await setDoc(doc(db, 'metadata', 'levelsState'), {
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.error('[touchLevelsState] Failed to touch levels state:', e);
  }
}

/**
 * Toplu Firestore yazma işlemi (batch) içine levelsState güncellemesini ekler.
 */
export function touchLevelsStateInBatch(batch: WriteBatch): void {
  batch.set(doc(db, 'metadata', 'levelsState'), {
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ─── Constants (Sabitler) ──────────────────────────────────────────────────────

const META_SYNC_COOLDOWN_MS = 5 * 60 * 1000;  // 5 dakika (üst veri senkronizasyon bekleme süresi)
const PLAYED_SYNC_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 saat
const LEVELS_META_SYNC_KEY = 'levelsMeta';

// ─── Dexie syncMeta helpers (Senkronizasyon Yardımcıları) ─────────────────────────

/**
 * Belirtilen senkronizasyon anahtarının en son başarılı çalışma zaman damgasını okur.
 */
async function readLastSync(key: string): Promise<number> {
  try {
    const record = await getDB().syncMeta.get(key);
    return record?.lastSync ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Belirtilen senkronizasyon anahtarının en son başarılı çalışma zaman damgasını kaydeder.
 */
async function writeLastSync(key: string, ts: number): Promise<void> {
  try {
    await getDB().syncMeta.put({ collection: key, lastSync: ts });
  } catch { /* yazma hataları yoksayılır */ }
}

// ─── Timestamp helper (Zaman Damgası Yardımcısı) ──────────────────────────────────

function toMs(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return 0;
}

// ─── Firestore → Dexie helpers (Eşleme Yardımcıları) ──────────────────────────────

/**
 * Ham Firestore bölüm dokümanını yerel Dexie StoredLevel formatına dönüştürür.
 * Zaman damgaları ms cinsinden sayılara dönüştürülür.
 */
function firestoreDocToStoredLevel(
  firestoreId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>,
): Omit<StoredLevel, 'id'> {
  return {
    firestoreId,
    name: data.name,
    width: data.width,
    height: data.height,
    edges: data.edges,
    grid: typeof data.grid === 'string' ? JSON.parse(data.grid) : data.grid,
    initialObjects: data.initialObjects,
    targets: data.targets,
    trailCollision: data.trailCollision,
    initialBoxes: data.initialBoxes,
    conveyorPowerRequired: data.conveyorPowerRequired,
    conveyorConfig: data.conveyorConfig,
    launcherConfig: data.launcherConfig,
    trampolineConfig: data.trampolineConfig,
    creatorName: data.creatorName ?? undefined,
    difficulty: data.difficulty ?? undefined,
    version: data.version ?? 1,
    position: data.position,
    part: data.part,
    rooms: data.rooms ?? null,
    controlMode: data.controlMode ?? null,
    initialControlledRooms: data.initialControlledRooms ?? null,
    gameNotes: data.gameNotes ?? '',
    creatorNotes: data.creatorNotes ?? '',
    isNeedSync: false,
    createdAt: toMs(data.createdAt),
    updatedAt: toMs(data.updatedAt),
  };
}

// ─── Metadata sync (Bölümler Sayfası Senkronizasyonu) ────────────────────────────

/**
 * /levels sayfası her açıldığında çalışan hafif senkronizasyon.
 * 1. Önce Firestore'dan `/metadata/levelsState` belgesini okuyarak son güncelleme tarihini denetler.
 * 2. Eğer yerel `lastSync` tarihi bu tarihten büyük veya eşitse, herhangi bir değişiklik olmadığını
 *    garanti eder ve senkronizasyon işlemini hemen sonlandırır (bu sayede 1 read ile işlem tamamlanır).
 * 3. Eğer değişiklik varsa, tüm `levelParts` belgelerini çeker, yerel Dexie önbelleğindeki (presetLevels)
 *    bölümleri ekler, günceller ya da silinmiş olanları (artık Firestore order haritasında bulunmayanları) temizler.
 *
 * @param force true ise levelsState kontrolünü atlar ve tam senkronizasyon yapar.
 */
export async function syncLevelsMeta(force = false): Promise<void> {
  const dexie = getDB();

  // 1. Yerel veritabanındaki en son senkronizasyon zamanını oku
  const lastSyncMs = force ? 0 : await readLastSync(LEVELS_META_SYNC_KEY);

  let serverUpdatedAt = 0;
  if (!force) {
    try {
      // 2. Global düzey güncelliğini kontrol etmek için metadata dokümanını oku (Sadece 1 Firestore Read)
      const stateSnap = await getDoc(doc(db, 'metadata', 'levelsState'));
      if (stateSnap.exists()) {
        const stateData = stateSnap.data();
        serverUpdatedAt = toMs(stateData.updatedAt);
      }
    } catch (e) {
      console.warn('[Sync] Failed to fetch levelsState metadata, falling back to full sync check:', e);
    }

    // Eğer veritabanı en güncel durumdaysa, senkronizasyonu atla (minimum masraf)
    if (serverUpdatedAt > 0 && lastSyncMs >= serverUpdatedAt) {
      return;
    }
  }

  // 3. Değişiklik varsa veya force edilirse tüm levelParts dokümanlarını çek
  let partsSnap;
  try {
    partsSnap = await getDocs(collection(db, 'levelParts'));
  } catch (err) {
    console.error('[Sync] Failed to fetch levelParts from Firestore:', err);
    return; // Hata durumunda yerel veriyi silmemek için burada duruyoruz
  }

  const activeLevelIds = new Set<string>();

  // Firestore'daki tüm paketleri ve içlerindeki seviyeleri işle
  for (const partDoc of partsSnap.docs) {
    const partData = partDoc.data();
    const order: Record<string, LevelOrderEntry> = partData.order ?? {};
    const partNumber = partDoc.id;

    for (const entry of Object.values(order)) {
      const isLegacy = typeof entry === 'string';
      const eid = isLegacy ? entry : entry.id;
      const entryUpdatedAt = isLegacy ? 0 : toMs(entry.updatedAt);

      // Aktif seviye ID'sini kaydet
      activeLevelIds.add(eid);

      const existing = await dexie.presetLevels
        .where('firestoreId')
        .equals(eid)
        .first();

      if (!existing) {
        // Yeni bölüm: Geçici taslak (placeholder) oluşturulur
        const placeholder: Omit<StoredLevel, 'id'> = {
          firestoreId: eid,
          name: isLegacy ? '' : entry.name,
          width: isLegacy ? 0 : entry.width,
          height: isLegacy ? 0 : entry.height,
          difficulty: isLegacy ? undefined : entry.difficulty,
          creatorName: isLegacy ? undefined : entry.creatorName,
          part: partNumber,
          edges: { top: 'wall', bottom: 'wall', left: 'wall', right: 'wall' } as LevelEdges,
          grid: [],
          initialObjects: [],
          targets: [],
          isNeedSync: true,
          createdAt: Date.now(),
          updatedAt: entryUpdatedAt,
          position: entry.position
        };
        await dexie.presetLevels.add(placeholder);
      } else {
        // Var olan bölüm: Güncellenme zamanına göre isNeedSync bayrağı ayarlanır
        if (entryUpdatedAt > (existing.updatedAt ?? 0) || isLegacy) {
          await dexie.presetLevels.update(existing.id!, {
            name: isLegacy ? existing.name : entry.name,
            width: isLegacy ? existing.width : entry.width,
            height: isLegacy ? existing.height : entry.height,
            difficulty: isLegacy ? existing.difficulty : entry.difficulty,
            creatorName: isLegacy ? existing.creatorName : entry.creatorName,
            part: partNumber,
            updatedAt: entryUpdatedAt || existing.updatedAt,
            isNeedSync: true,
            position: isLegacy ? existing.position : entry.position,
          });
        } else if (existing.part !== partNumber || (!isLegacy && entry.position !== existing.position)) {
          // Sadece paket no veya pozisyon değişmişse taslağı bozmadan günceller
          await dexie.presetLevels.update(existing.id!, {
            part: partNumber,
            position: isLegacy ? existing.position : entry.position,
          });
        }
      }
    }
  }

  // 4. Kendi Kendine İyileşme / Temizlik: Firestore'da artık bulunmayan (silinmiş) seviyeleri Dexie'den sil
  try {
    const allLocalLevels = await dexie.presetLevels.toArray();
    const obsoleteIds: number[] = [];

    for (const local of allLocalLevels) {
      if (!local.firestoreId || !activeLevelIds.has(local.firestoreId)) {
        obsoleteIds.push(local.id!);
      }
    }

    if (obsoleteIds.length > 0) {
      await dexie.presetLevels.bulkDelete(obsoleteIds);
      console.log(`[Sync] Cleaned up ${obsoleteIds.length} obsolete/deleted levels from Dexie.`);
    }
  } catch (cleanupErr) {
    console.warn('[Sync] Cleanup of obsolete levels failed:', cleanupErr);
  }

  // En son başarılı senkronizasyon zaman damgasını güncelle
  // serverUpdatedAt 0 ise (veya force durumunda okunamadıysa) şimdiki zamanı baz al
  const finalSyncTime = serverUpdatedAt > 0 ? serverUpdatedAt : Date.now();
  await writeLastSync(LEVELS_META_SYNC_KEY, finalSyncTime);
}

// ─── Lazy level fetch (Oyun Sayfası Lazy Yükleme) ──────────────────────────────────

/**
 * Firestore'dan bölümün tüm detaylı verilerini çeker ve Dexie presetLevels kaydını günceller.
 * Bölüm ilk defa açıldığında veya güncellendiğinde tetiklenir, ardından isNeedSync temizlenir.
 */
export async function fetchAndCacheLevel(
  firestoreId: string,
  dexieId: number,
): Promise<void> {
  const snap = await getDoc(doc(db, 'levels', firestoreId));
  if (!snap.exists()) return;

  const data = snap.data() as Record<string, unknown>;
  const level = firestoreDocToStoredLevel(firestoreId, data);

  const dexie = getDB();
  const existing = await dexie.presetLevels.get(dexieId);
  if (existing) {
    // levelParts üzerinden yönetilen part ve position değerlerini korur
    level.part = existing.part;
    level.position = existing.position;

    // Firestore dokümanında eksik olan diğer üst verileri yerel kayıttan korur
    if (level.difficulty === undefined || level.difficulty === null) {
      level.difficulty = existing.difficulty;
    }
    if (level.creatorName === undefined || level.creatorName === null) {
      level.creatorName = existing.creatorName;
    }
    if (!level.name && existing.name) {
      level.name = existing.name;
    }
  }

  await dexie.presetLevels.update(dexieId, level); // isNeedSync: false olarak günceller
}

// ─── Played levels sync (Kullanımdan Kaldırılan Eski Senkronizasyon) ───────────────

/**
 * @deprecated Firestore tabanlı playedLevels senkronizasyonu kaldırıldı (Dexie v10).
 *             Bunun yerine Cloudflare D1'den çeken `syncPlayedLevelsFromWorker` kullanılır.
 *             İçe aktarma hatalarını önlemek amacıyla boş (no-op) fonksiyon olarak bırakılmıştır.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncPlayedLevels(_uid: string, _force = false): Promise<void> {
  console.warn(
    '[Deprecated] syncPlayedLevels (Firestore) is no longer used. ' +
    'playedLevels are now synced from Cloudflare D1 via syncPlayedLevelsFromWorker.',
  );
}

