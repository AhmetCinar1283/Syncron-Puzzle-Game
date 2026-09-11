/**
 * DOSYA AMACI: Platform → sağlayıcı eşlemesinin yapıldığı TEK yer (kompozisyon
 * kökü). Yeni bir platform eklemek = bir sağlayıcı dosyası + burada bir satır +
 * bir env değeri (bkz. 00-mimari-ilkeler.md §3). Sağlayıcılar dinamik import ile
 * yüklenir; kullanılmayan SDK build'in bundle'ına girmez.
 */
import type { AdProvider, PlatformId } from './types';

type ProviderLoader = () => Promise<AdProvider>;

// crazygames/gamedistribution için gerçek SDK sağlayıcıları 02 numaralı görevde
// eklenecek; o güne kadar bu platformlar da noop'a düşer.
const PROVIDER_LOADERS: Record<PlatformId, ProviderLoader> = {
  web: async () => (await import('./providers/noopProvider')).noopProvider,
  electron: async () => (await import('./providers/noopProvider')).noopProvider,
  android: async () => (await import('./providers/noopProvider')).noopProvider,
  crazygames: async () => (await import('./providers/noopProvider')).noopProvider,
  gamedistribution: async () => (await import('./providers/noopProvider')).noopProvider,
  mock: async () => (await import('./providers/mock/mockProvider')).mockProvider,
};

export function loadProviderFor(platform: PlatformId): Promise<AdProvider> {
  return PROVIDER_LOADERS[platform]();
}
