import {
  collection,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { LevelRequest } from './firestore';
import type { LevelOrderEntry } from './adminTypes';

/**
 * Topluluk tarafından gönderilen bir bölüm oluşturma isteğini onaylar:
 * 1. `levels/` koleksiyonunda yapımcı bilgileriyle yeni bir doküman oluşturur.
 * 2. Yeni LevelOrderEntry kaydını `levelParts/{partId}.order` alanına ekler.
 * 3. İstek durumunu 'approved' (onaylandı) olarak işaretler.
 *
 * Adımlar 1 ve 2'nin atomik olması için toplu yazma (batch write) kullanılır.
 */
export async function approveLevelRequest(
  requestId: string,
  partId: string,
  req: LevelRequest,
  approvedBy: string,
): Promise<void> {
  const batch = writeBatch(db);

  // 1. Yeni bölüm doküman referansını oluşturur
  const levelRef = doc(collection(db, 'levels'));

  // 2. Yeni bölüm için sıralama konumunu belirler
  const partRef = doc(db, 'levelParts', partId);
  const partSnap = await getDoc(partRef);
  const currentOrder: Record<string, LevelOrderEntry> = partSnap.exists()
    ? (partSnap.data().order as Record<string, LevelOrderEntry>) ?? {}
    : {};
  const maxPos = Object.values(currentOrder).reduce(
    (m, e) => Math.max(m, e.position ?? 0),
    -1,
  );

  // Mevcut en son pozisyondaki bölümü bulur (yeni bölümün prevLevelId değeri olacaktır)
  const prevEntry = Object.values(currentOrder).find(
    (e) => (e.position ?? -1) === maxPos,
  );
  const prevLevelId: string | null = prevEntry?.id ?? null;

  // 1a. Bölüm verilerini prevLevelId ile birlikte set eder
  batch.set(levelRef, {
    name: req.name,
    width: req.width,
    height: req.height,
    edges: req.edges,
    grid: JSON.stringify(req.grid), // Firestore iç içe dizileri doğrudan desteklemez
    initialObjects: req.initialObjects,
    targets: req.targets,
    trailCollision: req.trailCollision ?? false,
    initialBoxes: req.initialBoxes ?? [],
    conveyorPowerRequired: req.conveyorPowerRequired ?? [],
    ...(req.difficulty != undefined && { difficulty: req.difficulty }),
    part: Number(partId),
    publishedBy: approvedBy,
    createdBy: req.submittedBy,
    ...(req.creatorName && { creatorName: req.creatorName }),
    creatorTag: req.creatorTag,
    prevLevelId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(req.rooms && { rooms: req.rooms }),
    ...(req.controlMode && { controlMode: req.controlMode }),
    ...(req.initialControlledRooms && { initialControlledRooms: req.initialControlledRooms }),
    ...(req.gameNotes != undefined && { gameNotes: req.gameNotes }),
    ...(req.creatorNotes != undefined && { creatorNotes: req.creatorNotes }),
  });

  // 3. Bölüm paketi sırasına yeni girdiyi hazırlar
  const entry: Omit<LevelOrderEntry, 'updatedAt'> & { updatedAt: ReturnType<typeof serverTimestamp>; position: number } = {
    id: levelRef.id,
    name: req.name,
    width: req.width,
    height: req.height,
    position: maxPos + 1,
    ...(req.difficulty != undefined && { difficulty: req.difficulty }),
    ...(req.creatorName && { creatorName: req.creatorName }),
    updatedAt: serverTimestamp(),
  };

  if (partSnap.exists()) {
    // Eş zamanlı yazma güvenliği için sadece ilgili bölümün anahtarını günceller
    batch.update(partRef, {
      [`order.${entry.id}`]: entry,
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.set(partRef, {
      name: `Part ${partId}`,
      unlockRequirement: 0,
      order: { [entry.id]: entry },
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();

  // 3. İstek durumunu onaylandı olarak işaretler (batch dışındadır, kritik değildir)
  await updateDoc(doc(db, 'levelRequests', requestId), {
    status: 'approved',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Topluluk tarafından gönderilen bir bölüm oluşturma isteğini isteğe bağlı bir notla reddeder.
 */
export async function rejectLevelRequest(requestId: string, note?: string): Promise<void> {
  await updateDoc(doc(db, 'levelRequests', requestId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
    ...(note ? { adminNote: note } : {}),
  });
}

