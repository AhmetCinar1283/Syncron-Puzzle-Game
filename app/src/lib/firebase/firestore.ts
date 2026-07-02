import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  Timestamp,
  type FieldValue,
  type DocumentSnapshot,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './config';
import type { StoredLevel } from '../db';
import type { LevelData } from '../../games/types';

// ─── Types (Firestore Veri Tipleri) ─────────────────────────────────────────────

/** Topluluktan gelen bölüm oluşturma istek şeması. */
export interface LevelRequest {
  id: string;
  name: string;
  width: number;
  height: number;
  edges: StoredLevel['edges'];
  grid: StoredLevel['grid'];
  initialObjects: StoredLevel['initialObjects'];
  targets: StoredLevel['targets'];
  trailCollision?: boolean;
  initialBoxes?: StoredLevel['initialBoxes'];
  conveyorPowerRequired?: StoredLevel['conveyorPowerRequired'];
  difficulty?: 1 | 2 | 3 | 4;
  rooms?: any[];
  controlMode?: 'all_rooms' | 'selected_room';
  initialControlledRooms?: string[];
  submittedBy: string;
  creatorName: string;
  creatorTag: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  updatedAt: number;
  adminNote?: string;
  gameNotes?: string;
  creatorNotes?: string;
}

/** Firestore'daki users/{uid} dokümanı şeması. */
export interface UserDoc {
  uid: string;
  authProvider: 'anonymous' | 'google' | 'email';
  createdAt: FieldValue;
  totalScore: number;
  completedCount: number;
  xp?: number;
  role: 'user' | 'moderator' | 'admin';
  email?: string;
  displayName?: string;
  tag?: string;
  acceptedTermsAt?: FieldValue;
}

// ─── Helpers (Yardımcı Fonksiyonlar) ──────────────────────────────────────────

/** Kullanıcının oturum açtığı kimlik sağlayıcıyı (provider) çözümler. */
function resolveAuthProvider(user: User): 'anonymous' | 'google' | 'email' {
  if (user.isAnonymous) return 'anonymous';
  const providerIds = user.providerData.map((p) => p.providerId);
  if (providerIds.includes('google.com')) return 'google';
  return 'email';
}

/**
 * Kullanıcı ilk giriş yaptığında users/{uid} dokümanını oluşturur.
 * Google hesabı bağlama gibi durumlarda mevcut alanları ezmeden birleştirir (merge).
 */
export async function createOrUpdateUserDoc(
  user: User,
  acceptedTerms?: boolean,
  existingSnap?: DocumentSnapshot,
): Promise<DocumentSnapshot> {
  const ref = doc(db, 'users', user.uid);
  let snap = existingSnap || (await getDoc(ref));

  if (!snap.exists()) {
    // Yeni kullanıcı kaydı
    const data: Omit<UserDoc, 'createdAt'> & { createdAt: FieldValue; acceptedTermsAt: FieldValue } = {
      uid: user.uid,
      authProvider: resolveAuthProvider(user),
      createdAt: serverTimestamp(),
      totalScore: 0,
      completedCount: 0,
      role: 'user',
      acceptedTermsAt: serverTimestamp(), // Always set acceptedTermsAt on creation to satisfy rules
    };
    if (user.email) data.email = user.email;
    if (user.displayName) data.displayName = user.displayName;

    await setDoc(ref, data);
    snap = await getDoc(ref);
  } else if (!user.isAnonymous) {
    const data = snap.data() as UserDoc;
    const currentProvider = resolveAuthProvider(user);

    // Sadece gerçekten değişen alanları güncelle
    const emailChanged = user.email && data.email !== user.email;
    const nameChanged = user.displayName && data.displayName !== user.displayName;
    const providerChanged = data.authProvider !== currentProvider;
    const termsChanged = acceptedTerms && !data.acceptedTermsAt;

    if (emailChanged || nameChanged || providerChanged || termsChanged) {
      const patch: Partial<UserDoc> & { acceptedTermsAt?: FieldValue } = {};
      if (providerChanged) patch.authProvider = currentProvider;
      if (emailChanged) patch.email = user.email!;
      if (nameChanged) patch.displayName = user.displayName!;
      if (termsChanged) patch.acceptedTermsAt = serverTimestamp();

      await setDoc(ref, patch, { merge: true });
      snap = await getDoc(ref);
    }
  }
  return snap;
}

/**
 * Topluluk bölüm oluşturma/yayınlama isteğini Firestore'a kaydeder.
 * Yeni oluşturulan isteğin doküman ID'sini döner.
 */
export async function submitLevelRequest(
  uid: string,
  levelData: LevelData,
  creatorTag: string | null,
  difficulty?: 1 | 2 | 3 | 4,
  creatorName?: string,
): Promise<string> {
  const rooms = levelData.rooms ? levelData.rooms.map((r: any) => ({
    ...r,
    grid: typeof r.grid === 'string' ? r.grid : JSON.stringify(r.grid)
  })) : undefined;

  const ref = await addDoc(collection(db, 'levelRequests'), {
    name: levelData.name,
    width: levelData.width,
    height: levelData.height,
    edges: levelData.edges,
    grid: JSON.stringify(levelData.grid), // Firestore iç içe dizileri doğrudan desteklemez
    initialObjects: levelData.initialObjects,
    targets: levelData.targets,
    trailCollision: levelData.trailCollision ?? false,
    initialBoxes: levelData.initialBoxes ?? [],
    conveyorPowerRequired: levelData.conveyorPowerRequired ?? [],
    ...(difficulty != undefined && { difficulty }),
    submittedBy: uid,
    ...(creatorName && { creatorName }),
    creatorTag,
    status: 'pending',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(rooms && { rooms }),
    ...(levelData.controlMode && { controlMode: levelData.controlMode }),
    ...(levelData.initialControlledRooms && { initialControlledRooms: levelData.initialControlledRooms }),
    ...(levelData.gameNotes != undefined && { gameNotes: levelData.gameNotes }),
    ...(levelData.creatorNotes != undefined && { creatorNotes: levelData.creatorNotes }),
  });
  return ref.id;
}

/**
 * Bekleyen bir bölüm isteğinin içeriğini ve zorluk derecesini günceller.
 */
export async function updateLevelRequest(
  requestId: string,
  levelData: LevelData,
  difficulty?: 1 | 2 | 3 | 4,
): Promise<void> {
  const rooms = levelData.rooms ? levelData.rooms.map((r: any) => ({
    ...r,
    grid: typeof r.grid === 'string' ? r.grid : JSON.stringify(r.grid)
  })) : undefined;

  await updateDoc(doc(db, 'levelRequests', requestId), {
    name: levelData.name,
    width: levelData.width,
    height: levelData.height,
    edges: levelData.edges,
    grid: JSON.stringify(levelData.grid),
    initialObjects: levelData.initialObjects,
    targets: levelData.targets,
    trailCollision: levelData.trailCollision ?? false,
    initialBoxes: levelData.initialBoxes ?? [],
    conveyorPowerRequired: levelData.conveyorPowerRequired ?? [],
    difficulty: difficulty ?? null,
    updatedAt: serverTimestamp(),
    rooms: rooms ?? null,
    controlMode: levelData.controlMode ?? null,
    initialControlledRooms: levelData.initialControlledRooms ?? null,
    gameNotes: levelData.gameNotes ?? null,
    creatorNotes: levelData.creatorNotes ?? null,
  });
}

/**
 * Bölüm isteklerini durum filtresine göre yeniden eskiye doğru sıralı getirir (Yalnızca yöneticiler).
 */
export async function getLevelRequests(
  status: 'pending' | 'approved' | 'rejected' = 'pending',
): Promise<LevelRequest[]> {
  const q = query(
    collection(db, 'levelRequests'),
    where('status', '==', status),
    orderBy('submittedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const toMs = (v: unknown): number => {
      if (v instanceof Timestamp) return v.toMillis();
      if (typeof v === 'number') return v;
      return Date.now();
    };
    return {
      id: d.id,
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
      difficulty: data.difficulty ?? undefined,
      submittedBy: data.submittedBy,
      creatorName: data.creatorName,
      creatorTag: data.creatorTag ?? null,
      status: data.status,
      submittedAt: toMs(data.submittedAt),
      updatedAt: toMs(data.updatedAt),
      adminNote: data.adminNote,
      gameNotes: data.gameNotes ?? undefined,
      creatorNotes: data.creatorNotes ?? undefined,
      rooms: data.rooms ?? undefined,
      controlMode: data.controlMode ?? undefined,
      initialControlledRooms: data.initialControlledRooms ?? undefined,
    } as LevelRequest;
  });
}

