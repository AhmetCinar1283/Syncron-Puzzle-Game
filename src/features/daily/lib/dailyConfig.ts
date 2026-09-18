/**
 * DOSYA AMACI: Günlük bulmaca istemci sabitleri ve "özellik bu build'de açık mı"
 * kararı (portal izni yetenek nesnesinden, sunucu erişimi worker yapılandırmasından).
 */

import type { PlatformCapabilities } from '@/services/monetization';
import { isDailyServerConfigured } from '@/services/api/dailyClient';

/** Paylaşım metnine eklenen link (açıldığında /daily'nin Open Graph önizlemesi görünür). */
export const DAILY_SHARE_URL = 'https://syncron.polyvoclub.com/daily/';

/** Arşivde listelenen en fazla gün. */
export const DAILY_ARCHIVE_DAYS = 60;

/** Günlük liderlikte gösterilen satır sayısı. */
export const DAILY_LEADERBOARD_LIMIT = 50;

export function isDailyAvailable(capabilities: Pick<PlatformCapabilities, 'dailyPuzzle'>): boolean {
  return capabilities.dailyPuzzle && isDailyServerConfigured();
}

/** Saniyeyi "m:ss" biçimine çevirir. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
