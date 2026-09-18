/**
 * DOSYA AMACI: `security_events` tablosunun günlük temizliği — 30 günden eski
 * satırlar SİLİNİR. Arşivlenmez, R2'ye gitmez.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.1, §3.5
 */

import { deleteSecurityEventsOlderThan } from '../services/securityEvents';
import type { Env } from '../types';

/**
 * Saklama süresi — KVKK aydınlatma metninde BEYAN EDİLEN süredir
 * (`/privacy` §7, `/kvkk` §6). Bu sayıyı değiştiren, metinleri de değiştirmek
 * zorundadır (00-ilkeler.md §2.4).
 */
export const SECURITY_EVENT_RETENTION_DAYS = 30;

/** Tek sorguda silinecek en fazla satır; cron'un zaman aşımına uğramaması için. */
const BATCH_SIZE = 500;

/** Sonsuz döngüye karşı üst sınır: 500 × 100 = 50.000 satır/çalıştırma. */
const MAX_BATCHES = 100;

/**
 * 30 günden eski güvenlik olaylarını parça parça siler.
 *
 * Alternatifi neydi ve neden reddettim? `logRetention.ts` gibi önce R2'ye
 *   arşivleyip sonra silmek. Reddedildi: tablo kişisel veri (karma IP + UA)
 *   içerir; arşivlemek, 30 günlük saklama vaadini fiilen süresiz hâle
 *   getirirdi (§3.1 açık yasak).
 * Yeni bir olay tipi eklenince bu dosya değişmek zorunda mı? HAYIR — burada
 *   hiçbir olay adı geçmez, saklama süresi tüm tablo için tektir.
 * Değer eksik/null gelirse? Silme hatası fırlatılmaz; loglanır ve döngü durur.
 *   Bir sonraki gün yeniden denenir — temizliğin gecikmesi kesintiden iyidir.
 */
export async function runSecurityEventRetention(env: Env, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - SECURITY_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();

  console.log(`[SecurityEventRetention] Starting. Cutoff: ${cutoffIso}`);

  let totalDeleted = 0;
  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    let deleted: number;
    try {
      deleted = await deleteSecurityEventsOlderThan(env.AUDIT_DB, cutoffIso, BATCH_SIZE);
    } catch (err) {
      console.error('[SecurityEventRetention] Delete failed, stopping run:', err);
      break;
    }
    if (deleted === 0) break;
    totalDeleted += deleted;
    if (deleted < BATCH_SIZE) break;
  }

  console.log(`[SecurityEventRetention] Done. Deleted ${totalDeleted} rows.`);
  return totalDeleted;
}
