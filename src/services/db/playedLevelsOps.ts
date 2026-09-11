import { getDB } from './schema';
import type { StoredPlayedLevel } from './schema';

/** Belirli bir bölümün yerel (Dexie) oynanmış kaydını getirir. */
export async function getPlayedLevel(levelId: string): Promise<StoredPlayedLevel | undefined> {
  const db = getDB();
  return db.playedLevels.get(levelId);
}

/** Bir bölümün yerel (Dexie) oynanmış kaydını ekler/günceller. */
export async function putPlayedLevel(record: StoredPlayedLevel): Promise<void> {
  const db = getDB();
  await db.playedLevels.put(record);
}

/** Tüm yerel (Dexie) oynanmış bölüm kayıtlarını döndürür. */
export async function getAllPlayedLevels(): Promise<StoredPlayedLevel[]> {
  const db = getDB();
  return db.playedLevels.toArray();
}
