/**
 * DOSYA AMACI: Kirli bayrağı üzerinden çalışan, değişen yoksa TAMAMEN duran
 * kare zamanlayıcısı.
 *
 * NEDEN: Bugünkü DOM yolunda tahtadaki süsler oyuncu hiç kıpırdamasa bile sonsuz
 * animasyon çalıştırıyor; ısınma ve şarj tüketiminin kaynağı bu. Burada hiçbir
 * katman kirli değilse `requestAnimationFrame` PLANLANMAZ — döngü ölür ve ilk
 * `invalidate` çağrısıyla dirilir (00-ilkeler §2.2).
 *
 * Bu dosya DOM'a bağlı değildir: `raf`/`caf` enjekte edilebilir, böylece boşta
 * durma davranışı testle kanıtlanabilir.
 */

import type { LayerName } from './types';

const ALL_LAYERS: LayerName[] = ['static', 'ambient', 'actors'];

export interface Scheduler {
    /** Katmanı kirletir ve gerekiyorsa döngüyü uyandırır. */
    invalidate(layer: LayerName): void;
    /** Döngüyü durdurur ve bekleyen RAF'ı iptal eder. */
    stop(): void;
}

export interface SchedulerOptions {
    draw: (layer: LayerName, now: number) => void;
    /** Ambient katmanının en fazla kaç kez/saniye çizileceği. Varsayılan 20. */
    ambientHz?: number;
    raf?: (cb: FrameRequestCallback) => number;   // test için enjekte edilebilir
    caf?: (id: number) => void;
}

export function createScheduler(opts: SchedulerOptions): Scheduler {
    const { draw } = opts;
    const ambientHz = opts.ambientHz ?? 20;
    const ambientMinGap = 1000 / ambientHz;
    const raf = opts.raf ?? ((cb: FrameRequestCallback) => requestAnimationFrame(cb));
    const caf = opts.caf ?? ((id: number) => cancelAnimationFrame(id));

    const dirty: Record<LayerName, boolean> = { static: false, ambient: false, actors: false };
    let rafId = 0;
    let stopped = false;
    let ambientLastDrawn = -Infinity;

    const hasDirty = () => dirty.static || dirty.ambient || dirty.actors;

    function schedule(): void {
        if (stopped || rafId !== 0) return;
        rafId = raf(frame);
    }

    function frame(now: number): void {
        // rafId'yi ÖNCE sıfırla: `draw` içinden gelen `invalidate` çağrıları
        // (ör. ambient kendini bir sonraki kare için yeniden kirletir) yeni bir
        // kare planlayabilsin.
        rafId = 0;
        if (stopped) return;

        for (const layer of ALL_LAYERS) {
            if (!dirty[layer]) continue;

            if (layer === 'ambient' && now - ambientLastDrawn < ambientMinGap) {
                // Kısma: bu kareyi atla ama bayrağı KİRLİ BIRAK; aşağıdaki
                // `hasDirty` döngüyü uyanık tutar, süs bir sonraki karede çizilir.
                continue;
            }

            dirty[layer] = false;
            if (layer === 'ambient') ambientLastDrawn = now;
            draw(layer, now);
        }

        if (hasDirty()) schedule();
    }

    return {
        invalidate(layer: LayerName): void {
            if (stopped) return;
            dirty[layer] = true;
            schedule();
        },
        stop(): void {
            stopped = true;
            if (rafId !== 0) {
                caf(rafId);
                rafId = 0;
            }
            dirty.static = false;
            dirty.ambient = false;
            dirty.actors = false;
        },
    };
}
