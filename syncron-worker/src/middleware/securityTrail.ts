/**
 * DOSYA AMACI: Hono bağlamı ile `services/securityEvents` arasındaki TEK köprü.
 * İstek başlıklarını, D1 binding'ini ve tuz sırrını burada toplar; yazmayı
 * `waitUntil` ile yanıtın dışına taşır. Karar mantığı burada DEĞİLDİR.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.2
 */

import type { Context } from 'hono';
import type { AppContext } from '../types';
import { recordSecurityEvent, type SecurityEventType } from '../services/securityEvents';

/**
 * Güvenlik olayını yanıtı geciktirmeden kaydeder.
 *
 * Alternatifi neydi ve neden reddettim? Her çağrı yerinde `c.executionCtx.waitUntil(...)`
 *   + `.catch(...)` üçlüsünü elle yazmak. Reddedildi: sekiz çağrı yerinde
 *   kopyalanır, biri `catch`i unutursa bir log yazma hatası isteği düşürürdü.
 * Yeni bir olay tipi eklenince bu dosya değişmek zorunda mı? HAYIR — burada
 *   hiçbir olay adı geçmez.
 * Değer eksik/null gelirse? `executionCtx` yoksa (test/scheduled bağlamı)
 *   yazma senkron olarak denenir ve yine yutulur; `SECURITY_IP_SALT` yoksa
 *   olay IP'siz yazılır. HİÇBİR koşulda çağıranın isteği düşmez.
 */
export function trackSecurityEvent(
  c: Context<AppContext>,
  type: SecurityEventType,
  metadata: Record<string, unknown> = {},
  uidOverride?: string | null,
): void {
  const uid = uidOverride !== undefined ? uidOverride : (c.get('uid') ?? null);

  const write = recordSecurityEvent(
    {
      db: c.env.AUDIT_DB,
      headers: c.req.raw.headers,
      ipSalt: c.env.SECURITY_IP_SALT,
    },
    {
      type,
      endpoint: new URL(c.req.url).pathname,
      uid,
      metadata,
    },
  ).catch((err) => {
    console.error('[SecurityTrail] write failed:', err);
  });

  try {
    c.executionCtx.waitUntil(write);
  } catch {
    // executionCtx her bağlamda yoktur; yazma zaten başladı ve hatası yutuldu.
  }
}
