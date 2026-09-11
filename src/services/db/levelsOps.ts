import { getDB } from './schema';
import type { StoredLevel } from './schema';

/** Kullanıcının kendi bölümünü (levels tablosu) Dexie ID'sine göre getirir. */
export async function getUserLevelById(id: number): Promise<(StoredLevel & { id: number }) | undefined> {
  const db = getDB();
  return db.levels.get(id) as Promise<(StoredLevel & { id: number }) | undefined>;
}

/**
 * Yeni bir bölüm kaydeder ve ID'sini sıralama dizisinde belirtilen `position` indeksine ekler.
 * `position` belirtilmezse dizinin sonuna eklenir.
 */
export async function saveLevelAtPosition(
  levelData: Omit<StoredLevel, 'id' | 'createdAt' | 'updatedAt'>,
  position?: number,
): Promise<number> {
  const db = getDB();
  const now = Date.now();
  const id = (await db.levels.add({ ...levelData, createdAt: now, updatedAt: now })) as number;

  const orderRecord = await db.levelOrder.get(1 as never);
  const order = [...(orderRecord?.order ?? [])];
  const pos =
    position !== undefined ? Math.max(0, Math.min(position, order.length)) : order.length;
  order.splice(pos, 0, id);

  await db.levelOrder.put({ id: 1, order });
  return id;
}

/** Var olan bir bölümün verilerini günceller (sıralamadaki yerini korur). */
export async function updateStoredLevel(
  id: number,
  levelData: Omit<StoredLevel, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<void> {
  const db = getDB();
  const existing = await db.levels.get(id);
  if (!existing) return;
  await db.levels.update(id, { ...levelData, updatedAt: Date.now() });
}

/** Bir bölümü hem levels tablosundan hem de sıralama dizisinden siler. */
export async function deleteStoredLevel(id: number): Promise<void> {
  const db = getDB();
  await db.levels.delete(id);
  const orderRecord = await db.levelOrder.get(1 as never);
  if (!orderRecord) return;
  const order = orderRecord.order.filter((x) => x !== id);
  await db.levelOrder.put({ id: 1, order });
}

/** Bir bölümün sadece requestId alanını günceller (Firestore'a gönderim sürecini izlemek için). */
export async function setLevelRequestId(id: number, requestId: string): Promise<void> {
  const db = getDB();
  await db.levels.update(id, { requestId });
}

/** Tüm Dexie tablolarını ve localStorage'ı temizler (geliştirici/hata ayıklama aracıdır). */
export async function localClear(): Promise<void> {
  const db = getDB();
  await Promise.all(db.tables.map((t) => t.clear()));
  localStorage.clear();
}

