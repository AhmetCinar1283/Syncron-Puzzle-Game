/**
 * DOSYA AMACI: Ödüllü reklamla atlanan bölümlerin (05) yerel Dexie işlemleri.
 * Kayıtlar skor taşımaz; sunucudaki `skipped_levels` ile senkronize edilir.
 */
import { getDB } from './schema';
import type { StoredSkippedLevel } from './schema';

/** Atlama kaydını ekler/günceller (aynı bölüm için tek kayıt). */
export async function putSkippedLevel(record: StoredSkippedLevel): Promise<void> {
  const db = getDB();
  await db.skippedLevels.put(record);
}

/** Tek bir bölümün yerel atlama kaydı. */
export async function getSkippedLevel(levelId: string): Promise<StoredSkippedLevel | undefined> {
  const db = getDB();
  return db.skippedLevels.get(levelId);
}

/** Tüm yerel atlama kayıtlarını döndürür. */
export async function getAllSkippedLevels(): Promise<StoredSkippedLevel[]> {
  const db = getDB();
  return db.skippedLevels.toArray();
}
