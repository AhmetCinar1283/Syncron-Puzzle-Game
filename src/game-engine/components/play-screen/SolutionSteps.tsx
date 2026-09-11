'use client';

import type { RefObject } from 'react';
import { STEP_DIRECTION_ARROWS, STEP_DIRECTION_COLORS } from './constants';

interface SolutionStepsProps {
    steps: string[];
    moveCount: number;
    isCompactView: boolean;
    /** Aktif adımın DOM'u; PlayScreen moveCount değişince scrollIntoView yapar. */
    activeStepRef: RefObject<HTMLDivElement | null>;
}

/** Test modunda çözüm adımları şeridi (tamamlanan / aktif / bekleyen). */
export function SolutionSteps({ steps, moveCount, isCompactView, activeStepRef }: SolutionStepsProps) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                overflowX: 'auto',
                padding: isCompactView ? '4px 8px' : '0 8px',
                width: '100%',
                maxWidth: isCompactView ? '100%' : '360px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                height: isCompactView ? 36 : '100%',
                boxSizing: 'border-box',
            }}
        >
            {steps.map((step, idx) => {
                const isCompleted = idx < moveCount;
                const isActive = idx === moveCount;
                const color = STEP_DIRECTION_COLORS[step] || '#94a3b8';
                const arrow = STEP_DIRECTION_ARROWS[step] || '?';

                return (
                    <div
                        key={idx}
                        ref={isActive ? activeStepRef : null}
                        title={`Step #${idx + 1}: ${step}`}
                        style={{
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: isActive
                                ? `${color}25`
                                : isCompleted
                                    ? 'rgba(30, 41, 59, 0.15)'
                                    : 'rgba(30, 41, 59, 0.4)',
                            border: isActive
                                ? `2px solid ${color}`
                                : isCompleted
                                    ? '1px solid rgba(71, 85, 105, 0.2)'
                                    : `1px solid ${color}40`,
                            color: isActive
                                ? color
                                : isCompleted
                                    ? '#475569'
                                    : '#e2e8f0',
                            fontSize: 11,
                            fontWeight: 'bold',
                            boxShadow: isActive ? `0 0 10px ${color}` : 'none',
                            opacity: isActive ? 1 : isCompleted ? 0.4 : 0.8,
                            transform: isActive ? 'scale(1.15)' : 'none',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        {arrow}
                    </div>
                );
            })}
        </div>
    );
}

/** Kompakt (mobil) görünümde HUD'un altındaki "KEY" çözüm şeridi. */
export function CompactSolutionBar(props: Omit<SolutionStepsProps, 'isCompactView'>) {
    return (
        <div
            style={{
                flexShrink: 0,
                height: 36,
                background: 'rgba(3, 7, 18, 0.9)',
                borderBottom: '1px solid rgba(0, 196, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
            }}
        >
            <span style={{
                fontSize: 9,
                color: '#00c4ff',
                fontWeight: 800,
                paddingLeft: 12,
                paddingRight: 10,
                borderRight: '1px solid rgba(0, 196, 255, 0.2)',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                letterSpacing: '0.05em'
            }}>
                KEY
            </span>
            <SolutionSteps {...props} isCompactView />
        </div>
    );
}
