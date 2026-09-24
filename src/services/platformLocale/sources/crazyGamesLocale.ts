/**
 * DOSYA AMACI: CrazyGames SDK'sının `user.systemInfo.locale` değerini okuyan
 * dil kaynağı. SDK yüklemesi reklam sağlayıcısıyla aynı promise'i paylaşır
 * (`loadCrazyGamesSdk` idempotent), ikinci bir script enjeksiyonu olmaz.
 */
import type { PlatformLocaleSource } from '../types';
import { loadCrazyGamesSdk } from '../../monetization/providers/crazygames/loadCrazyGamesSdk';

export const crazyGamesLocaleSource: PlatformLocaleSource = {
  async getLocale() {
    const sdk = await loadCrazyGamesSdk();
    return sdk.user?.systemInfo?.locale ?? null;
  },
};
