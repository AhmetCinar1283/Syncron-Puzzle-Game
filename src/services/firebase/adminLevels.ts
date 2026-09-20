import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  deleteField,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import type { AdminLevelInput, FirestoreLevel, LevelOrderEntry } from './adminTypes';
import { getPart } from './adminParts';
import { touchLevelsStateInBatch } from './sync';

export type { AdminLevelInput, FirestoreLevel };

/**
 * Yeni bir bölümü Firestore'da yayınlar ve onu belirtilen bölüm paketinin (part) order haritasının sonuna ekler.
 * Eş zamanlı yayınlar için field-path güncellemesi kullanır, böylece çakışmaları önler.
 * 
 * Yeni oluşturulan Firestore doküman ID'sini döndürür.
 */
export async function publishLevel(
  data: AdminLevelInput,
  partId: string,
  publishedBy: string,
): Promise<string> {
  const cleanData = JSON.parse(JSON.stringify(data));
  if (cleanData.rooms && Array.isArray(cleanData.rooms)) {
    cleanData.rooms = cleanData.rooms.map((r: any) => ({
      ...r,
      grid: typeof r.grid === 'string' ? r.grid : JSON.stringify(r.grid)
    }));
  }
  const batch = writeBatch(db);

  // 1. Yeni bölüm doküman referansını oluşturur
  const levelRef = doc(collection(db, 'levels'));

  // 2. Sıralama konumunu belirler (mevcut en büyük pozisyon + 1)
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

  // 1a. Yeni bölüm dokümanı verilerini yazar
  batch.set(levelRef, {
    ...cleanData,
    grid: JSON.stringify(cleanData.grid),
    publishedBy,
    prevLevelId,
    version: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 3. Sıralama girdisini hazırlar
  const entry: Omit<LevelOrderEntry, 'updatedAt'> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
    id: levelRef.id,
    name: cleanData.name,
    width: cleanData.width,
    height: cleanData.height,
    position: maxPos + 1,
    ...(cleanData.difficulty != undefined && { difficulty: cleanData.difficulty }),
    ...(cleanData.creatorName && { creatorName: cleanData.creatorName }),
    updatedAt: serverTimestamp(),
  };

  // 4. Pakete field-path ile eş zamanlı güvenli şekilde yazar
  if (partSnap.exists()) {
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

  touchLevelsStateInBatch(batch);
  await batch.commit();
  return levelRef.id;
}

/**
 * Mevcut bir hazır bölümün içeriğini günceller ve paket sıralama haritasındaki üst verilerini yeniler.
 */
export async function updateFirestoreLevel(
  firestoreId: string,
  data: AdminLevelInput,
  publishedBy: string,
  partId: string,
): Promise<void> {
  const cleanData = JSON.parse(JSON.stringify(data));
  if (cleanData.rooms && Array.isArray(cleanData.rooms)) {
    cleanData.rooms = cleanData.rooms.map((r: any) => ({
      ...r,
      grid: typeof r.grid === 'string' ? r.grid : JSON.stringify(r.grid)
    }));
  }
  const batch = writeBatch(db);

  // 1. Bölüm dokümanını günceller
  batch.update(doc(db, 'levels', firestoreId), {
    ...cleanData,
    grid: JSON.stringify(cleanData.grid),
    publishedBy,
    version: increment(1),
    updatedAt: serverTimestamp(),
  });

  // 2. Paket içindeki özet sıralama verilerini günceller (field-path, eş zamanlı güvenli)
  const entryUpdate: Record<string, unknown> = {
    [`order.${firestoreId}.name`]: cleanData.name,
    [`order.${firestoreId}.width`]: cleanData.width,
    [`order.${firestoreId}.height`]: cleanData.height,
    [`order.${firestoreId}.updatedAt`]: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (cleanData.difficulty) entryUpdate[`order.${firestoreId}.difficulty`] = cleanData.difficulty;
  if (cleanData.creatorName) entryUpdate[`order.${firestoreId}.creatorName`] = cleanData.creatorName;

  batch.update(doc(db, 'levelParts', partId), entryUpdate);

  touchLevelsStateInBatch(batch);
  await batch.commit();
}

/**
 * Bir bölümü Firestore'dan siler ve paket sıralama haritasından kaldırır.
 * Ayrıca prevLevelId zincirini onarır (ardıl bölümün prevLevelId değeri silinen bölümün öncülü yapılır).
 */
export async function deleteFirestoreLevel(
  firestoreId: string,
  partId: string,
): Promise<void> {
  // Silinen bölümün ve paketin mevcut bilgilerini okur
  const [deletedLevelSnap, partSnap] = await Promise.all([
    getDoc(doc(db, 'levels', firestoreId)),
    partId ? getDoc(doc(db, 'levelParts', partId)) : Promise.resolve(null),
  ]);

  const deletedPrevLevelId: string | null = deletedLevelSnap.exists()
    ? (deletedLevelSnap.data().prevLevelId as string | null) ?? null
    : null;

  // Silinenden sonra gelen ardıl bölümü pozisyona göre bulur
  let successorFirestoreId: string | null = null;
  if (partSnap && partSnap.exists()) {
    const order: Record<string, LevelOrderEntry> = partSnap.data().order ?? {};
    const deletedEntry = order[firestoreId];
    const deletedPos = deletedEntry?.position ?? -1;
    const successorEntry = Object.values(order).find(
      (e) => e.id !== firestoreId && (e.position ?? -1) === deletedPos + 1,
    );
    successorFirestoreId = successorEntry?.id ?? null;
  }

  const batch = writeBatch(db);

  batch.delete(doc(db, 'levels', firestoreId));

  if (partId) {
    batch.update(doc(db, 'levelParts', partId), {
      [`order.${firestoreId}`]: deleteField(),
      updatedAt: serverTimestamp(),
    });
  }

  touchLevelsStateInBatch(batch);
  await batch.commit();

  // Ardıl bölümün prevLevelId değerini silinenin öncülüne bağlar
  if (successorFirestoreId !== null) {
    try {
      await updateDoc(doc(db, 'levels', successorFirestoreId), {
        prevLevelId: deletedPrevLevelId,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('[deleteFirestoreLevel] Failed to patch successor prevLevelId:', e);
    }
  }
}

/**
 * Bir paketteki tüm bölümleri pozisyon alanına göre sıralanmış olarak getirir.
 */
export async function getPartLevels(partId: string): Promise<FirestoreLevel[]> {
  const part = await getPart(partId);
  if (!part || Object.values(part.order).length === 0) return [];

  const levelDocs = await Promise.all(
    Object.keys(part.order).map((k) => getDoc(doc(db, 'levels', k))),
  );

  return levelDocs
    .filter((d) => d.exists())
    .map((d) => ({
      firestoreId: d.id,
      ...(d.data() as Omit<FirestoreLevel, 'firestoreId'>),
    }))
    .sort((a, b) => {
      const posA = (part.order[a.firestoreId]?.position ?? 0);
      const posB = (part.order[b.firestoreId]?.position ?? 0);
      return posA - posB;
    });
}

/**
 * Belirtilen Firestore ID'sine sahip tek bir bölümün detaylı verisini çeker.
 */
export async function getFirestoreLevel(firestoreId: string): Promise<FirestoreLevel | null> {
  const snap = await getDoc(doc(db, 'levels', firestoreId));
  if (!snap.exists()) return null;
  return {
    firestoreId: snap.id,
    ...(snap.data() as Omit<FirestoreLevel, 'firestoreId'>),
  };
}

