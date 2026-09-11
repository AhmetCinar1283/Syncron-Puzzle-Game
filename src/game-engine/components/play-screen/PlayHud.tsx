'use client';

import type { ReactNode } from 'react';
import { useT } from '@/contexts/LanguageContext';
import type { Entity } from '../../logic/entityTypes';
import type { RoomState } from '../../logic/types';
import { HUD_HEIGHT, OBJECT_NEON } from './constants';

interface PlayHudProps {
    levelName?: string;
    isTestMode?: boolean;
    isCompact: boolean;
    gameNotes?: string;
    onMenu: () => void;
    onShowNotes: () => void;
    /** Desktop test modunda orta alanı dolduran çözüm şeridi; yoksa oda çipleri / oyuncu modları. */
    solutionSteps: ReactNode | null;
    controlMode: 'all_rooms' | 'selected_room';
    rooms: Record<string, RoomState>;
    controlledRoomIds: string[];
    onSelectRoom: (roomId: string) => void;
    /** Oyuncu listesi render anında motor ref'inden okunur (önceki davranış). */
    getEntities: () => Entity[];
    moveCount: number;
    /** Sağ buton grubu (HudControls). */
    controls: ReactNode;
}

/** Üst HUD: sol (menü/ad/TEST/notlar), orta (çözüm/odalar/oyuncular + hamle), sağ (controls). */
export function PlayHud({
    levelName,
    isTestMode,
    isCompact,
    gameNotes,
    onMenu,
    onShowNotes,
    solutionSteps,
    controlMode,
    rooms,
    controlledRoomIds,
    onSelectRoom,
    getEntities,
    moveCount,
    controls,
}: PlayHudProps) {
    const t = useT();

    return (
        <div
            style={{
                flexShrink: 0,
                height: HUD_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 16px',
                background: 'rgba(3, 7, 18, 0.97)',
                borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
                boxShadow: '0 0 16px rgba(0,255,136,0.04)',
                gap: 8,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, maxWidth: isCompact ? '35vw' : '25vw', overflow: 'hidden' }}>
                <button
                    onClick={onMenu}
                    title={isTestMode ? "Close Test" : "Levels"}
                    style={{
                        fontSize: 14,
                        width: 28,
                        height: 28,
                        background: isTestMode ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,255,136,0.05)',
                        border: isTestMode ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(0,255,136,0.2)',
                        color: isTestMode ? '#ef4444' : '#00ff88',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                        flexShrink: 0,
                        touchAction: 'manipulation',
                        lineHeight: 1,
                        boxShadow: isTestMode ? '0 0 8px rgba(239, 68, 68, 0.15)' : 'none',
                    }}
                >
                    {isTestMode ? '✕' : '←'}
                </button>
                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isTestMode ? '#ef4444' : '#00ff88',
                        textShadow: isTestMode ? '0 0 8px rgba(239, 68, 68, 0.4)' : '0 0 8px rgba(0,255,136,0.5)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {levelName || 'LEVEL'}
                </div>
                {isTestMode && (
                    <span style={{
                        fontSize: 8,
                        padding: '2px 4px',
                        borderRadius: 4,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        color: '#ef4444',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                    }}>
                        TEST
                    </span>
                )}
                {gameNotes && !isCompact && (
                    <button
                        onClick={onShowNotes}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '2px 6px',
                            background: 'rgba(251,191,36,0.1)',
                            border: '1px solid rgba(251,191,36,0.4)',
                            color: '#fbbf24',
                            borderRadius: 5,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            boxShadow: '0 0 8px rgba(251,191,36,0.15)',
                            touchAction: 'manipulation',
                        }}
                    >
                        💡 {t('hud.level_notes')}
                    </button>
                )}
            </div>

            {/* Orta: Çözüm yolu (Desktop) veya Oda Çipleri/Modlar */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, justifyContent: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
                {solutionSteps ? (
                    solutionSteps
                ) : (
                    <>
                        {controlMode === 'selected_room' ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 9, color: '#475569', fontWeight: 'bold', letterSpacing: '0.05em' }}>ROOMS:</span>
                                {Object.keys(rooms).map((rId) => {
                                    const isActive = controlledRoomIds.includes(rId);
                                    return (
                                        <button
                                            key={rId}
                                            onClick={() => onSelectRoom(rId)}
                                            style={{
                                                fontSize: 9,
                                                padding: '2px 8px',
                                                borderRadius: 5,
                                                background: isActive ? 'rgba(0, 255, 136, 0.15)' : 'rgba(31, 41, 55, 0.4)',
                                                border: `1px solid ${isActive ? '#00ff88' : 'rgba(75, 85, 99, 0.3)'}`,
                                                color: isActive ? '#00ff88' : '#94a3b8',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {rooms[rId].name}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            getEntities()
                                .filter(e => e.type === 'player')
                                .map((obj) => {
                                    const info = OBJECT_NEON[obj.id] ?? { color: '#bf5fff', label: `P${obj.id}`, glow: '' };
                                    const mode = (obj.customData.mode as string) ?? 'normal';
                                    return (
                                        <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    backgroundColor: info.color,
                                                    boxShadow: info.glow,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                {info.label}:{' '}
                                                <span style={{ color: info.color }}>
                                                    {mode === 'reversed' ? '⬇' : '⬆'}
                                                </span>
                                            </span>
                                        </div>
                                    );
                                })
                        )}
                    </>
                )}
                <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap', marginLeft: 8 }}>
                    {t('hud.moves')}{' '}
                    <span style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {moveCount}
                    </span>
                </span>
            </div>

            {controls}
        </div>
    );
}
