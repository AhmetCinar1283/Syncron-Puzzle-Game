/**
 * DOSYA AMACI: Ödüllü aksiyon API uçları (aksiyondan bağımsız, ince katman).
 *
 *   POST /rewards/prepare — ödülü sunucuda hesaplar ve saklar; içerik dönmez
 *   POST /rewards/claim   — erişim hakkını kontrol eder, içeriği teslim eder
 *   POST /rewards/cancel  — istemci tarafı başarısızlığı (ör. reklam) loglar
 *
 * Akış ve güvenlik kuralları: services/rewards/rewardService.ts.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { z } from 'zod';
import type { AppContext } from '../types';
import { firebaseAuth } from '../middleware/auth';
import { checkActiveBan } from '../services/banService';
import { cancelRewardSchema, claimRewardSchema, prepareRewardSchema } from '../schemas/rewards';
import { REWARD_ACTIONS } from '../services/rewards/actions';
import { getOwnGrant } from '../services/rewards/rewardGrants';
import { cancelReward, claimReward, prepareReward } from '../services/rewards/rewardService';

export const rewardsRouter = new Hono<AppContext>();

/** Ban kontrolü + JSON + Zod; hata varsa yanıtı döner. */
async function readRequest<T extends z.ZodTypeAny>(
  c: Context<AppContext>,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  if (await checkActiveBan(c.env.AUDIT_DB, c.get('uid'), 'platform')) {
    return { ok: false, response: c.json({ success: false, error: 'Account suspended' }, 403) };
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { ok: false, response: c.json({ success: false, error: 'Invalid JSON' }, 400) };
  }
  const validation = schema.safeParse(body);
  if (!validation.success) {
    const error = validation.error.errors[0]?.message || 'Invalid request';
    return { ok: false, response: c.json({ success: false, error }, 400) };
  }
  return { ok: true, data: validation.data };
}

rewardsRouter.post('/rewards/prepare', firebaseAuth, async (c) => {
  const req = await readRequest(c, prepareRewardSchema);
  if (!req.ok) return req.response;
  const { action, levelId, input, platform } = req.data;

  try {
    const outcome = await prepareReward(c.env, REWARD_ACTIONS[action], { uid: c.get('uid'), action, levelId, input, platform });
    if (outcome.status === 'rejected') {
      return c.json({ success: false, error: outcome.error }, outcome.httpStatus);
    }
    return c.json({ success: true, ...outcome });
  } catch (err) {
    console.error('[Rewards] prepare failed:', err);
    return c.json({ success: false, error: 'Failed to prepare reward' }, 500);
  }
});

rewardsRouter.post('/rewards/claim', firebaseAuth, async (c) => {
  const req = await readRequest(c, claimRewardSchema);
  if (!req.ok) return req.response;
  const uid = c.get('uid');
  const { requestId, via } = req.data;

  try {
    const row = await getOwnGrant(c.env.AUDIT_DB, uid, requestId);
    const handler = row ? REWARD_ACTIONS[row.action as keyof typeof REWARD_ACTIONS] : undefined;
    if (!row || !handler) return c.json({ success: false, error: 'not-found' }, 404);

    const outcome = await claimReward(c.env, handler, { uid, requestId, via });
    if (outcome.status === 'rejected') {
      return c.json({ success: false, error: outcome.error }, outcome.httpStatus);
    }
    return c.json({ success: true, ...outcome });
  } catch (err) {
    console.error('[Rewards] claim failed:', err);
    return c.json({ success: false, error: 'Failed to claim reward' }, 500);
  }
});

rewardsRouter.post('/rewards/cancel', firebaseAuth, async (c) => {
  const req = await readRequest(c, cancelRewardSchema);
  if (!req.ok) return req.response;

  try {
    const cancelled = await cancelReward(c.env, { uid: c.get('uid'), ...req.data });
    return c.json({ success: cancelled });
  } catch (err) {
    console.error('[Rewards] cancel failed:', err);
    return c.json({ success: false, error: 'Failed to cancel reward' }, 500);
  }
});
