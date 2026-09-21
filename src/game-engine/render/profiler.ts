/**
 * DOSYA AMACI: Ölçüm kancası — katman başına kare süresi (ortalama, p95),
 * saniyedeki çizim sayısı. Proje sahibi canvas yolunun maliyetini gerçek
 * cihazda bu araçla ölçer (faz planı §2.6).
 *
 * KAPALIYKEN SIFIR MALİYET: bayrak (`userStorage` → `boardProfiler = '1'`)
 * modül yüklenince BİR KEZ okunur ve saklanır. Çağıranlar `isProfilerEnabled()`
 * false iken `performance.now()`'u HİÇ çağırmaz; ölçümün kendisi ölçtüğü şeyi
 * bozmasın. `recordFrame` yalnızca açıkken çağrılır.
 *
 * Bayrağı açmak için tarayıcı konsolundan (sonra sayfayı yenile):
 *
 *   localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardProfiler`, '1'); location.reload();
 */

import { userStorageGet } from '@/lib/userStorage';
import type { LayerName } from './types';

/** Açma bayrağının `userStorage` anahtarı. */
export const PROFILER_KEY = 'boardProfiler';

/** Katman başına tutulan son örnek sayısı (halka tampon). */
const WINDOW = 120;

const LAYERS: LayerName[] = ['static', 'ambient', 'actors'];

let enabled: boolean | null = null;

/** Bir kez okunur; SSR'da (window yok) önbelleğe ALINMAZ, istemcide yeniden okunur. */
export function isProfilerEnabled(): boolean {
    if (enabled !== null) return enabled;
    if (typeof window === 'undefined') return false;
    enabled = userStorageGet(PROFILER_KEY) === '1';
    return enabled;
}

interface Ring {
    ms: number[];
    at: number[];
    next: number;
    filled: number;
    total: number;
}

const rings: Record<LayerName, Ring> = {
    static: emptyRing(),
    ambient: emptyRing(),
    actors: emptyRing(),
};

function emptyRing(): Ring {
    return { ms: new Array<number>(WINDOW).fill(0), at: new Array<number>(WINDOW).fill(0), next: 0, filled: 0, total: 0 };
}

/**
 * Bir katmanın çizim süresini kaydeder. `at`, çizimin bittiği
 * `performance.now()` damgası (saniyedeki çizim sayısı için).
 */
export function recordFrame(layer: LayerName, ms: number, at: number = 0): void {
    const ring = rings[layer];
    ring.ms[ring.next] = ms;
    ring.at[ring.next] = at;
    ring.next = (ring.next + 1) % WINDOW;
    ring.filled = Math.min(WINDOW, ring.filled + 1);
    ring.total++;
}

/** `count` = pencerede tutulan örnek sayısı; `p95` en yakın sıra yöntemiyle. */
export function frameStats(): { layer: LayerName; avg: number; p95: number; count: number }[] {
    return LAYERS.map(layer => {
        const { ms, filled } = rings[layer];
        if (filled === 0) return { layer, avg: 0, p95: 0, count: 0 };
        const sample = ms.slice(0, filled).sort((a, b) => a - b);
        const avg = sample.reduce((sum, v) => sum + v, 0) / filled;
        const p95 = sample[Math.min(filled - 1, Math.ceil(filled * 0.95) - 1)];
        return { layer, avg, p95, count: filled };
    });
}

/** Son bir saniyede biten çizim sayısı (katman başına). */
export function drawsPerSecond(now: number): Record<LayerName, number> {
    const out = { static: 0, ambient: 0, actors: 0 } as Record<LayerName, number>;
    for (const layer of LAYERS) {
        const { at, filled } = rings[layer];
        let n = 0;
        for (let i = 0; i < filled; i++) if (now - at[i] <= 1000) n++;
        out[layer] = n;
    }
    return out;
}

/** Testler ve yeni tahta için. */
export function resetProfiler(): void {
    for (const layer of LAYERS) rings[layer] = emptyRing();
}

/** Yalnızca testler: bayrağı okumayı yeniden dener. */
export function resetProfilerFlag(): void {
    enabled = null;
}
