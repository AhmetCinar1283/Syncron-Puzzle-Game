/**
 * DOSYA AMACI: Admin takvim işlemlerinin iş kuralları: bulmaca kaydetme (doğrulama,
 * yayınlanmış içeriğin kilidi), tarih atama/kaldırma (takvim kilidi), silme ve
 * boşluk uyarılı takvim görünümü. Route katmanı yalnızca bunları çağırır.
 */

import { addDays, isValidDate, puzzleNumber, utcDate } from './dailyDate';
import { canEditScheduleDate, DAILY_POLICY } from './dailyPolicy';
import { deletePuzzle, getPuzzle, upsertPuzzle, type ParSource, type PuzzleSource, type PuzzleStatus } from './dailyPuzzles';
import {
  assignDate, clearDate, countDatesForPuzzle, countResultsForDate, getScheduleRange, isPuzzlePublished, type ScheduleEntry,
} from './dailySchedule';
import { getDailySettings } from './dailySettings';
import { validatePuzzle } from './puzzleValidation';

export type AdminDailyError =
  | 'invalid-level' | 'invalid-solution' | 'level-load-failed'
  | 'puzzle-not-found' | 'puzzle-published' | 'puzzle-not-approved' | 'puzzle-scheduled'
  | 'invalid-date' | 'date-in-past' | 'date-has-results';

export type AdminResult<T> = { ok: true; value: T } | { ok: false; status: 400 | 404 | 409; error: AdminDailyError };

function fail(status: 400 | 404 | 409, error: AdminDailyError): { ok: false; status: 400 | 404 | 409; error: AdminDailyError } {
  return { ok: false, status, error };
}

export interface SavePuzzleInput {
  id?: string;
  title: string;
  level: Record<string, unknown>;
  solution: string[];
  parSource: ParSource;
  source: PuzzleSource;
  status: PuzzleStatus;
  inPool: boolean;
  difficulty: number | null;
  assignDate?: string;
  adminUid: string;
}

export async function savePuzzle(
  db: D1Database,
  input: SavePuzzleInput,
  now: Date = new Date(),
): Promise<AdminResult<{ id: string; par: number; version: number }>> {
  const today = utcDate(now);
  const validation = validatePuzzle(input.level, input.solution);
  if (!validation.ok) return fail(400, validation.reason);

  const id = input.id ?? crypto.randomUUID();
  const existing = input.id ? await getPuzzle(db, input.id) : null;
  if (input.id && !existing) return fail(404, 'puzzle-not-found');

  if (existing && (await isPuzzlePublished(db, existing.id, today))) {
    // Oyuncuların gördüğü bulmacanın içeriği/par'ı değişirse sonuçlar anlamını yitirir.
    if (existing.level_json !== validation.levelJson || existing.par !== validation.par) return fail(409, 'puzzle-published');
    if (input.status === 'draft') return fail(409, 'puzzle-published');
  }

  if (input.assignDate) {
    if (input.status !== 'approved') return fail(400, 'puzzle-not-approved');
    const check = await checkScheduleEdit(db, input.assignDate, today);
    if (!check.ok) return check;
  }

  await upsertPuzzle(db, {
    id,
    title: input.title,
    levelJson: validation.levelJson,
    solution: input.solution.join(''),
    par: validation.par,
    parSource: input.parSource,
    source: existing ? existing.source : input.source,
    status: input.status,
    inPool: input.inPool,
    difficulty: input.difficulty,
    createdBy: input.adminUid,
  });
  if (input.assignDate) await assignDate(db, input.assignDate, id);

  const saved = await getPuzzle(db, id);
  return { ok: true, value: { id, par: validation.par, version: saved?.version ?? 1 } };
}

async function checkScheduleEdit(db: D1Database, date: string, today: string): Promise<{ ok: true } | ReturnType<typeof fail>> {
  if (!isValidDate(date)) return fail(400, 'invalid-date');
  const results = date === today ? await countResultsForDate(db, date) : 0;
  const check = canEditScheduleDate(date, today, results);
  return check.ok ? check : fail(409, check.reason);
}

export async function setScheduleDate(
  db: D1Database,
  date: string,
  puzzleId: string | null,
  now: Date = new Date(),
): Promise<AdminResult<null>> {
  const check = await checkScheduleEdit(db, date, utcDate(now));
  if (!check.ok) return check;

  if (puzzleId === null) {
    await clearDate(db, date);
    return { ok: true, value: null };
  }
  const puzzle = await getPuzzle(db, puzzleId);
  if (!puzzle) return fail(404, 'puzzle-not-found');
  if (puzzle.status !== 'approved') return fail(400, 'puzzle-not-approved');
  await assignDate(db, date, puzzleId);
  return { ok: true, value: null };
}

/** Taslağa çekme de yayınlanmış bulmacada yasaktır (geçmiş günler boş görünürdü). */
export async function canUnapprove(db: D1Database, puzzleId: string, now: Date = new Date()): Promise<boolean> {
  return !(await isPuzzlePublished(db, puzzleId, utcDate(now)));
}

export async function removePuzzle(db: D1Database, puzzleId: string): Promise<AdminResult<null>> {
  const puzzle = await getPuzzle(db, puzzleId);
  if (!puzzle) return fail(404, 'puzzle-not-found');
  if ((await countDatesForPuzzle(db, puzzleId)) > 0) return fail(409, 'puzzle-scheduled');
  await deletePuzzle(db, puzzleId);
  return { ok: true, value: null };
}

export interface CalendarDay {
  date: string;
  number: number;
  entry: ScheduleEntry | null;
  /** Bugün veya ileride ve atanmış bulmaca yok. */
  isGap: boolean;
  locked: boolean;
}

export interface CalendarView {
  today: string;
  emptyDayPolicy: 'pool' | 'none';
  poolSize: number;
  days: CalendarDay[];
  /** Bugünden itibaren `gapWindowDays` gün içindeki boş günler. */
  upcomingGaps: string[];
  gapWindowDays: number;
}

export const GAP_WARNING_DAYS = 14;

/** Saf: takvim günlerini ve boşlukları hesaplar. */
export function buildCalendarDays(from: string, days: number, today: string, entries: ScheduleEntry[]): CalendarDay[] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const entry = byDate.get(date) ?? null;
    const locked = date < today || (date === today && (entry?.results ?? 0) > 0);
    return { date, number: puzzleNumber(date), entry, isGap: date >= today && entry === null, locked };
  });
}

export async function getCalendarView(
  db: D1Database,
  from: string | undefined,
  days: number,
  now: Date = new Date(),
): Promise<CalendarView> {
  const today = utcDate(now);
  const start = from && isValidDate(from) ? from : addDays(today, -3);
  const span = Math.min(days, DAILY_POLICY.calendarMaxDays);
  const gapEnd = addDays(today, GAP_WARNING_DAYS - 1);
  const rangeEnd = addDays(start, span - 1);

  const [entries, gapEntries, settings, pool] = await Promise.all([
    getScheduleRange(db, start, rangeEnd),
    getScheduleRange(db, today, gapEnd),
    getDailySettings(db),
    db.prepare(`SELECT COUNT(*) AS n FROM daily_puzzles WHERE status = 'approved' AND in_pool = 1`).first<{ n: number }>(),
  ]);

  const upcomingGaps = buildCalendarDays(today, GAP_WARNING_DAYS, today, gapEntries).filter((d) => d.isGap).map((d) => d.date);
  return {
    today,
    emptyDayPolicy: settings.emptyDayPolicy,
    poolSize: pool?.n ?? 0,
    days: buildCalendarDays(start, span, today, entries),
    upcomingGaps,
    gapWindowDays: GAP_WARNING_DAYS,
  };
}
