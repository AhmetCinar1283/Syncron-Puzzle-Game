/**
 * DOSYA AMACI: Günlük Bulmaca Takvimi admin uç noktalarının istemcisi (`/admin/daily/*`).
 * Yetki worker'da (`adminAuth`, yazma yalnızca admin) doğrulanır.
 */

import { workerFetch } from './workerClient';

export type DailyPuzzleStatus = 'draft' | 'approved';
export type DailyParSource = 'solver' | 'admin';
export type DailyPuzzleSource = 'designed' | 'generated';
export type EmptyDayPolicy = 'pool' | 'none';

export interface AdminPuzzleSummary {
  id: string;
  title: string;
  version: number;
  par: number;
  par_source: DailyParSource;
  source: DailyPuzzleSource;
  status: DailyPuzzleStatus;
  in_pool: number;
  difficulty: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  dates: string[];
}

export interface AdminPuzzleDetail extends Omit<AdminPuzzleSummary, 'dates'> {
  level: Record<string, unknown>;
  solution: string[];
}

export interface CalendarEntry {
  date: string;
  puzzle_id: string;
  assigned_by: 'admin' | 'fallback';
  title: string;
  status: DailyPuzzleStatus;
  results: number;
}

export interface CalendarDay {
  date: string;
  number: number;
  entry: CalendarEntry | null;
  isGap: boolean;
  locked: boolean;
}

export interface CalendarResponse {
  today: string;
  emptyDayPolicy: EmptyDayPolicy;
  poolSize: number;
  days: CalendarDay[];
  upcomingGaps: string[];
  gapWindowDays: number;
}

export interface SavePuzzlePayload {
  id?: string;
  title: string;
  level: Record<string, unknown>;
  /** Hamle kodları ('u','d','l','r','s'). Worker oynatarak doğrular. */
  solution: string[];
  parSource: DailyParSource;
  source: DailyPuzzleSource;
  status: DailyPuzzleStatus;
  inPool: boolean;
  difficulty: number | null;
  assignDate?: string;
}

export function fetchCalendar(from: string | undefined, days: number): Promise<CalendarResponse> {
  const query = new URLSearchParams({ days: String(days), ...(from ? { from } : {}) });
  return workerFetch<CalendarResponse>(`/admin/daily/calendar?${query}`, { requireAuth: true });
}

export async function fetchPuzzles(): Promise<AdminPuzzleSummary[]> {
  const res = await workerFetch<{ puzzles: AdminPuzzleSummary[] }>('/admin/daily/puzzles', { requireAuth: true });
  return res.puzzles;
}

export async function fetchPuzzle(id: string): Promise<AdminPuzzleDetail> {
  const res = await workerFetch<{ puzzle: AdminPuzzleDetail }>(`/admin/daily/puzzles/${encodeURIComponent(id)}`, { requireAuth: true });
  return res.puzzle;
}

export function savePuzzle(payload: SavePuzzlePayload): Promise<{ id: string; par: number; version: number }> {
  return workerFetch('/admin/daily/puzzles', { method: 'POST', body: payload, requireAuth: true });
}

export function setPuzzleFlags(id: string, flags: { status?: DailyPuzzleStatus; inPool?: boolean }): Promise<unknown> {
  return workerFetch(`/admin/daily/puzzles/${encodeURIComponent(id)}/flags`, { method: 'POST', body: flags, requireAuth: true });
}

export function deletePuzzle(id: string): Promise<unknown> {
  return workerFetch(`/admin/daily/puzzles/${encodeURIComponent(id)}`, { method: 'DELETE', requireAuth: true });
}

export function assignScheduleDate(date: string, puzzleId: string | null): Promise<unknown> {
  return workerFetch('/admin/daily/schedule', { method: 'POST', body: { date, puzzleId }, requireAuth: true });
}

export function saveDailySettings(emptyDayPolicy: EmptyDayPolicy): Promise<unknown> {
  return workerFetch('/admin/daily/settings', { method: 'POST', body: { emptyDayPolicy }, requireAuth: true });
}
