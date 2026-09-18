import type { convertToGame2State } from '@/game-engine/logic/converter';

/**
 * `/complete-level` worker yanıtı (docs/scoring.md).
 * Hem play akışı hem WinResultOverlay aynı tipi kullanır (önceden iki dosyada
 * ayrı ayrı tanımlıydı; overlay'deki kopya `xpDelta` hariç birebir aynıydı).
 */
export interface WorkerResult {
    success: boolean;
    stars?: 1 | 2 | 3;
    scoreDelta?: number;
    xpDelta?: number;
    isFirstCompletion?: boolean;
    isNewBestSolution?: boolean;
    isBestSolution?: boolean;
    isGoodSolution?: boolean;
    /** Bu tamamlamada ipucu kullanıldı (sunucu: yıldız ≤2, rekorlara sayılmaz). */
    hintUsed?: boolean;
    /**
     * `success:false` iken UI'nin hangi mesajı göstereceğini ayırt eder.
     * `offline`: sunucuya hiç ulaşılamadı (skor asla yerelde hesaplanmaz —
     * bkz. 02-portal-buildleri.md §5). `error`: sunucuya ulaşıldı ama
     * doğrulama/başka bir sebeple reddetti. `rate_limited`: sunucu hız limiti
     * (429) — geçicidir, oyuncu birazdan tekrar deneyebilir (03 §3.4).
     */
    reason?: 'offline' | 'error' | 'rate_limited';
}

/**
 * Converter çıktısı. Önceden `any` idi; converter imzasından türetmek,
 * converter değişirse bu tipin kendiliğinden güncellenmesini sağlar.
 */
export type Game2State = ReturnType<typeof convertToGame2State>;

/** Aktif telemetri oturumu (bellekte, `sessionRef`). */
export interface LevelSession {
    id: string;
    startTime: number;
    restarts: number;
    deaths: number;
    /** Bu oturumda gösterilen ipucu sayısı. */
    hintsUsed: number;
    levelId: string | null;
    version: number;
}

export type FeedbackDifficulty = 'easy' | 'normal' | 'hard';
