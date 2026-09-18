/**
 * DOSYA AMACI: "İpucu" ödüllü aksiyonunun sunucu uygulaması: girdi (hamle geçmişi)
 * doğrulama, level'ı yükleme (kampanya: Firestore, günlük bulmaca `daily:<id>`: D1),
 * hamleleri oynatma ve ipucunu hesaplama.
 * Hazırlama/teslim/kota/log akışı ortak altyapıdadır (services/rewards).
 */

import { z } from 'zod';
import { MOVES_LIMIT } from '../../types';
import { getAdminAccessToken } from '../serviceAccount';
import { fsGet, parseLevelDoc } from '../firestore';
import type { RewardActionHandler } from '../rewards/types';
import { MOVE_CODES, replayMoves, type MoveCode } from './replay';
import { computeHint } from './computeHint';
import { loadPublishedDailyLevel, parseDailyLevelId } from '../daily/dailyLevelSource';

const hintInputSchema = z.object({
  moves: z.array(z.enum(MOVE_CODES)).max(MOVES_LIMIT),
});

export interface HintInput {
  moves: MoveCode[];
}

export const hintAction: RewardActionHandler<HintInput> = {
  rule: {
    // KAPALI: sunucu ipucu Workers Free'nin 10 ms CPU sınırına sığmıyor
    // (bkz. hintBudget.ts). Kod ileride açılmak üzere yerinde duruyor.
    enabled: false,
    requiresLevel: true,
    freePerLevel: 1,
    maxPerUidPerDay: 200,
    maxPerUidPerMinute: 10,
  },

  parseInput(raw) {
    const parsed = hintInputSchema.safeParse(raw);
    return parsed.success ? { moves: parsed.data.moves } : null;
  },

  inputKey(input) {
    return input.moves.join('');
  },

  async resolve(env, { levelId, input }) {
    if (!levelId) return { ok: false, status: 404, reason: 'level-required' };

    let levelData: any;
    const dailyPuzzleId = parseDailyLevelId(levelId);
    try {
      if (dailyPuzzleId) {
        const daily = await loadPublishedDailyLevel(env.AUDIT_DB, dailyPuzzleId);
        if (!daily) return { ok: false, status: 404, reason: 'level-not-found' };
        levelData = { ...daily.level, version: daily.version };
      } else {
        const token = await getAdminAccessToken(env.GOOGLE_SERVICE_ACCOUNT);
        const doc = await fsGet(env.FIREBASE_PROJECT_ID, `levels/${levelId}`, token);
        if (!doc) return { ok: false, status: 404, reason: 'level-not-found' };
        levelData = parseLevelDoc(doc, levelId);
      }
    } catch (err) {
      console.error('[Hint] Level load failed:', err);
      return { ok: false, status: 500, reason: 'level-load-failed' };
    }

    return {
      ok: true,
      levelVersion: typeof levelData.version === 'number' ? levelData.version : null,
      compute: () => {
        const replayed = replayMoves(levelData, input.moves);
        if (!replayed.ok) return { ok: false, kind: 'invalid', reason: replayed.error };
        const hint = computeHint(replayed.replay, input.moves);
        return hint ? { ok: true, result: hint } : { ok: false, kind: 'unavailable', reason: 'solver-budget' };
      },
    };
  },
};
