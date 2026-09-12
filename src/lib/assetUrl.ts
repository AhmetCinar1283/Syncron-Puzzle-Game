/**
 * DOSYA AMACI: `public/`'ten servis edilen bir asset'in (ses, ikon) doğru
 * yoldan yüklenmesini sağlar. Web/Android/Electron kökten sunulur, bu yüzden
 * mutlak `/sounds/x.mp3` çalışır. Portal build'leri (CrazyGames/GameDistribution)
 * ise bilinmeyen bir alt dizinden ve TEK sabit URL'den (bellek içi router — URL
 * hiç değişmez) sunulur; orada göreli yol kullanılmalı. Karar
 * `inMemoryRouting` yeteneğine göre build zamanında sabitlenir (bkz.
 * 00-mimari-ilkeler.md §3).
 */
import { CURRENT_PLATFORM, getCapabilities } from '@/services/monetization';


const USE_RELATIVE_ASSETS = getCapabilities(CURRENT_PLATFORM).inMemoryRouting;

/** `'/sounds/move.mp3'` → portal'da `'sounds/move.mp3'`, diğer platformlarda değişmeden. */
export function assetUrl(absolutePath: string): string {
  if (!USE_RELATIVE_ASSETS) return absolutePath;
  return absolutePath.startsWith('/') ? absolutePath.slice(1) : absolutePath;
}
