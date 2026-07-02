/**
 * DOSYA AMACI: Bu dosya, liderlik tablosu sorgu parametrelerinin (limit, yakınındakiler, 
 * sadece arkadaşlar vb.) tiplerini ve limitlerini doğrulayan Zod şemasını içerir.
 */

import { z } from 'zod';

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  around_me: z.preprocess((val) => val === 'true', z.boolean()).default(false),
  friends_only: z.preprocess((val) => val === 'true', z.boolean()).default(false),
});
