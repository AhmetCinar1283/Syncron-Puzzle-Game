import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { updateProfile } from 'firebase/auth';
import { auth, db, functions } from './config';

export interface UserTagData {
  tag?: string;
  tagChangeCount: number;
  tagChangedAt: Date | null;
}

/**
 * `users/{uid}` dokümanından etiket (tag) bilgisini getirir.
 */
export async function getUserTagData(uid: string): Promise<UserTagData | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    tag: d.tag,
    tagChangeCount: d.tagChangeCount ?? 0,
    tagChangedAt: d.tagChangedAt?.toDate() ?? null,
  };
}

/**
 * Yeni bir kullanıcı etiketi (tag) talep eder (Cloud Function `requestNewTag`).
 */
export async function requestNewTag(tag: string): Promise<string> {
  const fn = httpsCallable<{ tag: string }, { tag: string }>(functions, 'requestNewTag');
  const result = await fn({ tag });
  return result.data.tag;
}

/**
 * `users/{uid}` dokümanının ham verisini (profil sayfası için) getirir. Yoksa `null` döner.
 */
export async function getUserProfileData(uid: string): Promise<Record<string, any> | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Kullanıcının görünen adını hem Firestore `users/{uid}` dokümanında hem de
 * (giriş yapmış kullanıcı kendisiyse) Firebase Auth profilinde günceller.
 */
export async function updateUserDisplayName(uid: string, newName: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { displayName: newName });
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, { displayName: newName });
  }
}
