/**
 * DOSYA AMACI: Resmî günlük tamamlamanın tek profil ödülü olan XP'yi yazar:
 * Firestore `users/{uid}.xp` (yoksa anonim kullanıcı dokümanı oluşturulur) ve
 * D1 `user_profiles.xp`. totalScore / completedCount / dönem skorlarına dokunmaz.
 */

import type { Env } from '../../types';
import { getAdminAccessToken } from '../serviceAccount';
import { docPath, fromDoc, fsCommit, fsGet, nowTimestamp } from '../firestore';
import { upsertUserProfile } from '../leaderboard';

export async function grantDailyXp(env: Env, uid: string, xpDelta: number): Promise<void> {
  if (xpDelta <= 0) return;
  const projectId = env.FIREBASE_PROJECT_ID;
  const token = await getAdminAccessToken(env.GOOGLE_SERVICE_ACCOUNT);
  const userDoc = await fsGet(projectId, `users/${uid}`, token);

  let displayName = 'Player';
  let tag: string | null = null;
  const writes: unknown[] = [];

  if (userDoc) {
    const data = fromDoc(userDoc);
    if (typeof data.displayName === 'string') displayName = data.displayName;
    if (typeof data.tag === 'string') tag = data.tag;
  } else {
    // /complete-level ile aynı: anonim kullanıcının dokümanı ilk ödülde tembel oluşturulur.
    writes.push({
      update: {
        name: docPath(projectId, `users/${uid}`),
        fields: {
          uid: { stringValue: uid },
          authProvider: { stringValue: 'anonymous' },
          createdAt: { timestampValue: nowTimestamp() },
          totalScore: { integerValue: '0' },
          completedCount: { integerValue: '0' },
          role: { stringValue: 'user' },
          xp: { integerValue: '0' },
        },
      },
      currentDocument: { exists: false },
    });
  }
  writes.push({
    transform: {
      document: docPath(projectId, `users/${uid}`),
      fieldTransforms: [{ fieldPath: 'xp', increment: { integerValue: String(xpDelta) } }],
    },
  });

  await fsCommit(projectId, writes, token);
  await upsertUserProfile(env.AUDIT_DB, uid, displayName, tag, xpDelta);
}
