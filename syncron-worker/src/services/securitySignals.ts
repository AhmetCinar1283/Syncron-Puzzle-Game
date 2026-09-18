/**
 * DOSYA AMACI: Kötüye kullanım sinyallerini `audit_logs`'a `category: 'security'`
 * ile yazar. Yalnızca YAZAR — otomatik yasaklama bu dosyanın işi değildir
 * (bkz. .plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md §3.5 ve §4).
 */

import { writeAuditLog } from './auditLog';
import { sharedRateLimitStore } from './rateLimit';

/** Sinyal eşikleri — kod değil veri; tek yerde. */
export const SECURITY_SIGNAL_THRESHOLDS = {
  /**
   * `verifyMoves` başarısızlığı: tek tük olması NORMALDİR (istemci/sunucu sürüm
   * farkı, yarıda kalan oturum). Bu yüzden her başarısızlık loglanmaz; bir uid
   * için dakikada 5'i aşan başarısızlık şüphelidir ve o an kayıt yazılır.
   */
  verifyMovesFailuresPerMinute: 5,
  /**
   * Kimlik doğrulama başarısızlıkları: kimlik (uid) HENÜZ YOKTUR ve IP toplama
   * 05 numaralı görevin kararına bağlıdır (bu görevde IP'ye dayanan hiçbir şey
   * yazılmaz). Bu yüzden sinyal GLOBAL bir ani yükseliş sinyalidir: dakikada
   * 50'yi aşan başarısızlık, tek bir olay kaydı üretir.
   */
  authFailuresPerMinute: 50,
} as const;

/** Sinyal sayaçları hız limiti sayaçlarıyla AYNI mekanizmayı kullanır — ikinci bir sayaç yazılmadı. */
const MINUTE = 60_000;

/**
 * Eşik aşıldı mı? Sayaç deposunu "limit" olarak kullanır: sayaç `limit`i aştığı
 * anda `consume` reddeder, biz de bunu "eşik aşıldı" diye okuruz.
 *
 * Alternatifi neydi ve neden reddettim? Her başarısızlıkta `audit_logs`'a satır
 *   yazıp sonradan SQL ile saymak. Reddedildi: tam olarak korumaya çalıştığımız
 *   D1 yazma bütçesini saldırganın eline verirdi (başarısız her istek bir yazma).
 * Yeni bir sinyal türü eklenince bu dosya değişmek zorunda mı? Evet, bir satır
 *   eşik + bir ince fonksiyon eklenir — ama sayma/eşik mantığı kopyalanmaz.
 * Değer eksik/null gelirse? `uid` boşsa 'unknown' kovasına düşer; sinyal yine
 *   yazılır çünkü kimliksiz tekrar da bir sinyaldir.
 */
async function crossedThreshold(bucket: string, subject: string, perMinute: number, now: number): Promise<boolean> {
  const result = await sharedRateLimitStore.consume({
    key: `signal:${bucket}:${subject}`,
    limit: perMinute,
    windowMs: MINUTE,
    cost: 1,
    now,
  });
  return !result.allowed;
}

/**
 * Hız limiti aşımı. Eşik mantığı YOKTUR: aşımın kendisi zaten nadir bir olaydır
 * ve limitleyici, yazma sayısını doğal olarak dakikada bir kovaya sınırlar
 * (aşım devam ettikçe sayaç artmaz, bkz. `window.ts` — reddedilen istek saymaz).
 */
export async function recordRateLimitExceeded(
  db: D1Database,
  uid: string | null,
  endpoint: string,
  scope: 'uid' | 'global',
): Promise<void> {
  await writeAuditLog(db, uid ?? 'unknown', 'security.rate_limit_exceeded', 'security', { endpoint, scope });
}

/** `verifyMoves` başarısızlığı — yalnızca eşik aşıldığında kayıt yazar. */
export async function recordVerifyMovesFailure(
  db: D1Database,
  uid: string,
  levelId: string,
  now: number = Date.now(),
): Promise<boolean> {
  const flagged = await crossedThreshold(
    'verify-moves',
    uid || 'unknown',
    SECURITY_SIGNAL_THRESHOLDS.verifyMovesFailuresPerMinute,
    now,
  );
  if (!flagged) return false;
  await writeAuditLog(db, uid || 'unknown', 'security.verify_moves_failed', 'security', {
    levelId,
    thresholdPerMinute: SECURITY_SIGNAL_THRESHOLDS.verifyMovesFailuresPerMinute,
  });
  return true;
}

/** Kimlik doğrulama başarısızlığı — yalnızca global ani yükselişte kayıt yazar. */
export async function recordAuthFailure(
  db: D1Database,
  now: number = Date.now(),
): Promise<boolean> {
  const flagged = await crossedThreshold(
    'auth-failure',
    'global',
    SECURITY_SIGNAL_THRESHOLDS.authFailuresPerMinute,
    now,
  );
  if (!flagged) return false;
  await writeAuditLog(db, 'unknown', 'security.auth_failure_spike', 'security', {
    thresholdPerMinute: SECURITY_SIGNAL_THRESHOLDS.authFailuresPerMinute,
  });
  return true;
}
