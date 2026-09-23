/**
 * DOSYA AMACI: Dengeli seviyenin (`hybrid`) zafer katmanı — DOM tahtanın ÜSTÜNE
 * tek bir tuval bindirip zafer koreografisini (`victory.ts`) orada oynatır.
 * `VictoryCelebration` (DOM) ile aynı props'u alır, aynı süreyi sürer.
 *
 * NEDEN: DOM yolunun asıl kasma kaynağı bu koreografiydi; oyun sırasındaki
 * hareket DOM'da sorunsuz. Koreografi matematiği ve çizimi canvas yolundakiyle
 * ORTAK (`victoryState.ts`, `victory.ts`); burada yalnızca tuval kurulumu ve
 * kare döngüsü var. Tuval yalnızca `actors` katmanı kadar (kademeye bağlı taşma
 * payıyla, bkz. surface.ts) ve yalnızca koreografi süresince yaşar.
 *
 * `getContext('2d')` alınamazsa sessizce DOM `VictoryCelebration`'a düşer.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Entity } from '../logic/entityTypes';
import type { RoomOffset, BoardScene } from './types';
import { useGameTheme } from '../contexts/GameThemeContext';
import { useMotionTier } from '@/lib/motionTier';
import { VictoryCelebration } from '../components/effects/VictoryCelebration';
import { boardBleedFor, canUseCanvas2d, clearLayer, createSurfaces, currentDpr, dispose, hideSurfacesFromReaders, resize, type Surfaces } from './surface';
import { createSpriteCache } from './spriteCache';
import { createScheduler } from './scheduler';
import { createVictoryState, drawVictory } from './victory';

interface VictoryCanvasProps {
    entities: Entity[];
    roomPositions: Record<string, RoomOffset>;
    boardWidth: number;
    boardHeight: number;
    durationMs: number;
}

const VictoryCanvas = (props: VictoryCanvasProps) => {
    const [unsupported, setUnsupported] = useState(() => !canUseCanvas2d());
    // Kararlı kimlik şart: kanca efekti bağımlılığı, değişirse koreografi baştan başlardı.
    const markUnsupported = useCallback(() => setUnsupported(true), []);
    if (unsupported) return <VictoryCelebration {...props} />;
    return <CanvasVictory {...props} onUnsupported={markUnsupported} />;
};

const CanvasVictory = ({ entities, roomPositions, boardWidth, boardHeight, onUnsupported }: VictoryCanvasProps & { onUnsupported: () => void }) => {
    const { theme } = useGameTheme();
    const motionTier = useMotionTier();
    const [host, setHost] = useState<HTMLDivElement | null>(null);

    // Sahne yalnızca koreografinin GİRDİLERİNİ taşır (`createVictoryState`in
    // okuduğu alanlar); oda ızgarası ve hücreler zafer çiziminde kullanılmaz.
    const scene = useMemo<BoardScene>(() => ({
        rooms: {},
        entities,
        prevEntities: null,
        roomPositions,
        totalWidth: boardWidth,
        totalHeight: boardHeight,
        theme,
        controlledRoomIds: undefined,
        ambientMode: 'off',
        frameMs: 0,
        tickStartedAt: 0,
        isVictoryActive: true,
    }), [entities, roomPositions, boardWidth, boardHeight, theme]);
    // Koreografi bir kez kurulur; sahne değişse de baştan başlamamalı. Ref,
    // aşağıdaki kurulum efektinden ÖNCE tanımlı efektte güncellenir.
    const sceneRef = useRef(scene);
    useEffect(() => { sceneRef.current = scene; }, [scene]);

    useEffect(() => {
        if (!host) return;

        let surfaces: Surfaces;
        try {
            surfaces = createSurfaces(host, ['actors']);
        } catch {
            onUnsupported();
            return;
        }
        hideSurfacesFromReaders(surfaces);
        const dpr = currentDpr(motionTier);
        const cache = createSpriteCache(dpr);
        resize(surfaces, boardWidth, boardHeight, dpr, boardBleedFor(motionTier));

        const state = createVictoryState(sceneRef.current, performance.now());
        const layer = surfaces.layers.actors!;

        const scheduler = createScheduler({
            draw: (_layer, now) => {
                clearLayer(surfaces, 'actors');
                // `false` = koreografi bitti: tuval boş kalır, döngü durur.
                if (drawVictory(layer.ctx, state, cache, now)) scheduler.invalidate('actors');
            },
        });
        scheduler.invalidate('actors');

        return () => {
            scheduler.stop();
            cache.clear();
            dispose(surfaces);
        };
    }, [host, motionTier, boardWidth, boardHeight, onUnsupported]);

    return (
        <div
            ref={setHost}
            aria-hidden="true"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: boardWidth,
                height: boardHeight,
                pointerEvents: 'none',
                // DOM `VictoryCelebration` ile aynı: varlık katmanının üstünde.
                zIndex: 150,
            }}
        />
    );
};

export default VictoryCanvas;
