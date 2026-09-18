/**
 * DOSYA AMACI: Bir güvenlik olayının kaydedilmesi kararı — katalogdaki
 * hassasiyet düzeyine bakar, gerekiyorsa parmak izini üretir ve satırı yazar.
 * Çağıran taraf "hangi log altyapısı" bilmez; yalnızca sözleşmeye yazar.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.1, §3.2
 */

import { collectsFingerprint, type SecurityEventType } from './lib/eventCatalog';
import { buildFingerprint } from './lib/fingerprint';
import { insertSecurityEvent } from './securityEventStore';

/** Çağıranın doldurduğu sözleşme: olay tipi + nerede + kim + serbest alanlar. */
export interface SecurityEventInput {
  type: SecurityEventType;
  /** İsteğin geldiği uç nokta yolu (`/complete-level`). Kimlik değil, yol. */
  endpoint: string;
  /** Kimlik biliniyorsa uid; kimlik doğrulama başarısızlığında `null`. */
  uid?: string | null;
  /** Olaya özel serbest alanlar. Kişisel veri KOYULMAZ. */
  metadata?: Record<string, unknown>;
}

/** Olayın yazılabilmesi için gereken dış dünya. Hono'dan bağımsızdır. */
export interface SecurityEventDeps {
  db: D1Database;
  /** İstek başlıkları — parmak izi yalnızca buradan okunur. */
  headers: { get(name: string): string | null };
  /** `wrangler secret put SECURITY_IP_SALT`. Yoksa IP karması yazılmaz. */
  ipSalt: string | undefined | null;
}

/**
 * Güvenlik olayını `security_events` tablosuna yazar.
 *
 * Alternatifi neydi ve neden reddettim? Çağrı yerlerinin doğrudan
 *   `insertSecurityEvent`'i çağırması. Reddedildi: o zaman "hangi olayda IP
 *   toplanır?" kararı sekiz ayrı route dosyasına dağılırdı ve KVKK'ya
 *   gösterilebilecek tek bir doğruluk kaynağı kalmazdı. Karar burada, veri
 *   `lib/eventCatalog.ts`'te, IO `securityEventStore.ts`'te.
 * Yeni bir olay tipi eklenince bu dosya değişmek zorunda mı? HAYIR — burada
 *   hiçbir olay adı geçmez; katalog büyür, bu dosya sabit kalır.
 * Değer eksik/null gelirse? `uid` yoksa satır `uid = NULL` ile yazılır (olayın
 *   kendisi kimliksiz olabilir). Tuz yoksa `ip` NULL kalır, olay yine yazılır.
 *   Yazma hatası çağıranın işini DÜŞÜRMEZ — bkz. `trackSecurityEvent`.
 */
export async function recordSecurityEvent(
  deps: SecurityEventDeps,
  input: SecurityEventInput,
): Promise<void> {
  const fingerprint = collectsFingerprint(input.type)
    ? await buildFingerprint(deps.headers, deps.ipSalt)
    : { ip: null, userAgent: null };

  await insertSecurityEvent(deps.db, {
    uid: input.uid ?? null,
    eventType: input.type,
    endpoint: input.endpoint,
    ip: fingerprint.ip,
    userAgent: fingerprint.userAgent,
    metadata: input.metadata ?? {},
  });
}
