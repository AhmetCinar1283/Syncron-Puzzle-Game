import { getDB } from './schema';
import type { StoredLevel } from './schema';

/**
 * Benzersiz firestoreId'ye göre tekilleştirilmiş ve position değerine göre sıralanmış
 * hazır (kampanya) bölümlerini döndürür.
 * 
 * Çakışan/çift kayıtlar (senkronizasyon eş zamanlı çalıştığında oluşabilen kopyalar)
 * arka planda kendi kendine iyileşme (self-heal) mekanizmasıyla silinir.
 */
export async function getPresetLevels(): Promise<(StoredLevel & { id: number })[]> {
  const db = getDB();
  const all = (await db.presetLevels.orderBy('id').toArray()) as (StoredLevel & { id: number })[];

  // Tekilleştirme: Her firestoreId için Dexie ID'si en yüksek olan en yeni kaydı saklar
  const seen = new Map<string, StoredLevel & { id: number }>();
  const duplicateIds: number[] = [];

  for (const level of all) {
    const key = level.firestoreId ?? `__no_fid_${level.id}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, level);
    } else if (level.id > existing.id) {
      // Mevcut kayıt daha yeni - eski kaydı silinecekler listesine ekle
      duplicateIds.push(existing.id);
      seen.set(key, level);
    } else {
      // Bu kayıt eski kopya kayıttır
      duplicateIds.push(level.id);
    }
  }

  // Kendi Kendine İyileşme (Self-heal): Eski kopya kayıtları arka planda Dexie'den siler
  if (duplicateIds.length > 0) {
    db.presetLevels.bulkDelete(duplicateIds).catch((err) =>
      console.warn('[getPresetLevels] Failed to delete duplicate records:', err),
    );
  }

  // Pozisyona göre sıralar, eşitlik durumunda Dexie ID'sine göre sıralar
  return Array.from(seen.values()).sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id,
  );
}

/**
 * Belirtilen currentId değerinden sonra gelen hazır bölümün Dexie ID'sini döndürür.
 * Doğru sıralamayı garanti etmek için tekilleştirilmiş ve sıralanmış listeyi kullanır.
 */
/** Bir hazır (kampanya) bölüm kaydını Dexie'den siler. */
export async function deletePresetLevel(id: number): Promise<void> {
  const db = getDB();
  await db.presetLevels.delete(id);
}

/** Tekilleştirme yapmadan tüm hazır (kampanya) bölüm kayıtlarını ham haliyle döndürür. */
export async function getAllPresetLevelsRaw(): Promise<(StoredLevel & { id: number })[]> {
  const db = getDB();
  return db.presetLevels.toArray() as Promise<(StoredLevel & { id: number })[]>;
}

export async function getPresetLevelById(id: number): Promise<(StoredLevel & { id: number }) | undefined> {
  const db = getDB();
  return db.presetLevels.get(id) as Promise<(StoredLevel & { id: number }) | undefined>;
}

export async function getNextPresetLevelId(currentId: number): Promise<number | null> {
  const sorted = await getPresetLevels();
  const currentLvl = sorted.find((l) => l.id === currentId);
  if (!currentLvl) return null;

  const partLevels = currentLvl.part
    ? sorted.filter((l) => l.part === currentLvl.part)
    : sorted;

  const idx = partLevels.findIndex((l) => l.id === currentId);
  if (idx < 0 || idx >= partLevels.length - 1) return null;
  return partLevels[idx + 1].id;
}

