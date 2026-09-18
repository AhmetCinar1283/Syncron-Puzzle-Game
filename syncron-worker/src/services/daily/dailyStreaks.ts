/**
 * DOSYA AMACI: Günlük bulmaca serisinin (`daily_streaks`) D1 okuma/yazması.
 * Seri kuralı saf olarak `dailyPolicy.nextStreak`'tedir.
 */

import { addDays } from './dailyDate';
import { nextStreak, type StreakState } from './dailyPolicy';

export async function getStreak(db: D1Database, uid: string): Promise<StreakState> {
  const row = await db
    .prepare('SELECT current, best, last_date FROM daily_streaks WHERE uid = ?1')
    .bind(uid)
    .first<{ current: number; best: number; last_date: string | null }>();
  return row ? { current: row.current, best: row.best, lastDate: row.last_date } : { current: 0, best: 0, lastDate: null };
}

/**
 * Resmî tamamlamayı seriye işler. İdempotent ve atomiktir: gün zaten işlenmişse
 * (tekrar oynama, yeniden deneme ya da eşzamanlı istek) hiçbir şey yazmaz.
 * `recorded` yalnızca bu çağrı günü GERÇEKTEN işlediğinde `true` olur; XP bu
 * bayrağa bağlıdır, böylece sonuç yazılıp seri yazılamadıysa yeniden deneme
 * seriyi ve XP'yi tamamlar, ama hiçbir durumda iki kez vermez.
 */
export async function recordStreakDay(
  db: D1Database,
  uid: string,
  date: string,
): Promise<{ state: StreakState; recorded: boolean }> {
  const prev = await getStreak(db, uid);
  const next = nextStreak(prev, date, addDays(date, -1));
  if (next === prev) return { state: prev, recorded: false };

  const res = await db
    .prepare(
      `INSERT INTO daily_streaks (uid, current, best, last_date) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(uid) DO UPDATE SET current = excluded.current, best = excluded.best,
         last_date = excluded.last_date, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE daily_streaks.last_date IS NOT excluded.last_date`,
    )
    .bind(uid, next.current, next.best, next.lastDate)
    .run();
  const recorded = (res.meta?.changes ?? 0) > 0;
  return { state: recorded ? next : await getStreak(db, uid), recorded };
}
