/**
 * DOSYA AMACI: CrazyGames HTML5 SDK v3'ün bu adaptörün kullandığı kısmının
 * minimal tip tanımı. Resmî SDK npm paketi olarak dağıtılmıyor (script
 * enjeksiyonu ile `window.CrazyGames` global'i oluşuyor) — bu yüzden tipler
 * elle tutuluyor. Kaynak: https://docs.crazygames.com/sdk/html5/
 */

export type CrazyGamesEnvironment = 'local' | 'crazygames' | 'disabled';

export interface CrazyGamesAdError {
  code: 'adsDisabledBasicLaunch' | 'unfilled' | 'adblock' | 'adCooldown' | 'other';
  message?: string;
}

export interface CrazyGamesAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: CrazyGamesAdError) => void;
}

export interface CrazyGamesSdk {
  init(): Promise<void>;
  environment: CrazyGamesEnvironment;
  game: {
    loadingStart(): void;
    loadingStop(): void;
    gameplayStart(): void;
    gameplayStop(): void;
    happytime(): void;
  };
  ad: {
    requestAd(adType: 'midgame' | 'rewarded', callbacks: CrazyGamesAdCallbacks): void;
    hasAdblock(): Promise<boolean>;
  };
}

declare global {
  interface Window {
    CrazyGames?: { SDK: CrazyGamesSdk };
  }
}
