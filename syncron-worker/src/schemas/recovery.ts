/**
 * DOSYA AMACI: `/admin/recovery/*` uç noktalarının Zod giriş şemaları.
 */

import { z } from 'zod';

/**
 * Yeniden hesaplama isteği.
 *
 * `dryRun` VARSAYILAN OLARAK true'dur: gövde hiç gönderilmese bile hiçbir şey
 * yazılmaz. Yazmak açık bir niyet (`dryRun: false`) ve `confirm` sayısı ister.
 * Kuru çalışma → etkilenecek satır sayısı + fark listesi döner.
 */
export const recomputeSchema = z
  .object({
    scope: z.enum(['user', 'creator', 'badges']),
    /** scope='user' için zorunlu. */
    uid: z.string().min(1).max(128).optional(),
    /** scope='creator' için isteğe bağlı daraltma. */
    levelId: z.string().min(1).max(128).optional(),
    /** scope='badges' için zorunlu. */
    period: z
      .object({
        type: z.enum(['weekly', 'monthly']),
        periodId: z.string().min(1).max(20),
      })
      .optional(),
    dryRun: z.boolean().optional().default(true),
    /** İkinci adım onayı: ilk adımda dönen `affectedRows` sayısının aynısı. */
    confirm: z.number().int().min(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'user' && !value.uid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "scope='user' icin uid zorunlu", path: ['uid'] });
    }
    if (value.scope === 'badges' && !value.period) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "scope='badges' icin period zorunlu", path: ['period'] });
    }
  });

export type RecomputeRequest = z.infer<typeof recomputeSchema>;
