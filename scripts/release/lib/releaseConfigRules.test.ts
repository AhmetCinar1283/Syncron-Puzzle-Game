/**
 * DOSYA AMACI: Kural TABLOSUNUN kendi bütünlüğünü sınar — platform listesinin
 * `services/monetization/platform.ts` ile aynı kalması, her platformun ortak
 * kuralları devralması ve her kuralın çözüm ipucu taşıması.
 * Karar mantığının davranış testleri `evaluateReleaseConfig.test.ts`'tedir.
 */
import { describe, expect, it } from 'vitest';
import { evaluateReleaseConfig } from './evaluateReleaseConfig.mjs';
import { COMMON_RULES, KNOWN_RELEASE_PLATFORMS, PLATFORM_RULES } from './releaseConfigRules.mjs';

/** Ortak kuralların hepsini karşılayan, gerçek görünümlü (uydurma) env. */
const satisfiedCommonEnv: Record<string, string> = {
  NEXT_PUBLIC_WORKER_URL: 'https://syncron-worker.ahmetemre.workers.dev',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyD-REAL-LOOKING-KEY-0123456789',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'syncron-prod.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'syncron-prod',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'syncron-prod.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '904455112233',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:904455112233:web:aa11bb22cc33dd44',
};

describe('evaluateReleaseConfig — kural tablosu bütünlüğü', () => {
  it('bilinmeyen platform sessizce geçmez', () => {
    // Tüm ortak kimlikler DOLU olmasına rağmen geçmemeli: platform adı yanlışsa
    // hiçbir platform-özel kural çalışmaz ve kapı boşa döner.
    const report = evaluateReleaseConfig({ platform: 'nintendo', env: satisfiedCommonEnv });
    expect(report.ok).toBe(false);
    expect(report.issues[0].key).toBe('platform');
  });

  it('platform adı boşsa da geçmez', () => {
    const report = evaluateReleaseConfig({ platform: '', env: satisfiedCommonEnv });
    expect(report.ok).toBe(false);
  });

  it('monetization platform listesindeki her platformun kural girdisi vardır', () => {
    // src/services/monetization/platform.ts ile aynı liste; biri değişirse bu düşer.
    const monetizationPlatforms = ['web', 'android', 'electron', 'crazygames', 'gamedistribution', 'mock'];
    expect([...KNOWN_RELEASE_PLATFORMS].sort()).toEqual([...monetizationPlatforms].sort());
  });

  it('her platformun kuralları ortak kuralları da içerir', () => {
    for (const platform of KNOWN_RELEASE_PLATFORMS) {
      const report = evaluateReleaseConfig({ platform, env: {} });
      for (const common of COMMON_RULES as { key: string }[]) {
        expect(report.checkedKeys).toContain(common.key);
      }
    }
  });

  it('her kuralın bir ipucu metni vardır (hata mesajı çıkmaz sokak olmaz)', () => {
    const all = [...(COMMON_RULES as { hint: string }[])];
    for (const platform of KNOWN_RELEASE_PLATFORMS) {
      all.push(...(PLATFORM_RULES[platform as keyof typeof PLATFORM_RULES] as { hint: string }[]));
    }
    for (const rule of all) {
      expect(rule.hint.length).toBeGreaterThan(10);
    }
  });
});
