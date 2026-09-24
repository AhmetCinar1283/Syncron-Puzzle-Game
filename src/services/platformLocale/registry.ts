/**
 * DOSYA AMACI: Platform → dil kaynağı eşlemesinin yapıldığı TEK yer
 * (`monetization/providerRegistry.ts` ile aynı kalıp). Yeni platformun SDK'sı dil
 * veriyorsa: bir kaynak dosyası + burada bir satır. Burada olmayan platform
 * (web, android, electron, gamedistribution, mock) kaynaksız sayılır ve "en"e düşer.
 * Kaynaklar dinamik import edilir; kullanılmayan SDK kodu build'e girmez.
 */
import type { PlatformId } from '../monetization/types';
import type { PlatformLocaleSource } from './types';

type SourceLoader = () => Promise<PlatformLocaleSource>;

const LOCALE_SOURCE_LOADERS: Partial<Record<PlatformId, SourceLoader>> = {
  crazygames: async () => (await import('./sources/crazyGamesLocale')).crazyGamesLocaleSource,
};

export function loadLocaleSourceFor(platform: PlatformId): Promise<PlatformLocaleSource> | null {
  return LOCALE_SOURCE_LOADERS[platform]?.() ?? null;
}
