/**
 * DOSYA AMACI: Bu dosya, kullanıcılara yönelik API uç noktalarında Firebase kimlik doğrulaması (JWT token) yapan 
 * ve geçerli kullanıcı kimliğini (uid) Hono bağlamına (context) ekleyen ara yazılımları (middleware) içerir.
 */

import { createMiddleware } from 'hono/factory';
import { verifyIdToken } from '../services/auth';
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
    await next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[firebaseAuth] Token verification failed:', msg);
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
    await next();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[optionalFirebaseAuth] Token verification failed:', msg);
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
});
