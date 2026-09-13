/**
 * DOSYA AMACI: Platform → sağlayıcı eşlemesinin yapıldığı TEK yer (kompozisyon
 * kökü). Yeni bir platform eklemek = bir sağlayıcı dosyası + burada bir satır +
 * bir env değeri (bkz. 00-mimari-ilkeler.md §3). Sağlayıcılar dinamik import ile
 * yüklenir; kullanılmayan SDK build'in bundle'ına girmez (ör. web build'i
 * CrazyGames/GameDistribution script enjeksiyon kodunu hiç indirmez).
 */
import type { AdProvider, PlatformId } from './types';

type ProviderLoader = () => Promise<AdProvider>;

const PROVIDER_LOADERS: Record<PlatformId, ProviderLoader> = {
  web: async () => (await import('./providers/noopProvider')).noopProvider,
  electron: async () => (await import('./providers/noopProvider')).noopProvider,
  android: async () => (await import('./providers/admob/admobProvider')).admobProvider,
  crazygames: async () => (await import('./providers/crazygames/crazyGamesProvider')).crazyGamesProvider,
  gamedistribution: async () => (await import('./providers/gamedistribution/gameDistributionProvider')).gameDistributionProvider,
  mock: async () => (await import('./providers/mock/mockProvider')).mockProvider,
};

export function loadProviderFor(platform: PlatformId): Promise<AdProvider> {
  return PROVIDER_LOADERS[platform]();
}
