'use client';

import { useMemo, useState } from 'react';
import type { ReactNode, RefObject, TouchEvent as ReactTouchEvent } from 'react';
import GameBoard from '../GameBoard';
import BoardCanvas from '../../render/BoardCanvas';
import { setBoardRendererSetting, useBoardRenderer } from '../../render/boardRenderer';
import { useJankGuard } from '../../render/useJankGuard';
import type { TickSnapshot } from '../../logic/types';
import { BoardRendererToggle } from './BoardRendererToggle';
import type { LevelEdges } from '../../logic/engine/getNextTopologyPosition';
import type { useGameEngine } from '../../hooks/useGameEngine';
import type { SoundName } from '../../hooks/useSoundManager';

type Snapshots = ReturnType<typeof useGameEngine>['snapshots'];

interface BoardAreaProps {
    /** useBoardScale'in ölçtüğü alan — ResizeObserver bu div'e bağlanır. */
    areaRef: RefObject<HTMLDivElement | null>;
    boardPixelW: number;
    boardPixelH: number;
    boardScale: number;
    snapshots: Snapshots;
    controlledRoomIds: string[];
    levelEdges?: LevelEdges;
    /** Canvas tuvallerinin `aria-label`i için (yalnızca canvas yolu kullanır). */
    levelName?: string;
    isAnimating: boolean;
    onAnimationEnd: () => void;
    onTouchStart: (e: ReactTouchEvent) => void;
    onTouchMove: (e: ReactTouchEvent) => void;
    onTouchEnd: (e: ReactTouchEvent) => void;
    /** Board ile birlikte ölçeklenen katman (native koordinatlar — ör. ipucu işareti). */
    boardOverlay?: ReactNode;
    /** Board alanının üstünde ölçeklenmeden çizilen katman (ör. ipucu şeridi). */
    areaOverlay?: ReactNode;
    onPlaySound?: (sound: SoundName) => void;
    muted?: boolean;
}

/** Son karede ölüm veya zafer var mı: bu durumda tahta yeniden kurulursa efekt baştan oynar. */
function hasGameEnded(snapshots: TickSnapshot[]): boolean {
    const last = snapshots[snapshots.length - 1];
    return !!last && last.entities.some(e => e.customData.deathReason || e.customData.isVictory);
}

/** Ölçeklenmiş board alanı: swipe girdisini yakalar, GameBoard'u native boyutta çizip scale eder. */
export function BoardArea({
    areaRef,
    boardPixelW,
    boardPixelH,
    boardScale,
    snapshots,
    controlledRoomIds,
    levelEdges,
    levelName,
    isAnimating,
    onAnimationEnd,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    boardOverlay,
    areaOverlay,
    onPlaySound,
    muted,
}: BoardAreaProps) {
    // Canvas yolu DOM yolunun yanında duruyor; seçim `boardRenderer` ayarı, kasma
    // dedektörü ve cihaz kuralıyla belirlenir (bkz. render/boardRenderer.ts).
    // Çizici değişimi yalnızca güvenli anda uygulanır: hareket sürerken değil ve
    // ölüm/zafer karesinde değil (tahta yeniden kurulursa efekt baştan oynardı;
    // bir sonraki seviye/yeniden başlatmada zaten yeni tahta kurulur).
    const isSafe = !isAnimating && !hasGameEnded(snapshots);
    const { renderer, jankGuard } = useBoardRenderer(isSafe);
    const reportPhase = useJankGuard(jankGuard);

    // Çizici geçişinde yeni tahta tek kareli (dinlenen) diziyle kurulur ve
    // useFilmPlayback o karenin sesini yeniden çalardı: geçiş sessiz olmalı.
    const [prevRenderer, setPrevRenderer] = useState(renderer);
    const [swapped, setSwapped] = useState<TickSnapshot | null>(null);
    if (renderer !== prevRenderer) {
        setPrevRenderer(renderer);
        if (prevRenderer !== null && renderer !== null) {
            setSwapped(snapshots.length === 1 ? snapshots[0] : null);
        }
    }
    const boardSnapshots = useMemo(
        () => (swapped && snapshots.length === 1 && snapshots[0] === swapped
            ? [{ ...swapped, vfxEvents: [] }]
            : snapshots),
        [snapshots, swapped],
    );

    const boardProps = {
        snapshots: boardSnapshots.length > 0 ? boardSnapshots : null,
        controlledRoomIds,
        levelEdges,
        onAnimationEnd,
        onPlaySound,
        muted,
    };

    return (
        <div
            ref={areaRef}
            style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 10px 12px',
                boxSizing: 'border-box',
                touchAction: 'none',
                position: 'relative',
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <div
                style={{
                    width: boardPixelW,
                    height: boardPixelH,
                    transform: `scale(${boardScale})`,
                    transformOrigin: 'center center',
                    // Tüm tahtayı tek bir compositor katmanına sabitler: hücre
                    // ve varlık hareketleri artık sayfanın geri kalanını
                    // yeniden boyamaya zorlamıyor.
                    willChange: 'transform',
                    position: 'relative',
                }}
            >
                {/* `null` iken tahta çizilmez: cihaz kararı boyamadan önce verilir. */}
                {renderer === 'canvas' && <BoardCanvas {...boardProps} levelName={levelName} />}
                {renderer === 'dom' && <GameBoard {...boardProps} onPlaybackPhase={reportPhase} />}

                {boardOverlay}

                {isAnimating && (
                    <div style={{
                        position: 'absolute', bottom: 6, right: 6,
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: '#fbbf24',
                        boxShadow: '0 0 6px #fbbf24',
                        pointerEvents: 'none',
                    }} />
                )}
            </div>

            {areaOverlay}

            {/* Yalnızca geliştirme build'inde: iki yolu karşılaştırma aracı (09-kapanis §2.5). */}
            {process.env.NODE_ENV !== 'production' && renderer && (
                <BoardRendererToggle renderer={renderer} onChange={setBoardRendererSetting} />
            )}
        </div>
    );
}
