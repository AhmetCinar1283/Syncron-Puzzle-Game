import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { getDB } from '../db';
import type { StoredLevel, StoredPlayedLevel } from '../db';
import type { LevelOrderEntry } from './admin';
import type { LevelEdges } from '../../games/types';

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
 * /levels sayfası her açıldığında çalışan hafif senkronizasyon (5 dakikalık bekleme süresi vardır).
 * Son senkronizasyondan sonra güncellenen levelParts dokümanlarını okur,
 * yeni eklenen bölümler için yerel veritabanında geçici taslaklar oluşturur
 * veya güncellenmesi gerekenleri isNeedSync=true olarak işaretler.
 * levels/ koleksiyonunu doğrudan okumaz (performans tasarrufu).
 *
 * @param force true ise 5 dakikalık bekleme süresini yoksayar.
 */
export async function syncLevelsMeta(force = false): Promise<void> {
  const lastSyncMs = force ? 0 : await readLastSync(LEVELS_META_SYNC_KEY);
  if (!force && Date.now() - lastSyncMs < META_SYNC_COOLDOWN_MS) return;

  const dexie = getDB();

  // Yalnızca son senkronizasyondan sonra değişen paketleri (part'ları) sorgular
  const partsSnap = lastSyncMs > 0
    ? await getDocs(
        query(
          collection(db, 'levelParts'),
          where('updatedAt', '>', Timestamp.fromMillis(lastSyncMs)),
        ),
      )
    : await getDocs(collection(db, 'levelParts'));

  for (const partDoc of partsSnap.docs) {
    const partData = partDoc.data();
    const order: Record<string, LevelOrderEntry> = partData.order ?? {};

    for (const entry of Object.values(order)) {
      const isLegacy = typeof entry === 'string';
      const eid = isLegacy ? entry : entry.id;
      const entryUpdatedAt = isLegacy ? 0 : toMs(entry.updatedAt);

      const existing = await dexie.presetLevels
        .where('firestoreId')
        .equals(eid)
        .first();

      const partNumber = partDoc.id;

      if (!existing) {
        // Yeni bölüm: Geçici taslak oluşturulur, tam veriler oyun oynanırken lazily getirilecektir (isNeedSync: true)
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
        // Var olan kayıt: updatedAt tarihi ilerlemişse veya eski formattaysa güncellenmek üzere isNeedSync=true yapılır
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
          // Sadece paket no veya pozisyon değişmişse, taslağı bozmadan günceller
          await dexie.presetLevels.update(existing.id!, {
            part: partNumber,
            position: isLegacy ? existing.position : entry.position,
          });
        }
      }
    }
  }

  await writeLastSync(LEVELS_META_SYNC_KEY, Date.now());
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

