/**
 * DOSYA AMACI: Günlük Bulmaca Takvimi admin uç noktaları (ince katman; kurallar
 * services/daily/adminDaily.ts). Okuma admin+moderatör, yazma yalnızca admin.
 *
 *   GET    /admin/daily/calendar?from=&days=   — takvim + boşluk uyarısı
 *   GET    /admin/daily/puzzles                — kütüphane (içeriksiz liste)
 *   GET    /admin/daily/puzzles/:id            — tek bulmaca (level + çözüm)
 *   POST   /admin/daily/puzzles                — kaydet (çözüm oynatılarak doğrulanır)
 *   POST   /admin/daily/puzzles/:id/flags      — onay / yedek havuz
 *   DELETE /admin/daily/puzzles/:id            — sil (hiç atanmamışsa)
 *   POST   /admin/daily/schedule               — tarihe ata / atamayı kaldır
 *   GET    /admin/daily/settings, POST ...     — boş gün politikası
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { z } from 'zod';
import type { AppContext } from '../types';
import { adminAuth } from '../middleware/adminAuth';
import { writeAuditLog } from '../services/auditLog';
import {
  assignScheduleSchema, calendarQuerySchema, dailySettingsSchema, puzzleFlagsSchema, savePuzzleSchema,
} from '../schemas/daily';
import { canUnapprove, getCalendarView, removePuzzle, savePuzzle, setScheduleDate } from '../services/daily/adminDaily';
import { getPuzzle, listPuzzles, updatePuzzleFlags } from '../services/daily/dailyPuzzles';
import { getDailySettings, saveDailySettings } from '../services/daily/dailySettings';
import type { EmptyDayPolicy } from '../services/daily/dailyPolicy';

export const adminDailyRouter = new Hono<AppContext>();

/** Yalnızca admin + JSON + Zod; hata varsa yanıtı döner. */
async function readAdminWrite<T extends z.ZodTypeAny>(
  c: Context<AppContext>,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: Response }> {
  if (c.get('role') !== 'admin') {
    return { ok: false, response: c.json({ success: false, error: 'Admin role required' }, 403) };
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { ok: false, response: c.json({ success: false, error: 'Invalid JSON' }, 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, response: c.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid request' }, 400) };
  }
  return { ok: true, data: parsed.data };
}

function audit(c: Context<AppContext>, action: string, metadata: Record<string, unknown>): void {
  c.executionCtx.waitUntil(
    writeAuditLog(c.env.AUDIT_DB, c.get('uid'), action, 'admin', metadata)
      .catch((err) => console.error(`[AuditLog] ${action} write failed:`, err)),
  );
}

adminDailyRouter.get('/admin/daily/calendar', adminAuth, async (c) => {
  const parsed = calendarQuerySchema.safeParse({ from: c.req.query('from'), days: c.req.query('days') });
  if (!parsed.success) return c.json({ success: false, error: 'Invalid query' }, 400);
  const view = await getCalendarView(c.env.AUDIT_DB, parsed.data.from, parsed.data.days);
  return c.json({ success: true, ...view });
});

adminDailyRouter.get('/admin/daily/puzzles', adminAuth, async (c) => {
  return c.json({ success: true, puzzles: await listPuzzles(c.env.AUDIT_DB) });
});

adminDailyRouter.get('/admin/daily/puzzles/:id', adminAuth, async (c) => {
  // İçerik + çözüm yalnızca admin'e: moderatör gelecekteki bulmacayı önceden çözüp
  // günlük liderliği bozamasın (moderatör listeyi/takvimi görmeye devam eder).
  if (c.get('role') !== 'admin') return c.json({ success: false, error: 'Admin role required' }, 403);
  const puzzle = await getPuzzle(c.env.AUDIT_DB, c.req.param('id'));
  if (!puzzle) return c.json({ success: false, error: 'puzzle-not-found' }, 404);
  const { level_json, solution, ...rest } = puzzle;
  return c.json({ success: true, puzzle: { ...rest, level: JSON.parse(level_json), solution: solution.split('') } });
});

adminDailyRouter.post('/admin/daily/puzzles', adminAuth, async (c) => {
  const req = await readAdminWrite(c, savePuzzleSchema);
  if (!req.ok) return req.response;
  const result = await savePuzzle(c.env.AUDIT_DB, { ...req.data, adminUid: c.get('uid') });
  if (!result.ok) return c.json({ success: false, error: result.error }, result.status);
  audit(c, 'admin.daily_puzzle_save', { puzzleId: result.value.id, par: result.value.par, status: req.data.status, assignDate: req.data.assignDate ?? null });
  return c.json({ success: true, ...result.value });
});

adminDailyRouter.post('/admin/daily/puzzles/:id/flags', adminAuth, async (c) => {
  const req = await readAdminWrite(c, puzzleFlagsSchema);
  if (!req.ok) return req.response;
  const id = c.req.param('id');
  if (req.data.status === 'draft' && !(await canUnapprove(c.env.AUDIT_DB, id))) {
    return c.json({ success: false, error: 'puzzle-published' }, 409);
  }
  const changed = await updatePuzzleFlags(c.env.AUDIT_DB, id, req.data);
  if (!changed) return c.json({ success: false, error: 'puzzle-not-found' }, 404);
  audit(c, 'admin.daily_puzzle_flags', { puzzleId: id, ...req.data });
  return c.json({ success: true });
});

adminDailyRouter.delete('/admin/daily/puzzles/:id', adminAuth, async (c) => {
  if (c.get('role') !== 'admin') return c.json({ success: false, error: 'Admin role required' }, 403);
  const id = c.req.param('id');
  const result = await removePuzzle(c.env.AUDIT_DB, id);
  if (!result.ok) return c.json({ success: false, error: result.error }, result.status);
  audit(c, 'admin.daily_puzzle_delete', { puzzleId: id });
  return c.json({ success: true });
});

adminDailyRouter.post('/admin/daily/schedule', adminAuth, async (c) => {
  const req = await readAdminWrite(c, assignScheduleSchema);
  if (!req.ok) return req.response;
  const result = await setScheduleDate(c.env.AUDIT_DB, req.data.date, req.data.puzzleId);
  if (!result.ok) return c.json({ success: false, error: result.error }, result.status);
  audit(c, 'admin.daily_schedule_change', req.data);
  return c.json({ success: true });
});

adminDailyRouter.get('/admin/daily/settings', adminAuth, async (c) => {
  return c.json({ success: true, settings: await getDailySettings(c.env.AUDIT_DB) });
});

adminDailyRouter.post('/admin/daily/settings', adminAuth, async (c) => {
  const req = await readAdminWrite(c, dailySettingsSchema);
  if (!req.ok) return req.response;
  const settings = { emptyDayPolicy: req.data.emptyDayPolicy as EmptyDayPolicy };
  await saveDailySettings(c.env.AUDIT_DB, settings);
  audit(c, 'admin.daily_settings_change', settings);
  return c.json({ success: true, settings });
});
