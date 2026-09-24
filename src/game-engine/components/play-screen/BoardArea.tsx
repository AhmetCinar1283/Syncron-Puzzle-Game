'use client';

import type { ReactNode, RefObject, TouchEvent as ReactTouchEvent } from 'react';
import BoardCanvas from '../../render/BoardCanvas';
import type { LevelEdges } from '../../logic/engine/getNextTopologyPosition';
import type { useGameEngine } from '../../hooks/useGameEngine';
import type { SoundId } from '@/services/audio';

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
    onPlaySound?: (sound: SoundId) => void;
    muted?: boolean;
}

/** Ölçeklenmiş board alanı: swipe girdisini yakalar, BoardCanvas'ı native boyutta çizip scale eder. */
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
    const boardProps = {
        snapshots: snapshots.length > 0 ? snapshots : null,
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
                <BoardCanvas {...boardProps} levelName={levelName} />

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

        </div>
    );
}
