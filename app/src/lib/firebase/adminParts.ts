import {
  collection,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { LevelPart, LevelOrderEntry } from './adminTypes';

export type { LevelPart, LevelOrderEntry };

/** Tüm bölüm paketlerini artan partId sırasına göre getirir. */
export async function getAllParts(): Promise<LevelPart[]> {
  const snap = await getDocs(collection(db, 'levelParts'));
  const parts = snap.docs.map((d) => ({
    partId: d.id,
    ...(d.data() as Omit<LevelPart, 'partId'>),
  }));
  return parts.sort((a, b) => Number(a.partId) - Number(b.partId));
}

/** Tek bir bölüm paketinin üst verisini ve sıralama haritasını getirir. */
export async function getPart(partId: string): Promise<LevelPart | null> {
  const snap = await getDoc(doc(db, 'levelParts', partId));
  if (!snap.exists()) return null;
  return { partId, ...(snap.data() as Omit<LevelPart, 'partId'>) };
}

/** Yeni bir bölüm paketi (dünya) oluşturur ve otomatik üretilen Firestore ID'si ile döner. */
export async function setPart(name: string, unlockRequirement = 0): Promise<LevelPart> {
  const ref = await addDoc(collection(db, 'levelParts'), {
    name,
    unlockRequirement,
    order: {},
    updatedAt: serverTimestamp(),
  });
  return {
    partId: ref.id,
    name,
    unlockRequirement,
    order: {},
    updatedAt: Date.now(),
  };
}

/** Bir bölüm paketinin adını ve/veya kilit açma yıldız gereksinimini günceller. */
export async function updatePart(
  partId: string,
  data: { name?: string; unlockRequirement?: number },
): Promise<void> {
  await updateDoc(doc(db, 'levelParts', partId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Bir bölüm paketi dokümanını siler (ilişkili bölümler silinmez). */
export async function deletePart(partId: string): Promise<void> {
  await deleteDoc(doc(db, 'levelParts', partId));
}

/**
 * Bir paketteki bir veya daha fazla bölümün sırasını/pozisyonunu günceller.
 * Çakışma güvenliği için field-path güncellemelerini kullanır.
 *
 * @param moves Güncellenecek olan { levelId, position } çiftlerinin dizisi.
 */
export async function moveLevelsInPart(
  partId: string,
  moves: { levelId: string; position: number }[],
): Promise<void> {
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const { levelId, position } of moves) {
    update[`order.${levelId}.position`] = position;
  }
  await updateDoc(doc(db, 'levelParts', partId), update);
}

/** Bir paketteki tüm bölümlerin harita koordinatlarını ve portal koordinatları ile harita temasını günceller. */
export async function updatePartMapLayout(
  partId: string,
  levelCoords: Record<string, { mapX: number; mapY: number }>,
  portalCoords?: { portalX?: number; portalY?: number; portalStartX?: number; portalStartY?: number },
  mapTheme?: string,
): Promise<void> {
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };

  for (const [levelId, coords] of Object.entries(levelCoords)) {
    update[`order.${levelId}.mapX`] = coords.mapX;
    update[`order.${levelId}.mapY`] = coords.mapY;
  }

  if (portalCoords) {
    if (portalCoords.portalX !== undefined) update['portalX'] = portalCoords.portalX;
    if (portalCoords.portalY !== undefined) update['portalY'] = portalCoords.portalY;
    if (portalCoords.portalStartX !== undefined) update['portalStartX'] = portalCoords.portalStartX;
    if (portalCoords.portalStartY !== undefined) update['portalStartY'] = portalCoords.portalStartY;
  }

  if (mapTheme !== undefined) {
    update['mapTheme'] = mapTheme;
  }

  await updateDoc(doc(db, 'levelParts', partId), update);
}

/**
 * Saves batch changes (deletes levels, updates part order maps, and updates prevLevelId chains).
 * 
 * @param deletedLevels List of levels to delete: { levelId, partId }
 * @param partsToUpdate List of parts whose level order needs updating: { partId, order }
 */
export async function saveBatchChanges(
  deletedLevels: { levelId: string; partId: string }[],
  partsToUpdate: { partId: string; order: Record<string, LevelOrderEntry> }[]
): Promise<void> {
  const batch = writeBatch(db);

  // 1. Delete level documents
  for (const { levelId } of deletedLevels) {
    batch.delete(doc(db, 'levels', levelId));
  }

  // 2. Update levelPart orders and repair prevLevelId chains
  for (const { partId, order } of partsToUpdate) {
    const partRef = doc(db, 'levelParts', partId);
    batch.update(partRef, {
      order,
      updatedAt: serverTimestamp(),
    });

    const sorted = Object.values(order).sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );
    for (let idx = 0; idx < sorted.length; idx++) {
      const lvl = sorted[idx];
      const expectedPrev = idx === 0 ? null : sorted[idx - 1].id;
      batch.update(doc(db, 'levels', lvl.id), {
        prevLevelId: expectedPrev,
        updatedAt: serverTimestamp(),
      });
    }
  }

  await batch.commit();
}


