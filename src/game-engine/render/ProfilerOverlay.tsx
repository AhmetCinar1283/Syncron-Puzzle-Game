/**
 * DOSYA AMACI: Profiler açıkken tahtanın köşesinde küçük bir DOM katmanı:
 * katman başına ortalama/p95 kare süresi, saniyedeki çizim sayısı,
 * `cache.size()`, yaklaşık sprite belleği ve üç tuvalin belleği
 * (faz planı §2.6, Faz 08 §2.5b). Eşik ikisinin TOPLAMI için okunur.
 *
 * YALNIZCA `isProfilerEnabled()` true iken bağlanır (`BoardCanvas` karar verir);
 * kapalıyken bu bileşen hiç oluşmaz, zamanlayıcısı ve `performance.now()`ı yok.
 * Yarım saniyede bir yenilenir — kendi maliyeti ölçümü bozmasın diye.
 */

'use client';

import { useEffect, useState } from 'react';
import type { SpriteCache } from './spriteCache';
import { surfaceBytes, type Surfaces } from './surface';
import { drawsPerSecond, frameStats } from './profiler';

const REFRESH_MS = 500;

const MB = 1024 * 1024;

interface Readout {
    rows: { layer: string; avg: number; p95: number; count: number; perSecond: number }[];
    sprites: number;
    spriteMb: number;
    canvasMb: number;
    canvasSide: string;
    /** Kaç tuval kuruldu (`lite` kademede `ambient` yok → 2). */
    canvasCount: number;
}

function read(cache: SpriteCache | null, surfaces: Surfaces | null): Readout {
    const perSecond = drawsPerSecond(performance.now());
    // En büyük tuval `actors` (kademenin payı); katman başına pay farklı.
    const layer = surfaces?.layers.actors?.canvas;
    return {
        rows: frameStats().map(s => ({ ...s, perSecond: perSecond[s.layer] })),
        sprites: cache?.size() ?? 0,
        spriteMb: (cache?.bytes() ?? 0) / MB,
        canvasMb: (surfaces ? surfaceBytes(surfaces) : 0) / MB,
        canvasSide: layer ? `${layer.width}x${layer.height}` : '-',
        canvasCount: surfaces?.names.length ?? 0,
    };
}

interface ProfilerOverlayProps {
    /** Önbellek DPR değişince yeniden kurulur; bu yüzden ref değil okuyucu. */
    getCache: () => SpriteCache | null;
    /** Tuvaller yeniden boyutlandıkça ölçü değişir; aynı sebeple okuyucu. */
    getSurfaces: () => Surfaces | null;
}

export function ProfilerOverlay({ getCache, getSurfaces }: ProfilerOverlayProps) {
    const [readout, setReadout] = useState<Readout>(() => read(null, null));

    useEffect(() => {
        const id = setInterval(() => setReadout(read(getCache(), getSurfaces())), REFRESH_MS);
        return () => clearInterval(id);
    }, [getCache, getSurfaces]);

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1000,
                padding: '4px 6px',
                font: '600 11px/1.35 ui-monospace, monospace',
                color: '#a7f3d0',
                background: 'rgba(2, 6, 23, 0.82)',
                borderRadius: 4,
                pointerEvents: 'none',
                whiteSpace: 'pre',
            }}
        >
            {readout.rows.map(r => (
                `${r.layer.padEnd(7)} avg ${r.avg.toFixed(2)}ms  p95 ${r.p95.toFixed(2)}ms  ${String(r.perSecond).padStart(3)}/s  n=${r.count}`
            )).join('\n')}
            {`\nsprite ${readout.sprites}  ~${readout.spriteMb.toFixed(2)} MB`}
            {`\ntuval  ${readout.canvasCount}x${readout.canvasSide}  ~${readout.canvasMb.toFixed(2)} MB`}
            {`\ntoplam ~${(readout.spriteMb + readout.canvasMb).toFixed(2)} MB`}
        </div>
    );
}
