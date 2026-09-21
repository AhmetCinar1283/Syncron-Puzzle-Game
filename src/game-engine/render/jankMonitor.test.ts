/**
 * DOSYA AMACI: Kasma kararının saf parçalarını kilitlemek (Faz 11 §3.1): tek
 * pencerenin kötü sayılması ve art arda iki kötü pencere kuralı. RAF/DOM'a
 * dokunan dedektör gövdesi gerçek cihazda doğrulanır.
 */

import { describe, expect, it } from 'vitest';
import { createBadStreak, isBadWindow, MIN_FRAMES } from './jankMonitor';

const steady = (ms: number, n: number) => new Array<number>(n).fill(ms);

describe('isBadWindow', () => {
    it('60fps akış kötü değil', () => {
        expect(isBadWindow(steady(16.7, 120))).toBe(false);
    });

    it('sürekli 30fps kötü', () => {
        expect(isBadWindow(steady(33.3, 90))).toBe(true);
    });

    it('tek GC sıçraması kötü değil', () => {
        expect(isBadWindow([...steady(16.7, 59), 180])).toBe(false);
    });

    it('iki 100ms+ kare tek sıçrama değildir: yavaş akış sayılır', () => {
        expect(isBadWindow([...steady(120, 2), ...steady(16.7, 28)])).toBe(false); // 2/30 < %20
        expect(isBadWindow(steady(120, 40))).toBe(true);
    });

    it('arka plana alınma (uzun aralık) sayılmaz', () => {
        expect(isBadWindow([...steady(16.7, 60), 5000, 8000])).toBe(false);
        expect(isBadWindow([...steady(5000, 40)])).toBe(false);
    });

    it('yetersiz örnek değerlendirilmez', () => {
        expect(isBadWindow(steady(50, MIN_FRAMES - 1))).toBe(false);
        expect(isBadWindow(steady(50, MIN_FRAMES))).toBe(true);
    });

    it('oran eşiği: %20 kötü, %19 değil', () => {
        expect(isBadWindow([...steady(40, 6), ...steady(16.7, 24)])).toBe(true);  // 6/30
        expect(isBadWindow([...steady(40, 19), ...steady(16.7, 81)])).toBe(false); // 19/100
    });
});

describe('createBadStreak', () => {
    it('art arda iki kötü pencere karar verir', () => {
        const record = createBadStreak();
        expect(record(true)).toBe(false);
        expect(record(true)).toBe(true);
    });

    it('araya giren iyi pencere seriyi sıfırlar', () => {
        const record = createBadStreak();
        expect(record(true)).toBe(false);
        expect(record(false)).toBe(false);
        expect(record(true)).toBe(false);
    });
});
