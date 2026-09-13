/**
 * DOSYA AMACI: Bu dosya, seviye tamamlama isteklerinin (seviye ID'si, yapılan hamleler, 
 * harcanan süre vb.) doğruluğunu ve limitlerini doğrulayan Zod şemasını içerir.
 */

import { z } from 'zod';
import { MOVES_LIMIT } from '../types';

export const completeLevelSchema = z.object({
  levelId: z.string({ required_error: 'Missing levelId' }).min(1, 'Missing levelId'),
  moves: z.array(z.string(), { required_error: 'Missing moves' })
    .min(1, 'Missing moves')
    .max(MOVES_LIMIT, `Too many moves (max ${MOVES_LIMIT})`),
  timeSpent: z.number({ required_error: 'Invalid timeSpent' })
    .min(0, 'Invalid timeSpent'),
  // İstemcinin beyan ettiği ipucu sayısı. Yalnızca skoru DÜŞÜREBİLİR; asıl
  // karar sunucudaki reward_grants kayıtlarından verilir (services/hintScoring.ts).
  hintsUsed: z.number().int().min(0).max(1000).default(0),
});

export const telemetrySchema = z.object({
  id: z.string({ required_error: 'Missing id' }).min(1, 'Missing id'),
  levelId: z.string({ required_error: 'Missing levelId' }).min(1, 'Missing levelId'),
  version: z.number({ required_error: 'Missing version' }).int().min(1),
  outcome: z.enum(['win', 'restart', 'quit'], { required_error: 'Invalid outcome' }),
  timeSpent: z.number({ required_error: 'Missing timeSpent' }).min(0),
  restarts: z.number().int().min(0).default(0),
  deaths: z.number().int().min(0).default(0),
  movesCount: z.number().int().min(0).default(0),
  hintsUsed: z.number().int().min(0).max(1000).default(0),
});

export const feedbackSchema = z.object({
  levelId: z.string({ required_error: 'Missing levelId' }).min(1, 'Missing levelId'),
  version: z.number({ required_error: 'Missing version' }).int().min(1),
  difficulty: z.enum(['easy', 'normal', 'hard'], { required_error: 'Invalid difficulty' }),
  liked: z.number().int().min(0).max(1), // 1 = liked (thumbs up), 0 = disliked (thumbs down)
});

