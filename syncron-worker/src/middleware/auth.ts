/**
 * DOSYA AMACI: Bu dosya, kullanıcılara yönelik API uç noktalarında Firebase kimlik doğrulaması (JWT token) yapan 
 * ve geçerli kullanıcı kimliğini (uid) Hono bağlamına (context) ekleyen ara yazılımları (middleware) içerir.
 */

import { createMiddleware } from 'hono/factory';
import { verifyIdToken } from '../services/auth';
import { recordAuthFailure } from '../services/securitySignals';
import { trackSecurityEvent } from './securityTrail';
import type { AppContext } from '../types';

/**
 * Firebase Auth middleware for user-facing endpoints.
 * Verifies the Firebase ID token using RS256 + JWKS (jose library).
 * Sets c.var.uid for downstream route handlers.
 */
// Zorunlu Firebase kimlik doğrulaması yapar; token yoksa veya geçersizse 401 döner.
export const firebaseAuth = createMiddleware<AppContext>(async (c, next) => {
  const authHeader = c.req.header('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!idToken) {
    return c.json({ success: false, error: 'Missing Authorization header' }, 401);
  }

  try {
    // verifyIdToken now uses jose + JWKS — no REST API call, cryptographic verification
    const verified = await verifyIdToken(idToken, c.env.FIREBASE_PROJECT_ID);
    c.set('uid', verified.uid);
    c.set('emailVerified', verified.emailVerified);
    c.set('email', verified.email);
    await next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[firebaseAuth] Token verification failed:', msg);
    // §3.5 — arka arkaya kimlik doğrulama başarısızlıkları. Kimlik yok (token
    // zaten geçersiz) ve IP toplama 05'in kararına bağlı; bu yüzden sinyal
    // GLOBAL ani yükseliş sinyalidir ve yalnızca eşik aşımında yazılır.
    c.executionCtx.waitUntil(
      recordAuthFailure(c.env.AUDIT_DB).catch((e) =>
        console.error('[Security] auth failure signal write failed:', e),
      ),
    );
    // 05 §3.2 — eşiksiz adli iz: her başarısızlık `security_events`'e karma IP + UA
    // ile yazılır. Yukarıdaki sinyal "ani yükseliş var mı?" sorusunu, bu iz
    // "kim, nereden?" sorusunu cevaplar; ikisi farklı tablolarda yaşar.
    trackSecurityEvent(c, 'auth.failed', { reason: msg.slice(0, 120), optional: false }, null);
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
});

/**
 * Optional Firebase Auth middleware.
 * If Authorization header with Bearer token is provided, it verifies it.
 * If valid, sets c.var.uid. If invalid, returns 401.
 * If missing, allows request to proceed as anonymous (c.var.uid is undefined).
 */
// İsteğe bağlı Firebase kimlik doğrulaması yapar; token varsa doğrular, yoksa anonim geçişe izin verir.
export const optionalFirebaseAuth = createMiddleware<AppContext>(async (c, next) => {
  const authHeader = c.req.header('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!idToken) {
    await next();
    return;
  }

  try {
    const verified = await verifyIdToken(idToken, c.env.FIREBASE_PROJECT_ID);
    c.set('uid', verified.uid);
    c.set('emailVerified', verified.emailVerified);
    c.set('email', verified.email);
    await next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[optionalFirebaseAuth] Token verification failed:', msg);
    trackSecurityEvent(c, 'auth.failed', { reason: msg.slice(0, 120), optional: true }, null);
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
});

/**
 * E-posta sahipliği kapısı. `firebaseAuth`'tan SONRA zincirlenir ve yalnızca
 * anonim seviyenin ÜSTÜNDEKİ rotalara takılır (sosyal graf, herkese açık profil
 * yüzeyi, insan dikkati gerektiren yüzeyler).
 *
 * Yönetici ilke: doğrulanmamış hesap ≡ anonim hesap. Oynama/kaydetme rotaları
 * bu middleware'i ALMAZ — anonim kullanıcı zaten oraya erişebildiği için,
 * anonimden yükselmiş birinin oynama hakkını elinden almak kullanıcıyı
 * cezalandırır ve hiçbir güvenlik kazancı sağlamaz.
 *
 * 403 döner, 401 değil: token kriptografik olarak geçerli ve süresi dolmamış.
 * 401 dönmek istemciyi asla başarıya ulaşamayacak bir token-yenile-tekrar-dene
 * döngüsüne sokar ve audit tablolarında gerçek auth hatalarından ayrılamaz.
 *
 * Bilerek `trackSecurityEvent` çağırmıyor: `auth.forbidden` katalogda `critical`
 * ("yetki yükseltme sinyali"). Doğrulanmamış kullanıcının "Arkadaşlar"a dokunması
 * sıradan ve yüksek hacimli bir durum; oraya akıtmak sinyali öldürür. Admin
 * yüzeyi istisnadır ve kendi olayını adminAuth'ta yazar.
 */
export const requireVerifiedEmail = createMiddleware<AppContext>(async (c, next) => {
  if (c.get('emailVerified') === true) {
    await next();
    return;
  }
  return c.json({ success: false, error: 'EMAIL_NOT_VERIFIED' }, 403);
});
