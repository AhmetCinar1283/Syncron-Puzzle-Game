/**
 * DOSYA AMACI: Profiler'ın saf parçalarını kilitlemek — bayrağın bir kez okunup
 * saklanması, avg/p95/sayı hesabı, halka tamponun sınırı ve saniyedeki çizim sayısı.
 *
 * Bayrak `localStorage` üzerinden okunur; test ortamı `node`, bu yüzden
 * `localStorage` ve `window` sahte kurulur (bkz. spriteCache.test.ts'teki gerekçe).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    PROFILER_KEY,
    drawsPerSecond,
    frameStats,
    isProfilerEnabled,
    recordFrame,
    resetProfiler,
    resetProfilerFlag,
} from './profiler';

const g = globalThis as { window?: unknown; localStorage?: unknown };
let saved: { window: unknown; localStorage: unknown };
let store: Record<string, string>;

function installStorage(value: string | null) {
    store = value === null ? {} : { [`anon:${PROFILER_KEY}`]: value };
    g.window = {};
    g.localStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
    };
}

beforeEach(() => {
    saved = { window: g.window, localStorage: g.localStorage };
    resetProfiler();
    resetProfilerFlag();
});

afterEach(() => {
    g.window = saved.window;
    g.localStorage = saved.localStorage;
});

describe('isProfilerEnabled', () => {
    it("boardProfiler='1' iken açık, aksi hâlde kapalı", () => {
        installStorage('1');
        expect(isProfilerEnabled()).toBe(true);
        resetProfilerFlag();
        installStorage(null);
        expect(isProfilerEnabled()).toBe(false);
    });

    it('bayrak BİR KEZ okunur: sonradan değişen depolama yok sayılır', () => {
        installStorage(null);
        expect(isProfilerEnabled()).toBe(false);
        store[`anon:${PROFILER_KEY}`] = '1';
        expect(isProfilerEnabled()).toBe(false);
    });

    it('window yokken (SSR) false döner ve sonucu ÖNBELLEĞE ALMAZ', () => {
        delete g.window;
        expect(isProfilerEnabled()).toBe(false);
        installStorage('1');
        expect(isProfilerEnabled()).toBe(true);
    });
});

describe('frameStats', () => {
    it('örnek yokken sıfır döner', () => {
        expect(frameStats().map(s => s.count)).toEqual([0, 0, 0]);
    });

    it('avg ve p95 (en yakın sıra) doğru hesaplanır', () => {
        for (let i = 1; i <= 100; i++) recordFrame('actors', i);
        const actors = frameStats().find(s => s.layer === 'actors')!;
        expect(actors.count).toBe(100);
        expect(actors.avg).toBeCloseTo(50.5, 5);
        expect(actors.p95).toBe(95);
    });

    it('katmanlar birbirinden bağımsız', () => {
        recordFrame('static', 4);
        expect(frameStats().find(s => s.layer === 'static')!.count).toBe(1);
        expect(frameStats().find(s => s.layer === 'ambient')!.count).toBe(0);
    });

    it('halka tampon 120 örnekle sınırlı; eskiler düşer', () => {
        for (let i = 0; i < 200; i++) recordFrame('static', i < 80 ? 1000 : 1);
        const s = frameStats().find(s => s.layer === 'static')!;
        expect(s.count).toBe(120);
        expect(s.avg).toBe(1);
    });
});

describe('drawsPerSecond', () => {
    it('yalnızca son bir saniyede biten çizimleri sayar', () => {
        recordFrame('actors', 1, 100);
        recordFrame('actors', 1, 900);
        recordFrame('actors', 1, 1500);
        expect(drawsPerSecond(1600).actors).toBe(2);   // 900 ve 1500 (100 → 1500 ms önce)
        expect(drawsPerSecond(1600).static).toBe(0);
    });
});
