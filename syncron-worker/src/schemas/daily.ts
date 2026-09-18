/**
 * DOSYA AMACI: Günlük bulmaca uç noktalarının (oyuncu + admin) Zod şemaları.
 */

import { z } from 'zod';
import { MOVES_LIMIT } from '../types';
import { EMPTY_DAY_POLICIES } from '../services/daily/dailyPolicy';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date');
const moveCode = z.enum(['u', 'd', 'l', 'r', 's']);

export const completeDailySchema = z.object({
  date: dateSchema,
  moves: z.array(moveCode, { required_error: 'Missing moves' }).min(1, 'Missing moves').max(MOVES_LIMIT),
  timeSpent: z.number({ required_error: 'Invalid timeSpent' }).min(0),
  // Yalnızca sonucu DÜŞÜREBİLİR; asıl karar reward_grants kayıtlarından verilir.
  hintsUsed: z.number().int().min(0).max(1000).default(0),
});

export const savePuzzleSchema = z.object({
  /** Verilmezse yeni bulmaca oluşturulur. */
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/).optional(),
  title: z.string().trim().min(1).max(100),
  level: z.record(z.unknown()),
  solution: z.array(moveCode).min(1).max(MOVES_LIMIT),
  parSource: z.enum(['solver', 'admin']),
  source: z.enum(['designed', 'generated']),
  status: z.enum(['draft', 'approved']),
  inPool: z.boolean().default(false),
  difficulty: z.number().int().min(1).max(4).nullable().default(null),
  /** Kaydedilince bu tarihe de ata (yalnızca onaylı bulmaca). */
  assignDate: dateSchema.optional(),
});

export const puzzleFlagsSchema = z.object({
  status: z.enum(['draft', 'approved']).optional(),
  inPool: z.boolean().optional(),
});

export const assignScheduleSchema = z.object({
  date: dateSchema,
  /** `null` → tarihin atamasını kaldır. */
  puzzleId: z.string().min(1).max(64).nullable(),
});

export const dailySettingsSchema = z.object({
  emptyDayPolicy: z.enum(EMPTY_DAY_POLICIES as [string, ...string[]]),
});

export const calendarQuerySchema = z.object({
  from: dateSchema.optional(),
  days: z.coerce.number().int().min(1).max(90).default(28),
});
