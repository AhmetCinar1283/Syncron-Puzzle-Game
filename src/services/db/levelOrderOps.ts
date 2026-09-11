import { getDB } from './schema';
import type { StoredLevel } from './schema';

/** 
 * Tüm yerel bölümleri şu anki görüntülenme sıralarına göre getirir.
 */
export async function getOrderedLevels(): Promise<(StoredLevel & { id: number })[]> {
  const db = getDB();
  const orderRecord = await db.levelOrder.get(1 as never);
  const order: number[] = orderRecord?.order ?? [];
  if (order.length === 0) return [];

  const levels = await db.levels.bulkGet(order);
  return order
    .map((id, idx) => {
      const lvl = levels[idx];
      return lvl ? { ...lvl, id } : null;
    })
    .filter((x): x is StoredLevel & { id: number } => x !== null);
}

/** 
 * Sıralamada mevcut ID'den bir sonra gelen bölümün Dexie ID'sini döndürür.
 */
export async function getNextLevelId(currentId: number): Promise<number | null> {
  const db = getDB();
  const orderRecord = await db.levelOrder.get(1 as never);
  const order: number[] = orderRecord?.order ?? [];
  const idx = order.indexOf(currentId);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

/** 
 * Tüm sıralama dizisini yeni diziyle değiştirir (sürükle-bırak veya yukarı-aşağı hareket sonrası).
 */
export async function reorderLevels(newOrder: number[]): Promise<void> {
  const db = getDB();
  await db.levelOrder.put({ id: 1, order: newOrder });
}

