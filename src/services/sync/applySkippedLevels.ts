/**
 * DOSYA AMACI: `/played-levels` yanıtındaki atlanan bölüm kayıtlarını (05) ve silinen
 * bölüm tombstone'larını yerel Dexie `skippedLevels` tablosuna uygular.
 */
import type { KnowAndConquerDB } from '../db';

export interface SkippedLevelSyncRecord {
  levelId: string;
  skippedAt: string;
  updatedAt: string;
}

/** Eklenen/güncellenen ve silinen kayıt sayısını döner. */
export async function applySkippedLevels(
  dexie: KnowAndConquerDB,
  records: readonly SkippedLevelSyncRecord[],
  deletedLevelIds: readonly string[],
): Promise<{ upserted: number; deleted: number }> {
  let upserted = 0;
  let deleted = 0;
  if (records.length === 0 && deletedLevelIds.length === 0) return { upserted, deleted };

  await dexie.transaction('rw', dexie.skippedLevels, async () => {
    for (const r of records) {
      await dexie.skippedLevels.put({
        levelId: r.levelId,
        skippedAt: new Date(r.skippedAt).getTime(),
        updatedAt: new Date(r.updatedAt).getTime(),
      });
      upserted++;
    }
    for (const levelId of deletedLevelIds) {
      if (await dexie.skippedLevels.get(levelId)) {
        await dexie.skippedLevels.delete(levelId);
        deleted++;
      }
    }
  });
  return { upserted, deleted };
}
