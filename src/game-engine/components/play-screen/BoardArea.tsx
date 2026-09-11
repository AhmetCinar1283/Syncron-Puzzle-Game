'use client';

import type { RefObject, TouchEvent as ReactTouchEvent } from 'react';
import GameBoard from '../GameBoard';
import type { LevelEdges } from '../../logic/engine/getNextTopologyPosition';
import type { useGameEngine } from '../../hooks/useGameEngine';

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
    isAnimating: boolean;
    onAnimationEnd: () => void;
    onTouchStart: (e: ReactTouchEvent) => void;
    onTouchMove: (e: ReactTouchEvent) => void;
    onTouchEnd: (e: ReactTouchEvent) => void;
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
    isAnimating,
    onAnimationEnd,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
}: BoardAreaProps) {
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
                    position: 'relative',
                }}
            >
                <GameBoard
                    snapshots={snapshots.length > 0 ? snapshots : null}
                    controlledRoomIds={controlledRoomIds}
                    levelEdges={levelEdges}
                    onAnimationEnd={onAnimationEnd}
                />

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
        </div>
    );
}
