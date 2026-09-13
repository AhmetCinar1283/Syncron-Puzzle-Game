'use client';

import type { ReactNode } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { ArrowLeft, X, Lightbulb, Footprints } from 'lucide-react';
import type { Entity } from '../../logic/entityTypes';
import type { RoomState } from '../../logic/types';
import { HUD_HEIGHT } from './constants';

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

/** Üst HUD: sol (menü/ad/TEST/notlar), orta (çözüm/odalar + hamle), sağ (controls). */
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
                padding: isCompact ? '0 12px' : '0 24px',
                background: 'rgba(3, 7, 18, 0.95)',
                borderBottom: '1px solid rgba(0, 255, 136, 0.12)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                backdropFilter: 'blur(12px)',
                gap: isCompact ? 8 : 16,
                position: 'relative',
                zIndex: 50,
            }}
        >
            {/* ── Sol: Geri Tuşu + Seviye Adı Rozeti + Notlar ──────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 6 : 10, flexShrink: 0, minWidth: 0 }}>
                <button
                    onClick={onMenu}
                    title={isTestMode ? "Close Test (Esc)" : "Levels (Esc)"}
                    aria-label={isTestMode ? "Close Test" : "Levels"}
                    style={{
                        width: isCompact ? 32 : 36,
                        height: isCompact ? 32 : 36,
                        borderRadius: 8,
                        background: isTestMode ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                        border: isTestMode ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isTestMode ? '#ef4444' : '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.06)';
                        e.currentTarget.style.borderColor = isTestMode ? '#ef4444' : '#00ff88';
                        e.currentTarget.style.color = isTestMode ? '#ef4444' : '#00ff88';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.borderColor = isTestMode ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = isTestMode ? '#ef4444' : '#cbd5e1';
                    }}
                >
                    {isTestMode ? <X size={isCompact ? 15 : 17} /> : <ArrowLeft size={isCompact ? 15 : 17} />}
                </button>

                {/* Seviye Adı Rozeti */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        height: isCompact ? 32 : 36,
                        padding: isCompact ? '0 10px' : '0 14px',
                        borderRadius: 8,
                        background: isTestMode ? 'rgba(239, 68, 68, 0.06)' : 'rgba(0, 255, 136, 0.05)',
                        border: `1px solid ${isTestMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 255, 136, 0.2)'}`,
                        maxWidth: isCompact ? '36vw' : '280px',
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                    }}
                >
                    <span
                        style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: isTestMode ? '#ef4444' : '#00ff88',
                            boxShadow: `0 0 8px ${isTestMode ? '#ef4444' : '#00ff88'}`,
                            flexShrink: 0,
                        }}
                    />
                    <span
                        style={{
                            fontSize: isCompact ? 11 : 13,
                            fontWeight: 800,
                            fontFamily: 'monospace, sans-serif',
                            color: isTestMode ? '#ef4444' : '#f1f5f9',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {levelName || 'LEVEL'}
                    </span>
                    {isTestMode && (
                        <span
                            style={{
                                fontSize: 9,
                                padding: '2px 5px',
                                borderRadius: 4,
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                fontWeight: 900,
                                letterSpacing: '0.06em',
                                flexShrink: 0,
                            }}
                        >
                            TEST
                        </span>
                    )}
                </div>

                {/* Bölüm Notları (varsa) */}
                {gameNotes && (
                    <button
                        onClick={onShowNotes}
                        title={t('hud.level_notes')}
                        aria-label={t('hud.level_notes')}
                        style={{
                            height: isCompact ? 32 : 36,
                            padding: isCompact ? '0 8px' : '0 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            borderRadius: 8,
                            background: 'rgba(251, 191, 36, 0.08)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            color: '#fbbf24',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                            transition: 'all 0.15s ease',
                            boxShadow: '0 0 8px rgba(251, 191, 36, 0.12)',
                            flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.borderColor = '#fbbf24';
                            e.currentTarget.style.boxShadow = '0 0 12px rgba(251, 191, 36, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
                            e.currentTarget.style.boxShadow = '0 0 8px rgba(251, 191, 36, 0.12)';
                        }}
                    >
                        <Lightbulb size={14} />
                        {!isCompact && <span>{t('hud.level_notes')}</span>}
                    </button>
                )}
            </div>

            {/* ── Orta: Çözüm Yolu / Oda Seçici + Hamle Kapsülü ───────── */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, justifyContent: 'center', overflow: 'hidden' }}>
                {solutionSteps ? (
                    solutionSteps
                ) : (
                    <>
                        {controlMode === 'selected_room' && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    height: isCompact ? 32 : 36,
                                    padding: 2,
                                    borderRadius: 8,
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    boxSizing: 'border-box',
                                }}
                            >
                                {Object.keys(rooms).map((rId) => {
                                    const isActive = controlledRoomIds.includes(rId);
                                    return (
                                        <button
                                            key={rId}
                                            onClick={() => onSelectRoom(rId)}
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '3px 8px',
                                                borderRadius: 6,
                                                background: isActive ? 'rgba(0, 255, 136, 0.12)' : 'transparent',
                                                border: `1px solid ${isActive ? '#00ff88' : 'transparent'}`,
                                                color: isActive ? '#00ff88' : '#64748b',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {rooms[rId].name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Hamle Sayacı Kapsülü */}
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                height: isCompact ? 32 : 36,
                                padding: isCompact ? '0 10px' : '0 14px',
                                borderRadius: 18,
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.09)',
                                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                                boxSizing: 'border-box',
                            }}
                        >
                            <Footprints size={isCompact ? 12 : 14} style={{ color: '#00c4ff' }} />
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: '#64748b',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {t('hud.moves_lower') || 'MOVES'}
                            </span>
                            <span
                                style={{
                                    fontSize: isCompact ? 13 : 14,
                                    fontWeight: 800,
                                    fontFamily: 'monospace, sans-serif',
                                    color: '#00ff88',
                                    textShadow: '0 0 8px rgba(0, 255, 136, 0.5)',
                                    minWidth: 18,
                                    textAlign: 'center',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {moveCount}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* ── Sağ: Kontroller ──────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 4 : 6, flexShrink: 0 }}>
                {controls}
            </div>
        </div>
    );
}
