/**
 * E-posta sahipliği kapısı (requireVerifiedEmail + adminAuth) davranış testleri.
 *
 * Yönetici ilke: doğrulanmamış hesap ≡ anonim hesap. Bu yüzden `firebaseAuth`
 * doğrulanmamış token'ı KABUL etmeye devam eder (oynama/kaydetme rotaları
 * açık kalır) ve yalnızca `requireVerifiedEmail` zincirlenen rotalar reddeder.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppContext } from '../src/types';

vi.mock('../src/services/auth', () => ({
  verifyIdToken: vi.fn(async (token: string) => {
    switch (token) {
      case 'verified':
        return { uid: 'u-verified', email: 'v@example.com', emailVerified: true };
      case 'unverified':
        return { uid: 'u-unverified', email: 'x@example.com', emailVerified: false };
      // Anonim oturum: `email` claim'i hiç yok.
      case 'anonymous':
        return { uid: 'u-anon', emailVerified: false };
      default:
        throw new Error('Invalid token');
    }
  }),
}));

const trackSecurityEvent = vi.fn();
vi.mock('../src/middleware/securityTrail', () => ({
  trackSecurityEvent: (...args: unknown[]) => trackSecurityEvent(...args),
}));
vi.mock('../src/services/securitySignals', () => ({
  recordAuthFailure: vi.fn(async () => undefined),
}));

// adminAuth, doğrulanmamış token'ı rol okumasından ÖNCE reddetmeli; bu yüzden
// bu servisler hiç çağrılmamalı. Çağrılırlarsa test bunu yakalar.
const getAdminAccessToken = vi.fn();
const fsGet = vi.fn();
vi.mock('../src/services/serviceAccount', () => ({
  getAdminAccessToken: (...a: unknown[]) => getAdminAccessToken(...a),
}));
vi.mock('../src/services/firestore', () => ({
  fsGet: (...a: unknown[]) => fsGet(...a),
  fromDoc: (d: unknown) => d,
}));

import { firebaseAuth, requireVerifiedEmail } from '../src/middleware/auth';
import { adminAuth } from '../src/middleware/adminAuth';

const ENV = { FIREBASE_PROJECT_ID: 'demo', GOOGLE_SERVICE_ACCOUNT: '{}' } as unknown as AppContext['Bindings'];

function buildApp() {
  const app = new Hono<AppContext>();
  // Anonim taban: oynama/kaydetme rotaları — kapısız.
  app.get('/open', firebaseAuth, (c) =>
    c.json({ ok: true, uid: c.get('uid'), verified: c.get('emailVerified') }),
  );
  // Anonim tabanın üstü: sosyal/destek rotaları — kapılı.
  app.get('/gated', firebaseAuth, requireVerifiedEmail, (c) => c.json({ ok: true, uid: c.get('uid') }));
  app.get('/admin', adminAuth, (c) => c.json({ ok: true }));
  return app;
}

const req = (app: Hono<AppContext>, path: string, token?: string) =>
  app.request(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }, ENV);

beforeEach(() => {
  trackSecurityEvent.mockClear();
  getAdminAccessToken.mockClear();
  fsGet.mockClear();
});

describe('firebaseAuth — anonim taban kapısız kalır', () => {
  it.each(['verified', 'unverified', 'anonymous'])('%s token açık rotadan geçer', async (token) => {
    const res = await req(buildApp(), '/open', token);
    expect(res.status).toBe(200);
  });

  it('emailVerified bağlama yazılır', async () => {
    const unverified = (await (await req(buildApp(), '/open', 'unverified')).json()) as { verified: boolean };
    expect(unverified.verified).toBe(false);
    const verified = (await (await req(buildApp(), '/open', 'verified')).json()) as { verified: boolean };
    expect(verified.verified).toBe(true);
  });
});

describe('requireVerifiedEmail', () => {
  it('doğrulanmış token geçer', async () => {
    const res = await req(buildApp(), '/gated', 'verified');
    expect(res.status).toBe(200);
  });

  it('doğrulanmamış token 403 + EMAIL_NOT_VERIFIED alır (401 DEĞİL)', async () => {
    const res = await req(buildApp(), '/gated', 'unverified');
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ success: false, error: 'EMAIL_NOT_VERIFIED' });
  });

  it('anonim token (email claim yok) 403 alır', async () => {
    const res = await req(buildApp(), '/gated', 'anonymous');
    expect(res.status).toBe(403);
  });

  it('token hiç yoksa hâlâ 401 (auth hatası ile doğrulama hatası ayrışır)', async () => {
    const res = await req(buildApp(), '/gated');
    expect(res.status).toBe(401);
  });

  it('403 güvenlik olayı YAZMAZ — auth.forbidden kritik sinyaldir, kirletilmemeli', async () => {
    await req(buildApp(), '/gated', 'unverified');
    expect(trackSecurityEvent).not.toHaveBeenCalled();
  });
});

describe('adminAuth — koşulsuz e-posta doğrulaması', () => {
  it('doğrulanmamış token 403 alır ve auth.forbidden olayı yazılır', async () => {
    const res = await req(buildApp(), '/admin', 'unverified');
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ success: false, error: 'EMAIL_NOT_VERIFIED' });
    expect(trackSecurityEvent).toHaveBeenCalledWith(
      expect.anything(),
      'auth.forbidden',
      expect.objectContaining({ reason: 'email-unverified', surface: 'admin' }),
      'u-unverified',
    );
  });

  it('rol okumasından ÖNCE reddeder: Firestore/OAuth çağrısı yapılmaz', async () => {
    await req(buildApp(), '/admin', 'unverified');
    expect(getAdminAccessToken).not.toHaveBeenCalled();
    expect(fsGet).not.toHaveBeenCalled();
  });

  it('doğrulanmış token kapıyı geçip rol kontrolüne ulaşır', async () => {
    getAdminAccessToken.mockResolvedValue('admin-token');
    fsGet.mockResolvedValue({ role: 'admin' });
    const res = await req(buildApp(), '/admin', 'verified');
    expect(res.status).toBe(200);
    expect(fsGet).toHaveBeenCalledTimes(1);
  });
});
