'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { useMountedModalSound } from '@/services/audio';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { ALL_THEMES, GameTheme } from '../../themes/themeConfig';
import { PlayerGraphic } from '../entities/PlayerGraphic';
import type { Entity } from '../../logic/entityTypes';
import { GameIcon } from '@/components/icons';
import { Modal, type ModalRef } from '@/components/ui';
import { soundEngine } from '@/services/audio';
import { useGamepad } from '@/hooks/useGamepad';

const PREVIEW_ENTITIES: [Entity, Entity] = [
    {
        id: 1,
        type: 'player',
        position: { row: 0, col: 0 },
        physics: { direction: 'up', force: 0, z: 0 },
        def: { mass: 1, resistance: 0, isSolid: true },
        traits: new Set(),
        isElectrified: false,
        customData: { playerIndex: 0, mode: 'normal' },
    },
    {
        id: 2,
        type: 'player',
        position: { row: 0, col: 1 },
        physics: { direction: 'up', force: 0, z: 0 },
        def: { mass: 1, resistance: 0, isSolid: true },
        traits: new Set(),
        isElectrified: false,
        customData: { playerIndex: 1, mode: 'normal' },
    },
];

interface ThemeSelectorModalProps {
    onClose: () => void;
}

export function ThemeSelectorModal({ onClose }: ThemeSelectorModalProps) {
    const t = useT();
    useMountedModalSound();
    const { theme: activeTheme, setTheme, themeConfig } = useGameTheme();

    const initialIndex = ALL_THEMES.findIndex((th) => th.id === activeTheme);
    const [focusedIndex, setFocusedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);
    const modalRef = useRef<ModalRef>(null);
    const preferredColRef = useRef<number>(initialIndex >= 0 ? initialIndex % 2 : 0);
    const totalCount = ALL_THEMES.length + 1; // Temalar + Kapat butonu (5 + 1 = 6)

    const handleCloseModal = useCallback(() => {
        if (modalRef.current) {
            modalRef.current.close();
        } else {
            onClose();
        }
    }, [onClose]);

    const handleSelectTheme = useCallback((themeId: GameTheme) => {
        setTheme(themeId);
        handleCloseModal();
    }, [setTheme, handleCloseModal]);

    const activateFocus = useCallback((index: number) => {
        if (index >= 0 && index < ALL_THEMES.length) {
            handleSelectTheme(ALL_THEMES[index].id);
        } else {
            handleCloseModal();
        }
    }, [handleSelectTheme, handleCloseModal]);

    const moveFocusDirection = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
        setFocusedIndex((prev) => {
            const isSingleCol = !cardRefs.current[0] || !cardRefs.current[1] || cardRefs.current[0].offsetTop !== cardRefs.current[1].offsetTop;

            let next = prev;

            if (isSingleCol) {
                // Çekmece / Mobil (1 Sütun) Modu: ardışık gezinme
                if (dir === 'down' || dir === 'right') {
                    next = (prev + 1) % totalCount;
                } else if (dir === 'up' || dir === 'left') {
                    next = (prev - 1 + totalCount) % totalCount;
                }
            } else {
                // 2 Sütun Izgara Modu:
                // Col 0 (Sol):  [0: Legacy], [2: Neon], [4: Cosmic]
                // Col 1 (Sağ):  [1: Arcade], [3: Blueprint]
                // Row 3 (Alt):  [5: KAPAT]
                switch (prev) {
                    case 0: // Legacy (Sol Üst)
                        if (dir === 'right') next = 1;
                        else if (dir === 'down') next = 2;
                        else if (dir === 'up') next = 5;
                        else if (dir === 'left') next = 1;
                        break;
                    case 1: // Arcade (Sağ Üst)
                        if (dir === 'left') next = 0;
                        else if (dir === 'down') next = 3;
                        else if (dir === 'up') next = 5;
                        else if (dir === 'right') next = 0;
                        break;
                    case 2: // Neon (Sol Orta)
                        if (dir === 'up') next = 0;
                        else if (dir === 'down') next = 4;
                        else if (dir === 'right') next = 3;
                        else if (dir === 'left') next = 2;
                        break;
                    case 3: // Blueprint (Sağ Orta)
                        if (dir === 'up') next = 1;
                        else if (dir === 'down') next = 4; // Sol altındaki Cosmic'e gider
                        else if (dir === 'left') next = 2;
                        else if (dir === 'right') next = 3;
                        break;
                    case 4: // Cosmic (Sol Alt)
                        if (dir === 'up') next = 2;
                        else if (dir === 'down') next = 5; // Doğrudan KAPAT'a gider
                        else if (dir === 'right') next = 5; // Sağ hücre boş, KAPAT'a gider
                        else if (dir === 'left') next = 4;
                        break;
                    case 5: // KAPAT (En Alt - Tam Genişlik)
                        if (dir === 'up') {
                            next = preferredColRef.current === 1 ? 3 : 4;
                        } else if (dir === 'down') {
                            next = preferredColRef.current === 1 ? 1 : 0;
                        } else if (dir === 'left') {
                            preferredColRef.current = 0;
                        } else if (dir === 'right') {
                            preferredColRef.current = 1;
                        }
                        break;
                    default:
                        next = 0;
                }
            }

            if (next !== prev) {
                soundEngine.play('ui.tick');
                if (next <= 4) {
                    preferredColRef.current = next % 2;
                }
            }
            return next;
        });
    }, [totalCount]);

    // Odaklanan kartı veya kapat butonunu görünür alana kaydır
    useEffect(() => {
        if (focusedIndex < ALL_THEMES.length) {
            cardRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (focusedIndex === ALL_THEMES.length) {
            closeBtnRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [focusedIndex]);

    // Gamepad (D-pad, sol analog, A, B) desteği - priority: 'modal'
    useGamepad({
        enabled: true,
        priority: 'modal',
        onMove: (dir) => {
            if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') {
                moveFocusDirection(dir);
            }
        },
        onConfirm: () => {
            activateFocus(focusedIndex);
        },
        onCancel: handleCloseModal,
    });

    // Klavye (Ok tuşları, WASD, Enter, Space) desteği
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (key === 'arrowup' || key === 'w') {
                e.preventDefault();
                moveFocusDirection('up');
            } else if (key === 'arrowdown' || key === 's') {
                e.preventDefault();
                moveFocusDirection('down');
            } else if (key === 'arrowleft' || key === 'a') {
                e.preventDefault();
                moveFocusDirection('left');
            } else if (key === 'arrowright' || key === 'd') {
                e.preventDefault();
                moveFocusDirection('right');
            } else if (key === 'enter' || key === ' ') {
                e.preventDefault();
                activateFocus(focusedIndex);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [moveFocusDirection, activateFocus, focusedIndex]);

    return (
        <Modal
            ref={modalRef}
            open={true}
            onClose={onClose}
            title={t('theme.title')}
            icon={<GameIcon name="palette" size={20} color={themeConfig?.accentColor || '#00ff88'} />}
            subtitle={t('theme.subtitle')}
            hideCloseIcon={true}
            showCloseButton={false}
            maxWidth={540}
        >
            {/* Themes Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 12,
                    padding: '2px 4px 6px 2px',
                    overflowX: 'hidden',
                }}
            >
                {ALL_THEMES.map((themeDef, idx) => {
                    const isSelected = activeTheme === themeDef.id;
                    const isFocused = focusedIndex === idx;
                    const localizedName = t(themeDef.nameKey) || themeDef.defaultName;
                    const localizedDesc = t(themeDef.descriptionKey) || themeDef.defaultDescription;

                    return (
                        <div
                            key={themeDef.id}
                            ref={(el) => {
                                cardRefs.current[idx] = el;
                            }}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            aria-label={`${localizedName} - ${isSelected ? t('theme.active') : t('theme.select_theme')}`}
                            title={isSelected ? t('theme.active') : t('theme.select_theme')}
                            onClick={() => handleSelectTheme(themeDef.id)}
                            onMouseEnter={() => setFocusedIndex(idx)}
                            style={{
                                padding: '12px 14px',
                                borderRadius: 10,
                                border: isFocused
                                    ? `2px solid ${themeDef.accentColor}`
                                    : isSelected
                                    ? `1.5px solid ${themeDef.accentColor}80`
                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                background: isSelected
                                    ? `linear-gradient(135deg, ${themeDef.bgDark} 0%, rgba(20, 30, 50, 0.9) 100%)`
                                    : isFocused
                                    ? 'rgba(255, 255, 255, 0.06)'
                                    : 'rgba(15, 23, 42, 0.65)',
                                boxShadow: isFocused
                                    ? `0 0 18px ${themeDef.accentGlow}, inset 0 0 12px rgba(255, 255, 255, 0.05)`
                                    : isSelected
                                    ? `0 0 12px ${themeDef.accentGlow}`
                                    : 'none',
                                transform: isFocused ? 'scale(1.02)' : 'scale(1)',
                                cursor: 'pointer',
                                transition: 'all 0.16s ease-in-out',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                                position: 'relative',
                                outline: 'none',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <GameIcon name={themeDef.icon as any} size={20} />
                                    <span
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 700,
                                            color: isFocused || isSelected ? themeDef.accentColor : '#e2e8f0',
                                            letterSpacing: '0.02em',
                                        }}
                                    >
                                        {localizedName}
                                    </span>
                                </div>
                                {isSelected && (
                                    <div
                                        title={t('theme.active')}
                                        style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            background: themeDef.accentColor,
                                            color: '#000',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 11,
                                            fontWeight: 'bold',
                                            boxShadow: `0 0 8px ${themeDef.accentColor}`,
                                        }}
                                    >
                                        <GameIcon name="check" size={11} />
                                    </div>
                                )}
                            </div>

                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 11,
                                    color: isSelected || isFocused ? '#cbd5e1' : '#64748b',
                                    lineHeight: 1.35,
                                }}
                            >
                                {localizedDesc}
                            </p>

                            {/* Mini Color Palette & Player Entities Preview */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <div
                                        style={{
                                            width: 14,
                                            height: 6,
                                            borderRadius: 2,
                                            background: themeDef.accentColor,
                                        }}
                                    />
                                    <div
                                        style={{
                                            width: 14,
                                            height: 6,
                                            borderRadius: 2,
                                            background: themeDef.bgDark,
                                            border: '1px solid rgba(255,255,255,0.2)',
                                        }}
                                    />
                                </div>
                                {/* Player entities preview (P1 green & P2 blue) */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {PREVIEW_ENTITIES.map((ent) => (
                                        <div
                                            key={ent.id}
                                            title={`P${ent.id}`}
                                            style={{
                                                width: 28,
                                                height: 28,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    transform: 'scale(0.44)',
                                                    transformOrigin: 'center',
                                                    width: 64,
                                                    height: 64,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    pointerEvents: 'none',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <PlayerGraphic entity={ent} themeConfig={themeDef} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Alt Kapat Butonu (Odaklanabilir) */}
            <button
                ref={closeBtnRef}
                type="button"
                data-active={focusedIndex === ALL_THEMES.length}
                onClick={() => activateFocus(ALL_THEMES.length)}
                onMouseEnter={() => setFocusedIndex(ALL_THEMES.length)}
                className="home-sheet__close-btn"
                style={{
                    border: focusedIndex === ALL_THEMES.length
                        ? `1.5px solid ${themeConfig?.accentColor || '#00ff88'}`
                        : '1.5px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: focusedIndex === ALL_THEMES.length
                        ? `0 0 14px ${themeConfig?.accentGlow || 'rgba(0, 255, 136, 0.3)'}`
                        : 'none',
                    color: focusedIndex === ALL_THEMES.length ? '#ffffff' : '#94a3b8',
                    transform: focusedIndex === ALL_THEMES.length ? 'scale(1.01)' : 'scale(1)',
                }}
            >
                {t('common.close')}
            </button>
        </Modal>
    );
}
