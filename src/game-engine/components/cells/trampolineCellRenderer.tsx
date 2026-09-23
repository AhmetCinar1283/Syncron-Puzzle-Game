import { Cell } from '../../logic/cellTypes';
import { Direction } from '../../logic/types';
import { Entity } from '../../logic/entityTypes';
import { useState, useEffect } from 'react';
import { useGameTheme } from '../../contexts/GameThemeContext';

const ROTATION: Record<Direction, string> = {
    up: '0deg', right: '90deg', down: '180deg', left: '270deg',
};

interface TrampolineCellRendererProps {
    cell: Cell;
    entityOnCell: Entity | null;
    prevEntityOnCell: Entity | null;
}

export const TrampolineCellRenderer = ({ cell, entityOnCell, prevEntityOnCell }: TrampolineCellRendererProps) => {
    const { theme, themeConfig } = useGameTheme();
    const direction = (cell.customData.direction as Direction) ?? 'up';
    
    // Zıplama parıltısı 500 ms'lik bir MANDAL: varlık hücreye girdiği anda yanar,
    // süre dolunca söner. Mandal render sırasında (React'in "prop değişince state'i
    // ayarla" örüntüsü) kuruluyor; efektte yalnızca zamanlayıcı kalıyor.
    const triggerKey = `${entityOnCell?.id ?? '-'}|${prevEntityOnCell?.id ?? '-'}`;
    const [seenTriggerKey, setSeenTriggerKey] = useState<string | null>(null);
    const [activationId, setActivationId] = useState(0);
    const [expiredActivationId, setExpiredActivationId] = useState(0);

    if (triggerKey !== seenTriggerKey) {
        setSeenTriggerKey(triggerKey);
        const justArrived = entityOnCell !== null && prevEntityOnCell === null;
        if (justArrived) setActivationId((id) => id + 1);
    }

    const isActivelyBouncing = activationId !== expiredActivationId;

    useEffect(() => {
        if (activationId === expiredActivationId) return;
        const timer = setTimeout(() => setExpiredActivationId(activationId), 500);
        return () => clearTimeout(timer);
    }, [activationId, expiredActivationId]);

    const bounceColor = theme === 'arcade' ? '#facc15' : theme === 'cosmic' ? '#a78bfa' : theme === 'blueprint' ? '#38bdf8' : '#22d3ee';
    const borderRadius = theme === 'arcade' ? 0 : theme === 'blueprint' ? 2 : 6;

    if (theme === 'legacy') {
        return (
            <div style={{
                width: 64,
                height: 64,
                background: 'rgba(34, 211, 238, 0.12)',
                border: '2px solid rgba(34, 211, 238, 0.6)',
                boxShadow: 'inset 0 0 14px rgba(34, 211, 238, 0.2), 0 0 8px rgba(34, 211, 238, 0.15)',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{ transform: `rotate(${ROTATION[direction]})` }}>
                    <svg width={35} height={35} viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.8))' }}>
                        <path d="M12 22V12" />
                        <path d="M12 12C12 12 17 16 19 12C21 8 12 2 12 2" />
                        <path d="M12 12C12 12 7 16 5 12C3 8 12 2 12 2" />
                        <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div 
            id={`cell-${cell.id}`}
            style={{
                width: 64,
                height: 64,
                background: isActivelyBouncing ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.7)',
                border: `2px solid ${isActivelyBouncing ? '#ffffff' : bounceColor}`,
                borderRadius,
                boxShadow: isActivelyBouncing
                    ? `inset 0 0 24px ${bounceColor}88, 0 0 16px ${bounceColor}66`
                    : `inset 0 0 16px ${bounceColor}40, 0 0 10px ${bounceColor}25`,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
            }}
        >
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div 
                    style={{
                        width: 38,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: `rotate(${ROTATION[direction]})`,
                    }}
                >
                    <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isActivelyBouncing ? '#e0f7fa' : '#22d3ee'}
                        strokeWidth={isActivelyBouncing ? "3.2" : "2.5"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={isActivelyBouncing ? 'trampoline-spring-active' : undefined}
                        style={{
                            width: '100%',
                            height: '100%',
                            transformOrigin: 'bottom center',
                            filter: isActivelyBouncing 
                                ? 'drop-shadow(0 0 12px rgba(34,211,238,1))' 
                                : 'drop-shadow(0 0 6px rgba(34,211,238,0.85))',
                            transition: 'stroke-width 200ms ease, stroke 200ms ease, filter 200ms ease',
                        }}
                    >
                        <path d="M12 22V12" />
                        <path d="M12 12C12 12 17 16 19 12C21 8 12 2 12 2" />
                        <path d="M12 12C12 12 7 16 5 12C3 8 12 2 12 2" />
                        <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
                </div>
            </div>
        </div>
    );
};
