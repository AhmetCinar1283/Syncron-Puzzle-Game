/**
 * DOSYA AMACI: Günlük bulmacanın oyuncu uç noktalarının istemcisi (`/daily/*`).
 * Tamamlama sonucu sunucuda doğrulanır; istemci hiçbir skoru kendisi hesaplamaz.
 */

import { workerFetch } from './workerClient';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

/** Günlük bulmaca sunucu gerektirir; worker yoksa özellik gösterilmez. */
export function isDailyServerConfigured(): boolean {
  return !!WORKER_URL;
}

export interface DailyOfficialResult {
  moveCount: number;
  timeSpent: number;
  stars: number;
  hinted: boolean;
}

export interface DailyPuzzleResponse {
  date: string;
  today: string;
  number: number;
  isArchive: boolean;
  puzzle: {
    id: string;
    title: string;
    version: number;
    par: number;
    difficulty: number | null;
    /** Oyun motorunun converter'ına verilecek level verisi. */
    level: Record<string, unknown>;
  } | null;
  officialResult: DailyOfficialResult | null;
  rank: number | null;
}

export interface DailyStreak {
  current: number;
  best: number;
  lastDate: string | null;
  playedToday: boolean;
}

export interface DailyArchiveEntry {
  date: string;
  number: number;
  title: string;
  par: number;
  officialStars: number | null;
}

export interface DailyLeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string | null;
  tag: string | null;
  moveCount: number;
  timeSpent: number;
  stars: number;
  hinted: boolean;
}

export interface DailyLeaderboardResponse {
  date: string;
  total: number;
  entries: DailyLeaderboardEntry[];
  me: (Omit<DailyLeaderboardEntry, 'uid' | 'displayName' | 'tag' | 'rank'> & { rank: number | null }) | null;
}

export interface CompleteDailyPayload {
  date: string;
  moves: string[];
  timeSpent: number;
  hintsUsed: number;
}

export interface CompleteDailyResponse {
  success: true;
  date: string;
  number: number;
  par: number;
  moveCount: number;
  stars: 1 | 2 | 3;
  hinted: boolean;
  isOfficial: boolean;
  isArchive: boolean;
  officialResult: DailyOfficialResult | null;
  streak: { current: number; best: number };
  rank: number | null;
  xpDelta: number;
}

/** `date` verilmezse bugünün bulmacası. */
export function fetchDailyPuzzle(date?: string): Promise<DailyPuzzleResponse> {
  return workerFetch<DailyPuzzleResponse>(`/daily/${date ?? 'today'}`);
}

export async function fetchDailyStreak(): Promise<DailyStreak> {
  const res = await workerFetch<{ streak: DailyStreak }>('/daily/streak', { requireAuth: true });
  return res.streak;
}

export async function fetchDailyArchive(days = 60): Promise<DailyArchiveEntry[]> {
  const res = await workerFetch<{ entries: DailyArchiveEntry[] }>(`/daily/archive?days=${days}`);
  return res.entries;
}

export function fetchDailyLeaderboard(date: string, limit = 50): Promise<DailyLeaderboardResponse> {
  return workerFetch<DailyLeaderboardResponse>(`/daily/leaderboard/${date}?limit=${limit}`);
}

export function completeDaily(payload: CompleteDailyPayload): Promise<CompleteDailyResponse> {
  return workerFetch<CompleteDailyResponse>('/daily/complete', { method: 'POST', body: payload, requireAuth: true });
}
