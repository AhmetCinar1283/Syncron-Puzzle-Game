/**
 * DOSYA AMACI: Yayın kimliği kapısının karar mantığının birim testleri.
 * Görev §3.1'in şartı: "eksik kimlik → hata, test kimliği → hata, gerçek
 * kimlik → geçer" üçlüsü gerçek bir build almadan kanıtlanır.
 */
import { describe, expect, it } from 'vitest';
import { evaluateReleaseConfig } from './evaluateReleaseConfig.mjs';
import { COMMON_RULES } from './releaseConfigRules.mjs';
import { ADMOB_TEST_PUBLISHER_PREFIX, GD_TEST_GAME_ID } from './placeholderIdentities.mjs';

/** Gerçek görünümlü (ama uydurma) ortak env — hiçbiri placeholder desenine uymaz. */
const realCommonEnv: Record<string, string> = {
  NEXT_PUBLIC_WORKER_URL: 'https://syncron-worker.ahmetemre.workers.dev',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyD-REAL-LOOKING-KEY-0123456789',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'syncron-prod.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'syncron-prod',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'syncron-prod.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '904455112233',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:904455112233:web:aa11bb22cc33dd44',
};

const realAndroidEnv: Record<string, string> = {
  ...realCommonEnv,
  NEXT_PUBLIC_ADMOB_BANNER_ID: 'ca-app-pub-7788990011223344/1111111111',
  NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID: 'ca-app-pub-7788990011223344/2222222222',
  NEXT_PUBLIC_ADMOB_REWARDED_ID: 'ca-app-pub-7788990011223344/3333333333',
  NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID: '904455112233-abcdef.apps.googleusercontent.com',
};

const realAndroidProps: Record<string, string> = {
  'sdk.dir': 'C:\\Users\\dev\\AppData\\Local\\Android\\Sdk',
  admobAppId: 'ca-app-pub-7788990011223344~4444444444',
};

function keysOf(report: ReturnType<typeof evaluateReleaseConfig>) {
  return report.issues.map((i) => i.key);
}

describe('evaluateReleaseConfig — gerçek kimlikler', () => {
  it('android: tüm gerçek kimlikler verilince geçer', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: realAndroidEnv,
      androidLocalProperties: realAndroidProps,
    });
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('gamedistribution: gerçek game ID ile geçer', () => {
    const report = evaluateReleaseConfig({
      platform: 'gamedistribution',
      env: { ...realCommonEnv, NEXT_PUBLIC_GD_GAME_ID: 'b9f3a1c2-44de-4f7a-9a11-2c0d5e6f7a8b' },
    });
    expect(report.ok).toBe(true);
  });

  it('crazygames: ayrı kimlik istemez, ortak kimlikler yeterlidir', () => {
    const report = evaluateReleaseConfig({ platform: 'crazygames', env: realCommonEnv });
    expect(report.ok).toBe(true);
    expect(report.checkedKeys).toEqual(COMMON_RULES.map((r: { key: string }) => r.key));
  });
});

describe('evaluateReleaseConfig — eksik kimlik', () => {
  it('hiç env verilmezse tüm zorunlu ortak kimlikler eksik raporlanır', () => {
    const report = evaluateReleaseConfig({ platform: 'web' });
    expect(report.ok).toBe(false);
    expect(report.issues).toHaveLength(COMMON_RULES.length);
    expect(report.issues.every((i) => i.kind === 'missing')).toBe(true);
  });

  it('gamedistribution: NEXT_PUBLIC_GD_GAME_ID eksikse durur', () => {
    const report = evaluateReleaseConfig({ platform: 'gamedistribution', env: realCommonEnv });
    expect(report.ok).toBe(false);
    expect(keysOf(report)).toContain('NEXT_PUBLIC_GD_GAME_ID');
    expect(report.issues[0].kind).toBe('missing');
  });

  it('boş/whitespace değer "tanımlı" sayılmaz', () => {
    const report = evaluateReleaseConfig({
      platform: 'gamedistribution',
      env: { ...realCommonEnv, NEXT_PUBLIC_GD_GAME_ID: '   ' },
    });
    expect(keysOf(report)).toContain('NEXT_PUBLIC_GD_GAME_ID');
  });

  it('android: local.properties dosyası hiç yoksa admobAppId eksik raporlanır', () => {
    const report = evaluateReleaseConfig({ platform: 'android', env: realAndroidEnv });
    expect(report.ok).toBe(false);
    expect(keysOf(report)).toEqual(['admobAppId']);
  });

  it('android: Google web client ID eksikse durur (release giriş sessizce kırılır)', () => {
    const env = { ...realAndroidEnv };
    delete env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const report = evaluateReleaseConfig({
      platform: 'android',
      env,
      androidLocalProperties: realAndroidProps,
    });
    expect(keysOf(report)).toContain('NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  });
});

describe('evaluateReleaseConfig — test/placeholder kimliği', () => {
  it('android: Google TEST reklam birimi kimliği reddedilir', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: { ...realAndroidEnv, NEXT_PUBLIC_ADMOB_REWARDED_ID: `${ADMOB_TEST_PUBLISHER_PREFIX}/5224354917` },
      androidLocalProperties: realAndroidProps,
    });
    expect(report.ok).toBe(false);
    expect(report.issues[0]).toMatchObject({
      key: 'NEXT_PUBLIC_ADMOB_REWARDED_ID',
      kind: 'placeholder',
    });
  });

  it('android: local.properties içindeki TEST App ID reddedilir', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: realAndroidEnv,
      androidLocalProperties: {
        ...realAndroidProps,
        admobAppId: `${ADMOB_TEST_PUBLISHER_PREFIX}~3347511713`,
      },
    });
    expect(report.issues[0]).toMatchObject({ key: 'admobAppId', kind: 'placeholder' });
    expect(report.issues[0].source).toBe('androidLocalProperties');
  });

  it('gamedistribution: SDK test game ID reddedilir', () => {
    const report = evaluateReleaseConfig({
      platform: 'gamedistribution',
      env: { ...realCommonEnv, NEXT_PUBLIC_GD_GAME_ID: GD_TEST_GAME_ID },
    });
    expect(report.issues[0].kind).toBe('placeholder');
  });

  it('firebase config.ts mock fallback değerleri reddedilir', () => {
    const report = evaluateReleaseConfig({
      platform: 'web',
      env: { ...realCommonEnv, NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'mock-project-id' },
    });
    expect(report.issues[0]).toMatchObject({
      key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      kind: 'placeholder',
    });
  });

  it('doldurulmamış şablon (XXXX) reddedilir', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: { ...realAndroidEnv, NEXT_PUBLIC_ADMOB_BANNER_ID: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' },
      androidLocalProperties: realAndroidProps,
    });
    expect(report.issues[0].kind).toBe('placeholder');
  });

  it('localhost worker adresi yayında reddedilir', () => {
    const report = evaluateReleaseConfig({
      platform: 'crazygames',
      env: { ...realCommonEnv, NEXT_PUBLIC_WORKER_URL: 'http://localhost:8787' },
    });
    expect(report.issues[0]).toMatchObject({ key: 'NEXT_PUBLIC_WORKER_URL', kind: 'placeholder' });
  });
});

describe('evaluateReleaseConfig — NEXT_PUBLIC_ADMOB_USE_TEST_ADS', () => {
  it('true ise gerçek kimlikler tanımlı olsa bile durdurur', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: { ...realAndroidEnv, NEXT_PUBLIC_ADMOB_USE_TEST_ADS: 'true' },
      androidLocalProperties: realAndroidProps,
    });
    expect(report.ok).toBe(false);
    expect(report.issues[0]).toMatchObject({
      key: 'NEXT_PUBLIC_ADMOB_USE_TEST_ADS',
      kind: 'forbidden',
    });
  });

  it('false ise engellemez (çalışma zamanı da yalnızca "true"yu zorlama sayar)', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: { ...realAndroidEnv, NEXT_PUBLIC_ADMOB_USE_TEST_ADS: 'false' },
      androidLocalProperties: realAndroidProps,
    });
    expect(report.ok).toBe(true);
  });

  it('büyük harfli TRUE de yakalanır', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: { ...realAndroidEnv, NEXT_PUBLIC_ADMOB_USE_TEST_ADS: 'TRUE' },
      androidLocalProperties: realAndroidProps,
    });
    expect(report.ok).toBe(false);
  });
});

describe('evaluateReleaseConfig — alternatif kaynaklar (build.gradle çözüm sırası)', () => {
  it('admobAppId, local.properties yerine ADMOB_APP_ID env\'inden karşılanabilir', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: { ...realAndroidEnv, ADMOB_APP_ID: 'ca-app-pub-7788990011223344~4444444444' },
      androidLocalProperties: { 'sdk.dir': 'C:\\Sdk' },
    });
    expect(report.ok).toBe(true);
  });

  it('alternatif kaynaktaki TEST App ID de reddedilir', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: { ...realAndroidEnv, ADMOB_APP_ID: `${ADMOB_TEST_PUBLISHER_PREFIX}~3347511713` },
      androidLocalProperties: { 'sdk.dir': 'C:\\Sdk' },
    });
    expect(report.issues[0]).toMatchObject({ key: 'ADMOB_APP_ID', kind: 'placeholder' });
    expect(report.issues[0].source).toBe('env');
  });

  it('birincil kaynak doluysa alternatif okunmaz (öncelik sırası korunur)', () => {
    const report = evaluateReleaseConfig({
      platform: 'android',
      env: { ...realAndroidEnv, ADMOB_APP_ID: `${ADMOB_TEST_PUBLISHER_PREFIX}~3347511713` },
      androidLocalProperties: realAndroidProps,
    });
    // local.properties gerçek değeri taşıyor; kapı ona bakar ve geçer.
    expect(report.ok).toBe(true);
  });

  it('hiçbir kaynak dolu değilse hata BİRİNCİL kaynağı gösterir', () => {
    const report = evaluateReleaseConfig({ platform: 'android', env: realAndroidEnv });
    expect(report.issues[0]).toMatchObject({
      key: 'admobAppId',
      source: 'androidLocalProperties',
    });
  });
});
