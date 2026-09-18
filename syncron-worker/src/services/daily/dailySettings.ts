/**
 * DOSYA AMACI: Günlük bulmaca ayarlarının (`daily_settings`) okunması/yazılması.
 * Şu an tek ayar: takvimde boş gün kalırsa ne olacağı (`empty_day_policy`).
 */

import { DEFAULT_EMPTY_DAY_POLICY, EMPTY_DAY_POLICIES, type EmptyDayPolicy } from './dailyPolicy';

export interface DailySettings {
  emptyDayPolicy: EmptyDayPolicy;
}

const KEY_EMPTY_DAY = 'empty_day_policy';

export async function getDailySettings(db: D1Database): Promise<DailySettings> {
  const row = await db
    .prepare('SELECT value FROM daily_settings WHERE key = ?1')
    .bind(KEY_EMPTY_DAY)
    .first<{ value: string }>();
  const value = row?.value as EmptyDayPolicy | undefined;
  return { emptyDayPolicy: value && EMPTY_DAY_POLICIES.includes(value) ? value : DEFAULT_EMPTY_DAY_POLICY };
}

export async function saveDailySettings(db: D1Database, settings: DailySettings): Promise<void> {
  await db
    .prepare(
      `INSERT INTO daily_settings (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
    .bind(KEY_EMPTY_DAY, settings.emptyDayPolicy)
    .run();
}
