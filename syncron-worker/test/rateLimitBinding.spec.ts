/**
 * DOSYA AMACI: Cloudflare Rate Limiting binding'i üzerine kurulu ikinci
 * `RateLimitStore` uygulamasının ve katman sıralamasının karar noktaları.
 * bkz. .plans/yayin-hazirlik/notlar.md §2
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  rateLimiterBindingName,
  createCloudflareRateLimitStore,
  hasAnyRateLimiterBinding,
  createLayeredRateLimitStore,
  resolveRateLimitStore,
  evaluateRateLimit,
  type RateLimitStore,
} from '../src/services/rateLimit';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const T0 = 1_700_000_000_000;

/** Testte gerçek binding yerine geçen sahte. Çağrıları ve anahtarları kaydeder. */
function fakeBinding(results: boolean[] | boolean = true) {
  const keys: string[] = [];
  let i = 0;
  return {
    keys,
    get calls() {
      return keys.length;
    },
    limit: async ({ key }: { key: string }) => {
      keys.push(key);
      const success = Array.isArray(results) ? (results[i++] ?? false) : results;
      return { success };
    },
  };
}

const INPUT = { key: 'complete-level:uid:u1:60000', limit: 30, windowMs: MINUTE, cost: 1, now: T0 };

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Saf ad eşlemesi ────────────────────────────────────────────────────────

describe('rateLimiterBindingName', () => {
  it('dakikalık kuralı ad sözleşmesine çevirir', () => {
    expect(rateLimiterBindingName(30, MINUTE)).toBe('RL_30_PER_60S');
    expect(rateLimiterBindingName(2, MINUTE)).toBe('RL_2_PER_60S');
  });

  it('10 saniyelik pencereyi de destekler', () => {
    expect(rateLimiterBindingName(5, 10_000)).toBe('RL_5_PER_10S');
  });

  it('SAATLİK kural için ad ÜRETMEZ (platform sınırı: period ∈ {10, 60})', () => {
    expect(rateLimiterBindingName(600, HOUR)).toBeUndefined();
  });

  it('desteklenmeyen pencere veya bozuk limitte undefined döner', () => {
    expect(rateLimiterBindingName(30, 30_000)).toBeUndefined();
    expect(rateLimiterBindingName(0, MINUTE)).toBeUndefined();
    expect(rateLimiterBindingName(-5, MINUTE)).toBeUndefined();
    expect(rateLimiterBindingName(1.5, MINUTE)).toBeUndefined();
    expect(rateLimiterBindingName(30, Number.NaN)).toBeUndefined();
  });
});

// ─── Binding tabanlı depo ───────────────────────────────────────────────────

describe('createCloudflareRateLimitStore', () => {
  it('binding izin verirse geçirir ve kovayı çağıranın anahtarıyla çağırır', async () => {
    const binding = fakeBinding(true);
    const store = createCloudflareRateLimitStore({ RL_30_PER_60S: binding });

    const r = await store.consume(INPUT);

    expect(r).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(binding.keys).toEqual(['complete-level:uid:u1:60000']);
  });

  it('binding reddederse kalan süre olarak TÜM pencereyi verir (binding süre bildirmez)', async () => {
    const store = createCloudflareRateLimitStore({ RL_30_PER_60S: fakeBinding(false) });

    const r = await store.consume(INPUT);

    expect(r).toEqual({ allowed: false, retryAfterMs: MINUTE });
  });

  it('binding YOKSA istek geçer ve durum BİR KEZ loglanır (sessiz kalmaz)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createCloudflareRateLimitStore({});

    expect(await store.consume(INPUT)).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(await store.consume(INPUT)).toEqual({ allowed: true, retryAfterMs: 0 });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('RL_30_PER_60S');
  });

  it('binding adı doluysa ama nesne binding DEĞİLSE patlamaz, geçirir', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createCloudflareRateLimitStore({ RL_30_PER_60S: 'yanlışlıkla string' });

    expect(await store.consume(INPUT)).toEqual({ allowed: true, retryAfterMs: 0 });
  });

  it('binding ile ifade edilemeyen SAATLİK kuralı bellek katmanına bırakır', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createCloudflareRateLimitStore({ RL_30_PER_60S: fakeBinding(true) });

    const r = await store.consume({ ...INPUT, limit: 600, windowMs: HOUR });

    expect(r).toEqual({ allowed: true, retryAfterMs: 0 });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('maliyet 1den büyükse binding o kadar kez sayar', async () => {
    const binding = fakeBinding(true);
    const store = createCloudflareRateLimitStore({ RL_30_PER_60S: binding });

    await store.consume({ ...INPUT, cost: 3 });

    expect(binding.calls).toBe(3);
  });

  it('saçma büyük maliyet alt çağrıları patlatmaz (tavan uygulanır)', async () => {
    const binding = fakeBinding(true);
    const store = createCloudflareRateLimitStore({ RL_30_PER_60S: binding });

    await store.consume({ ...INPUT, cost: 10_000 });

    expect(binding.calls).toBe(10);
  });

  it('maliyet NaN gelirse tek çağrıya düşer', async () => {
    const binding = fakeBinding(true);
    const store = createCloudflareRateLimitStore({ RL_30_PER_60S: binding });

    await store.consume({ ...INPUT, cost: Number.NaN });

    expect(binding.calls).toBe(1);
  });

  it('binding hatası YUTULMAZ — fail-open kararı üst katmanın (middleware) işidir', async () => {
    const store = createCloudflareRateLimitStore({
      RL_30_PER_60S: {
        limit: async () => {
          throw new Error('edge down');
        },
      },
    });

    await expect(store.consume(INPUT)).rejects.toThrow('edge down');
  });
});

describe('hasAnyRateLimiterBinding', () => {
  it('yalnızca gerçek binding varken true döner', () => {
    expect(hasAnyRateLimiterBinding({ RL_30_PER_60S: fakeBinding(true) })).toBe(true);
    expect(hasAnyRateLimiterBinding({ RL_30_PER_60S: 'string' })).toBe(false);
    expect(hasAnyRateLimiterBinding({ AUDIT_DB: {} })).toBe(false);
    expect(hasAnyRateLimiterBinding({})).toBe(false);
  });
});

// ─── Katman sıralaması ──────────────────────────────────────────────────────

function recordingStore(allowed: boolean, log: string[], name: string): RateLimitStore {
  return {
    async consume() {
      log.push(name);
      return { allowed, retryAfterMs: allowed ? 0 : 1_234 };
    },
  };
}

describe('createLayeredRateLimitStore', () => {
  it('ÖN FİLTRE reddederse arkadaki pahalı katman HİÇ çağrılmaz', async () => {
    const log: string[] = [];
    const store = createLayeredRateLimitStore([
      recordingStore(false, log, 'memory'),
      recordingStore(true, log, 'binding'),
    ]);

    const r = await store.consume(INPUT);

    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBe(1_234);
    expect(log).toEqual(['memory']);
  });

  it('ön filtre geçirse bile paylaşılan katman reddedebilir', async () => {
    const log: string[] = [];
    const store = createLayeredRateLimitStore([
      recordingStore(true, log, 'memory'),
      recordingStore(false, log, 'binding'),
    ]);

    expect((await store.consume(INPUT)).allowed).toBe(false);
    expect(log).toEqual(['memory', 'binding']);
  });

  it('katman yoksa istek geçer (fail-open)', async () => {
    expect(await createLayeredRateLimitStore([]).consume(INPUT)).toEqual({
      allowed: true,
      retryAfterMs: 0,
    });
  });
});

// ─── Kompozisyon noktası ────────────────────────────────────────────────────

describe('resolveRateLimitStore', () => {
  it('binding yokken sistem korumasız kalmaz: bellek içi limit çalışır ve durum loglanır', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = resolveRateLimitStore({ AUDIT_DB: {} });

    const key = `no-binding-test:${Math.random()}`;
    const first = await store.consume({ key, limit: 2, windowMs: MINUTE, cost: 1, now: T0 });
    await store.consume({ key, limit: 2, windowMs: MINUTE, cost: 1, now: T0 });
    const third = await store.consume({ key, limit: 2, windowMs: MINUTE, cost: 1, now: T0 });

    expect(first.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('binding bulunamadı'))).toBe(true);
  });

  it('binding varsa uyarı basmaz ve binding sayacı da danışılır', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const binding = fakeBinding(false);
    const store = resolveRateLimitStore({ RL_30_PER_60S: binding });

    const r = await store.consume({ ...INPUT, key: `binding-test:${Math.random()}` });

    expect(r.allowed).toBe(false);
    expect(binding.calls).toBe(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('aynı env için depo yeniden kurulmaz (önbellek)', () => {
    const env = { RL_30_PER_60S: fakeBinding(true) };
    expect(resolveRateLimitStore(env)).toBe(resolveRateLimitStore(env));
  });

  it('env yoksa bellek içi depoya düşer, patlamaz', async () => {
    const store = resolveRateLimitStore(undefined);
    expect((await store.consume({ ...INPUT, key: `no-env:${Math.random()}` })).allowed).toBe(true);
  });
});

// ─── Uçtan uca: kademe tablosu + katmanlı depo ──────────────────────────────

describe('evaluateRateLimit + binding katmanı', () => {
  it('binding reddederse 429 için Retry-After saniyesi pencereden gelir', async () => {
    const store = resolveRateLimitStore({ RL_30_PER_60S: fakeBinding(false) });

    const outcome = await evaluateRateLimit(store, {
      endpoint: 'complete-level',
      identity: `u-${Math.random()}`,
      now: T0,
    });

    expect(outcome.allowed).toBe(false);
    expect(outcome.retryAfterSeconds).toBe(60);
    expect(outcome.exceededScope).toBe('uid');
  });

  it('kademe tablosu değişmedi: strict hâlâ 30/dk + 600/saat', async () => {
    const binding = fakeBinding(true);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = resolveRateLimitStore({ RL_30_PER_60S: binding });

    const outcome = await evaluateRateLimit(store, {
      endpoint: 'complete-level',
      identity: `u-${Math.random()}`,
      now: T0,
    });

    expect(outcome.allowed).toBe(true);
    // Dakikalık kural binding'e gitti; saatlik kural (600/saat) binding ile
    // ifade edilemediği için bellek katmanında kaldı ve bir kez loglandı.
    expect(binding.calls).toBe(1);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('3600000ms'))).toBe(true);
  });
});
