import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  where,
  doc,
  getDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './config';

export interface AdminUserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  tag?: string;
  role: 'user' | 'moderator' | 'admin';
  authProvider: 'anonymous' | 'google' | 'email';
  totalScore: number;
  completedCount: number;
  createdAt: number; // ms
}

export const ADMIN_USERS_PAGE_SIZE = 15;

function mapUserDoc(data: DocumentData): AdminUserProfile {
  const toMs = (v: any): number => {
    if (v && typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v === 'number') return v;
    if (v instanceof Date) return v.getTime();
    return Date.now();
  };

  return {
    uid: data.uid || '',
    email: data.email || undefined,
    displayName: data.displayName || undefined,
    tag: data.tag || undefined,
    role: data.role || 'user',
    authProvider: data.authProvider || 'anonymous',
    totalScore: data.totalScore ?? 0,
    completedCount: data.completedCount ?? 0,
    createdAt: toMs(data.createdAt),
  };
}

/**
 * `debouncedQuery`'ye göre kullanıcı arar: sırasıyla tam UID, tam email,
 * tam gamer tag (#tag), ardından displayName prefix eşleşmesi dener.
 */
export async function searchAdminUsers(debouncedQuery: string): Promise<AdminUserProfile[]> {
  const fetched: AdminUserProfile[] = [];

  // 1. UID Exact Match Check (28 chars or standard Firestore UID)
  if (debouncedQuery.length >= 20 && !debouncedQuery.includes('@') && !debouncedQuery.startsWith('#')) {
    const userRef = doc(db, 'users', debouncedQuery);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      fetched.push(mapUserDoc(userSnap.data()));
    }
  }

  // 2. Email exact match
  if (fetched.length === 0 && debouncedQuery.includes('@')) {
    const q = query(collection(db, 'users'), where('email', '==', debouncedQuery), limit(1));
    const snaps = await getDocs(q);
    if (!snaps.empty) fetched.push(mapUserDoc(snaps.docs[0].data()));
  }

  // 3. Gamer Tag exact match
  if (fetched.length === 0) {
    const tagQuery = debouncedQuery.startsWith('#') ? debouncedQuery.slice(1) : debouncedQuery;
    const q = query(collection(db, 'users'), where('tag', '==', tagQuery), limit(5));
    const snaps = await getDocs(q);
    if (!snaps.empty) snaps.forEach((d) => fetched.push(mapUserDoc(d.data())));
  }

  // 4. Display Name prefix match (fallback if other search types yield nothing)
  if (fetched.length === 0) {
    const q = query(
      collection(db, 'users'),
      where('displayName', '>=', debouncedQuery),
      where('displayName', '<=', debouncedQuery + ''),
      orderBy('displayName'),
      limit(ADMIN_USERS_PAGE_SIZE),
    );
    const snaps = await getDocs(q);
    if (!snaps.empty) snaps.forEach((d) => fetched.push(mapUserDoc(d.data())));
  }

  return fetched;
}

export interface AdminUsersPage {
  users: AdminUserProfile[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Varsayılan kullanıcı listesini (createdAt azalan) sayfalı olarak getirir.
 */
export async function getAdminUsersPage(
  after: QueryDocumentSnapshot<DocumentData> | null = null,
): Promise<AdminUsersPage> {
  const constraints = after
    ? [orderBy('createdAt', 'desc'), startAfter(after), limit(ADMIN_USERS_PAGE_SIZE)]
    : [orderBy('createdAt', 'desc'), limit(ADMIN_USERS_PAGE_SIZE)];
  const q = query(collection(db, 'users'), ...constraints);
  const snaps = await getDocs(q);
  const users = snaps.docs.map((d) => mapUserDoc(d.data()));
  return {
    users,
    lastDoc: snaps.docs.length > 0 ? snaps.docs[snaps.docs.length - 1] : null,
    hasMore: snaps.docs.length === ADMIN_USERS_PAGE_SIZE,
  };
}
