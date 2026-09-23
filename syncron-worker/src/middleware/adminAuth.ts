/**
 * DOSYA AMACI: Bu dosya, admin paneline erişmeye çalışan isteklerin Firebase kimlik doğrulamasını (JWT token) 
 * doğrulayan ve kullanıcının rolünü ('admin' veya 'moderator') kontrol eden yetkilendirme ara yazılımını (middleware) içerir.
 */

/**
 * Admin authentication middleware.
 *
 * Verifies the Firebase ID token and checks that the caller has
 * 'admin' or 'moderator' role in Firestore. Sets c.var.uid and
 * c.var.role for downstream route handlers to use.
 *
 * Moderators can only reach GET (read-only) endpoints. Write endpoints
 * must additionally check that role === 'admin' if needed.
 */

import { createMiddleware } from 'hono/factory';
import { verifyIdToken } from '../services/auth';
import { fsGet, fromDoc } from '../services/firestore';
import { getAdminAccessToken } from '../services/serviceAccount';
import { trackSecurityEvent } from './securityTrail';
import type { AppContext } from '../types';

// İsteğin başlığındaki (Authorization) Firebase ID Token'ı ve kullanıcının admin/moderator rolünü doğrular.
export const adminAuth = createMiddleware<AppContext>(async (c, next) => {
  // 1. Extract Bearer token
  const authHeader = c.req.header('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) {
    return c.json({ success: false, error: 'Missing Authorization header' }, 401);
  }

  // 2. Cryptographic JWT verification (jose + JWKS)
  let uid: string;
  let emailVerified: boolean;
  try {
    const verified = await verifyIdToken(idToken, c.env.FIREBASE_PROJECT_ID);
    uid = verified.uid;
    emailVerified = verified.emailVerified;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[adminAuth] Token verification failed:', msg);
    // 05 §3.2 — admin yüzeyine geçersiz token ile gelen istek, oyuncu yüzeyindekinden
    // daha ciddidir; `surface: 'admin'` ile ayrışsın diye ayrıca işaretlenir.
    trackSecurityEvent(c, 'auth.failed', { reason: msg.slice(0, 120), surface: 'admin' }, null);
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  // 2b. E-posta sahipliği kapısı — rol okumasından ÖNCE (bir Firestore okuması
  // ve bir OAuth token basımı tasarruf eder). Admin yüzeyi koşulsuz zorlar:
  // gerçek bir admin/moderator rolü taşıyıp e-postası kanıtlanmamış bir hesabın
  // buraya dokunması, oyuncu yüzeyindekinin aksine gerçekten anormaldir — bu
  // yüzden requireVerifiedEmail'den farklı olarak burada olay yazılır.
  if (!emailVerified) {
    trackSecurityEvent(c, 'auth.forbidden', { reason: 'email-unverified', surface: 'admin' }, uid);
    return c.json({ success: false, error: 'EMAIL_NOT_VERIFIED' }, 403);
  }

  // 3. Fetch user document to check role
  let role: string;
  try {
    const adminToken = await getAdminAccessToken(c.env.GOOGLE_SERVICE_ACCOUNT);
    const userDoc = await fsGet(c.env.FIREBASE_PROJECT_ID, `users/${uid}`, adminToken);
    if (!userDoc) {
      trackSecurityEvent(c, 'auth.forbidden', { reason: 'user-not-found' }, uid);
      return c.json({ success: false, error: 'User not found' }, 403);
    }
    const userData = fromDoc(userDoc);
    role = typeof userData.role === 'string' ? userData.role : 'user';
  } catch (err: unknown) {
    console.error('[adminAuth] Failed to fetch user role:', err);
    return c.json({ success: false, error: 'Internal error during authorization' }, 500);
  }

  // 4. Enforce admin/moderator access
  if (role !== 'admin' && role !== 'moderator') {
    // Kimliği GERÇEK ama yetkisi olmayan bir hesabın admin yüzeyine dokunması:
    // yetki yükseltme denemesinin en net sinyali (katalogda `critical`).
    trackSecurityEvent(c, 'auth.forbidden', { reason: 'insufficient-role', role }, uid);
    return c.json({ success: false, error: 'Insufficient permissions' }, 403);
  }

  c.set('uid', uid);
  c.set('role', role);
  await next();
});
