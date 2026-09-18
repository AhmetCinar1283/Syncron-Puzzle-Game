/**
 * DOSYA AMACI: "Level atlama" ödüllü aksiyonunun sunucu uygulaması: bölüm
 * sıralamasını ve level'ı Firestore'dan doğrular, atlama kurallarını uygular ve
 * ödül teslim edildiğinde `skipped_levels` kaydını yazar. Atlama hiçbir skor,
 * yıldız, XP ya da liderlik değeri üretmez (played_levels'a dokunulmaz).
 * Hazırlama/teslim/log akışı ortak altyapıdadır (services/rewards).
 */

import { z } from 'zod';
import { getAdminAccessToken } from '../serviceAccount';
import { fromDoc, fsGet } from '../firestore';
import { getPlayedLevel } from '../playedLevels';
import type { RewardActionHandler } from '../rewards/types';
import { evaluateSkip, lastLevelIdInOrder, orderContainsLevel } from './skipLevelPolicy';
import { countOpenSkips, insertSkippedLevel, isLevelSkipped } from './skippedLevels';

const skipInputSchema = z.object({
  /** Level'ın bulunduğu bölüm (levelParts belge id'si). Sunucu üyeliği doğrular. */
  partId: z.string().min(1).max(128),
});

export interface SkipLevelInput {
  partId: string;
}

/** Teslim edilen içerik: yalnızca hangi level'ın atlandığı. */
export interface SkipLevelResult {
  levelId: string;
}

export const skipLevelAction: RewardActionHandler<SkipLevelInput> = {
  rule: {
    enabled: true,
    requiresLevel: true,
    // Ücretsiz yol yok: yalnızca ödüllü reklam (reklamsız hak 07'de bağlanır).
    freePerLevel: 0,
    maxPerUidPerDay: 50,
    maxPerUidPerMinute: 5,
  },

  parseInput(raw) {
    const parsed = skipInputSchema.safeParse(raw);
    return parsed.success ? { partId: parsed.data.partId } : null;
  },

  // Aynı level için tek bir atlama kaydı yeterlidir (level id kayıtta ayrıca tutulur).
  inputKey() {
    return 'skip';
  },

  async resolve(env, { uid, levelId, input }) {
    if (!levelId) return { ok: false, status: 404, reason: 'level-required' };

    let order: Record<string, unknown>;
    let levelVersion: number | null;
    try {
      const token = await getAdminAccessToken(env.GOOGLE_SERVICE_ACCOUNT);
      const [partDoc, levelDoc] = await Promise.all([
        fsGet(env.FIREBASE_PROJECT_ID, `levelParts/${input.partId}`, token),
        fsGet(env.FIREBASE_PROJECT_ID, `levels/${levelId}`, token),
      ]);
      if (!partDoc || !levelDoc) return { ok: false, status: 404, reason: 'level-not-found' };
      const rawOrder = fromDoc(partDoc).order;
      order = rawOrder && typeof rawOrder === 'object' ? (rawOrder as Record<string, unknown>) : {};
      const version = fromDoc(levelDoc).version;
      levelVersion = typeof version === 'number' ? version : null;
    } catch (err) {
      console.error('[SkipLevel] Firestore load failed:', err);
      return { ok: false, status: 500, reason: 'level-load-failed' };
    }

    // Level bu bölümde değilse (sahte partId) atlama yok.
    if (!orderContainsLevel(order, levelId)) return { ok: false, status: 404, reason: 'level-not-in-part' };

    const db = env.AUDIT_DB;
    const [played, alreadySkipped, openSkips] = await Promise.all([
      getPlayedLevel(db, uid, levelId),
      isLevelSkipped(db, uid, levelId),
      countOpenSkips(db, uid),
    ]);

    const decision = evaluateSkip({
      isChapterEnd: lastLevelIdInOrder(order) === levelId,
      alreadyCompleted: played !== null,
      alreadySkipped,
      openSkips,
    });
    if (!decision.ok) return { ok: false, status: decision.status, reason: decision.reason };

    const result: SkipLevelResult = { levelId };
    return { ok: true, levelVersion, compute: () => ({ ok: true, result }) };
  },

  async onDelivered(env, grant) {
    if (!grant.levelId) return;
    await insertSkippedLevel(env.AUDIT_DB, {
      uid: grant.uid,
      levelId: grant.levelId,
      levelVersion: grant.levelVersion,
      grantId: grant.id,
    });
  },
};
