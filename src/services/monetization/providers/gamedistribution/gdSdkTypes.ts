/**
 * DOSYA AMACI: GameDistribution HTML5 SDK'nın bu adaptörün kullandığı kısmının
 * minimal tip tanımı. Script enjeksiyonu ile `window.gdsdk` global'i oluşur.
 * Kaynak: https://github.com/GameDistribution/GD-HTML5/wiki
 */

export type GdEventName =
  | 'SDK_READY'
  | 'SDK_ERROR'
  | 'SDK_GAME_PAUSE'
  | 'SDK_GAME_START'
  | 'SDK_REWARDED_WATCH_COMPLETE';

export interface GdEvent {
  name: GdEventName;
  message?: string;
}

export interface GdOptions {
  gameId: string;
  onEvent: (event: GdEvent) => void;
}

export interface GdSdk {
  showAd(type?: 'rewarded'): Promise<void>;
  preloadAd(type?: 'rewarded'): Promise<void>;
}

declare global {
  interface Window {
    GD_OPTIONS?: GdOptions;
    gdsdk?: GdSdk;
  }
}
