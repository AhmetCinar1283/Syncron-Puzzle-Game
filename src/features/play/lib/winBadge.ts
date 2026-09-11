import type { WorkerResult } from './types';

export interface WinBadgeInfo {
    text: string;
    color: string;
    bg: string;
    border: string;
}

/** Çözüm rozeti (yeni rekor > rekor > iyi çözüm). Sonuç yoksa/hiçbiri değilse null. */
export function getWinBadgeInfo(result: WorkerResult | null, t: (key: string) => string): WinBadgeInfo | null {
    if (!result) return null;
    if (result.isNewBestSolution) {
        return {
            text: t('win.new_record'),
            color: '#00ff88',
            bg: 'rgba(0, 255, 136, 0.12)',
            border: 'rgba(0, 255, 136, 0.35)',
        };
    }
    if (result.isBestSolution) {
        return {
            text: t('win.record'),
            color: '#00c4ff',
            bg: 'rgba(0, 196, 255, 0.12)',
            border: 'rgba(0, 196, 255, 0.35)',
        };
    }
    if (result.isGoodSolution) {
        return {
            text: t('win.good_solution'),
            color: '#c084fc',
            bg: 'rgba(147, 51, 234, 0.12)',
            border: 'rgba(147, 51, 234, 0.35)',
        };
    }
    return null;
}
