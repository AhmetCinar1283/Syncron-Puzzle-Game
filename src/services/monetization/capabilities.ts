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
  /** Portfolyo/sosyal medya gibi dış linkler açılabilir mi. */
  externalLinks: boolean;
  /** "Reklamları Kaldır" gibi satın alma akışları gösterilebilir mi. */
  purchases: boolean;
  /** Bağış sayfası gösterilebilir mi. */
  donations: boolean;
  /** Giriş yapma zorunlu tutulabilir mi (portallar misafir oynanışı ister). */
  requireLogin: boolean;
  /** Kampanya levelleri build'e JSON olarak gömülü mü (sunucu erişimi olmadan oynanabilir). */
  bundledLevels: boolean;
}

const CAPABILITIES: Record<PlatformId, PlatformCapabilities> = {
  web: {
    interstitialAds: false,
    rewardedAds: false,
    externalLinks: true,
    purchases: true,
    donations: true,
    requireLogin: false,
    bundledLevels: false,
  },
  electron: {
    interstitialAds: false,
    rewardedAds: false,
    externalLinks: true,
    purchases: true,
    donations: true,
    requireLogin: false,
    bundledLevels: false,
  },
  // Görev 03'te AdMob sağlayıcısı bağlanınca true'ya çekilecek.
  android: {
    interstitialAds: false,
    rewardedAds: false,
    externalLinks: true,
    purchases: false,
    donations: false,
    requireLogin: false,
    bundledLevels: false,
  },
  // Görev 02'de gerçek SDK sağlayıcıları bağlanınca reklam kanalları açılacak.
  crazygames: {
    interstitialAds: true,
    rewardedAds: true,
    externalLinks: false,
    purchases: false,
    donations: false,
    requireLogin: false,
    bundledLevels: true,
  },
  gamedistribution: {
    interstitialAds: true,
    rewardedAds: true,
    externalLinks: false,
    purchases: false,
    donations: false,
    requireLogin: false,
    bundledLevels: true,
  },
  // Geliştirme sırasında reklam akışını uçtan uca görmek için: web yetenekleri + reklamlar.
  mock: {
    interstitialAds: true,
    rewardedAds: true,
    externalLinks: true,
    purchases: true,
    donations: true,
    requireLogin: false,
    bundledLevels: false,
  },
};

export function getCapabilities(platform: PlatformId = CURRENT_PLATFORM): PlatformCapabilities {
  return CAPABILITIES[platform];
}
