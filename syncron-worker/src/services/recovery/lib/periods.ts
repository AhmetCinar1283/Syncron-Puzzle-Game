/**
 * DOSYA AMACI: Liderlik periyotlarının (daily/weekly/monthly/all_time) BAŞLANGIÇ
 * ANINI hesaplayan saf yardımcılar. Yeniden hesaplama, bir periyoda yalnızca o
 * periyodun tamamı kanıt penceresinin içindeyse dokunabilir — bu dosya "periyot
 * ne zaman başladı?" sorusunu tek yerde cevaplar.
 *
 * Periyot KİMLİĞİ üretimi burada tekrarlanmaz: `services/leaderboard.ts`
 * içindeki `getCurrentPeriodIds` yeniden kullanılır (kopyalama yok).
 */

import { getCurrentPeriodIds } from '../../leaderboard';

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all_time';

export interface PeriodKey {
  periodType: PeriodType;
  periodId: string;
  /** Periyodun ilk anı (UTC, ISO). `all_time` için epoch. */
  startIso: string;
}

const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

/** Verilen ISO tarihinin ait olduğu ISO-8601 haftasının pazartesi 00:00 UTC anı. */
function isoWeekStart(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7; // pazar = 7
  utc.setUTCDate(utc.getUTCDate() - (dayNum - 1));
  return utc;
}

/**
 * Bir ANIN düştüğü daily/weekly/monthly/all_time periyotlarını, kimlikleri ve
 * başlangıç anlarıyla birlikte döner.
 */
export function periodKeysFor(date: Date): PeriodKey[] {
  const ids = getCurrentPeriodIds(date);
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

  return [
    { periodType: 'daily', periodId: ids.daily, startIso: dayStart.toISOString() },
    { periodType: 'weekly', periodId: ids.weekly, startIso: isoWeekStart(date).toISOString() },
    { periodType: 'monthly', periodId: ids.monthly, startIso: monthStart.toISOString() },
    { periodType: 'all_time', periodId: ids.allTime, startIso: EPOCH_ISO },
  ];
}

/**
 * Var olan bir satırın (`period_type`, `period_id`) başlangıç anını geri çözer.
 *
 * Alternatifi neydi ve neden reddettim? `user_period_scores` tablosuna bir
 *   `period_start` kolonu eklemek. Reddedildi: türetilebilen bir değeri
 *   saklamak, iki kaynağın zamanla ayrışması demektir; ayrıca geçmiş satırlar
 *   için geriye dönük doldurma (yazma) gerekirdi.
 * Yeni bir periyot türü eklenirse bu dosya değişir mi? Evet — ama bu doğru
 *   yerdir: periyot türü eklemek zaten şema CHECK kısıtını da değiştirir.
 * Değer bozuk/anlamsız gelirse? `null` döner. Çağıran taraf bunu "kapsam
 *   belirlenemedi" sayar ve o satıra DOKUNMAZ (güvenli taraf: veri kaybı yok).
 */
export function periodStartOf(periodType: string, periodId: string): string | null {
  if (periodType === 'all_time') return periodId === 'all_time' ? EPOCH_ISO : null;

  if (periodType === 'daily') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodId)) return null;
    const t = Date.parse(`${periodId}T00:00:00.000Z`);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }

  if (periodType === 'monthly') {
    if (!/^\d{4}-\d{2}$/.test(periodId)) return null;
    const t = Date.parse(`${periodId}-01T00:00:00.000Z`);
    return Number.isNaN(t) ? null : new Date(t).toISOString();
  }

  if (periodType === 'weekly') {
    const m = /^(\d{4})-W(\d{2})$/.exec(periodId);
    if (!m) return null;
    const year = Number(m[1]);
    const week = Number(m[2]);
    if (week < 1 || week > 53) return null;
    // ISO-8601: 4 Ocak her zaman 1. haftadadır → o haftanın pazartesisi referans.
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const week1Monday = isoWeekStart(jan4);
    week1Monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
    return week1Monday.toISOString();
  }

  return null;
}

/**
 * Periyot, kanıt penceresinin tamamen içinde mi?
 *
 * `coverageStart` null ise (hiç kanıt yok) yalnızca `all_time` kapsanır —
 * çünkü `all_time` kanıtını audit log'dan değil, kaynak tablodan alır.
 */
export function isPeriodCovered(startIso: string | null, coverageStart: string | null): boolean {
  if (startIso === null) return false;
  if (startIso === EPOCH_ISO) return true; // all_time: kaynağı played_levels
  if (coverageStart === null) return false;
  return startIso >= coverageStart;
}

export const PERIOD_EPOCH_ISO = EPOCH_ISO;
