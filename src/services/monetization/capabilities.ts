/**
 * DOSYA AMACI: Her platformun destekledi yetenekleri tanımlar. Uygulamanın geri
 * kalanı `if (platform === 'crazygames')` gibi dallanma yapmaz; yalnızca bu
 * nesnenin alanlarını sorgular (bkz. 00-mimari-ilkeler.md §3).
 */
import type { PlatformId } from './types';
import { CURRENT_PLATFORM } from './platform';

export interface PlatformCapabilities {
  /** Bölüm arası reklam bu platformda gösterilebilir mi. */
  interstitialAds: boolean;
  /** Ödüllü reklam bu platformda gösterilebilir mi. */
  rewardedAds: boolean;
  /** Kalıcı alt banner bu platformda gösterilebilir mi. */
  bannerAds: boolean;
  /** Portfolyo/sosyal medya gibi dış linkler açılabilir mi. */
  externalLinks: boolean;
  /** "Reklamları Kaldır" gibi satın alma akışları gösterilebilir mi. */
  purchases: boolean;
  /** Bağış sayfası gösterilebilir mi. */
  donations: boolean;
  /** Giriş yapma zorunlu tutulabilir mi (portallar misafir oynanışı ister). */
  requireLogin: boolean;
  /** Giriş UI'ı (Google/e-posta ile bağlama, "giriş yap" tetikleyicileri) gösterilebilir mi. Portallar kendi hesap sistemleri dışında dış giriş yasaklar. */
  accountLogin: boolean;
  /** Google Analytics gibi üçüncü parti script'ler yüklenebilir mi. */
  thirdPartyScripts: boolean;
  /** Editör ve admin gibi geliştirici/portal-oyuncusunu ilgilendirmeyen girişler gösterilebilir mi. */
  devTools: boolean;
  /** Uygulama, gerçek URL/route yerine tek statik giriş + bellek içi router ile mi çalışıyor (bkz. src/lib/navigation). */
  inMemoryRouting: boolean;
  /**
   * Günlük Bulmaca girişi gösterilebilir mi (portal izni). Özellik sunucu gerektirir;
   * worker yapılandırılmamış build'de ayrıca gizlenir (bkz. features/daily).
   */
  dailyPuzzle: boolean;
}

const CAPABILITIES: Record<PlatformId, PlatformCapabilities> = {
  web: {
    interstitialAds: false,
    rewardedAds: false,
    bannerAds: false,
    externalLinks: true,
    purchases: true,
    donations: true,
    requireLogin: false,
    accountLogin: true,
    thirdPartyScripts: true,
    devTools: true,
    inMemoryRouting: false,
    dailyPuzzle: true,
  },
  electron: {
    interstitialAds: false,
    rewardedAds: false,
    bannerAds: false,
    externalLinks: true,
    purchases: true,
    donations: true,
    requireLogin: false,
    accountLogin: true,
    thirdPartyScripts: true,
    devTools: true,
    inMemoryRouting: false,
    dailyPuzzle: true,
  },
  // AdMob (Capacitor) — bölüm arası, ödüllü ve kalıcı alt banner destekli.
  android: {
    interstitialAds: true,
    rewardedAds: true,
    bannerAds: true,
    externalLinks: true,
    purchases: false,
    donations: false,
    requireLogin: false,
    accountLogin: true,
    thirdPartyScripts: true,
    devTools: true,
    inMemoryRouting: false,
    dailyPuzzle: true,
  },
  // Portal build'leri: gerçek SDK reklam sağlayıcıları, tek statik giriş + bellek
  // içi router, yalnızca misafir oynanış (bkz. 02-portal-buildleri.md).
  crazygames: {
    interstitialAds: true,
    rewardedAds: true,
    bannerAds: false,
    externalLinks: false,
    purchases: false,
    donations: false,
    requireLogin: false,
    accountLogin: false,
    thirdPartyScripts: false,
    devTools: false,
    inMemoryRouting: true,
    dailyPuzzle: true,
  },
  gamedistribution: {
    interstitialAds: true,
    rewardedAds: true,
    bannerAds: false,
    externalLinks: false,
    purchases: false,
    donations: false,
    requireLogin: false,
    accountLogin: false,
    thirdPartyScripts: false,
    devTools: false,
    inMemoryRouting: true,
    dailyPuzzle: true,
  },
  // Geliştirme sırasında reklam akışını uçtan uca görmek için: web yetenekleri + reklamlar.
  mock: {
    interstitialAds: true,
    rewardedAds: true,
    bannerAds: true,
    externalLinks: true,
    purchases: true,
    donations: true,
    requireLogin: false,
    accountLogin: true,
    thirdPartyScripts: true,
    devTools: true,
    inMemoryRouting: false,
    dailyPuzzle: true,
  },
};

export function getCapabilities(platform: PlatformId = CURRENT_PLATFORM): PlatformCapabilities {
  return CAPABILITIES[platform];
}
