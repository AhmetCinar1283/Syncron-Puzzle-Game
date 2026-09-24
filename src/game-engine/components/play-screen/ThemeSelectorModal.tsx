'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { useMountedModalSound } from '@/services/audio';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { ALL_THEMES, GameTheme, ThemeDefinition } from '../../themes/themeConfig';
import { PlayerGraphic } from '../entities/PlayerGraphic';
import type { Entity } from '../../logic/entityTypes';
import { GameIcon } from '@/components/icons';
import { Modal, type ModalRef } from '@/components/ui';
import { soundEngine } from '@/services/audio';
import { useGamepad } from '@/hooks/useGamepad';

const P1_ENTITY: Entity = {
    id: 1,
    type: 'player',
    position: { row: 0, col: 0 },
    physics: { direction: 'up', force: 0, z: 0 },
    def: { mass: 1, resistance: 0, isSolid: true },
    traits: new Set(),
    isElectrified: false,
    customData: { playerIndex: 0, mode: 'normal' },
};

const P2_ENTITY: Entity = {
    id: 2,
    type: 'player',
    position: { row: 0, col: 2 },
    physics: { direction: 'up', force: 0, z: 0 },
    def: { mass: 1, resistance: 0, isSolid: true },
    traits: new Set(),
    isElectrified: false,
    customData: { playerIndex: 1, mode: 'normal' },
};

const THEME_TAGS: Record<GameTheme, string> = {
    arcade: '8-BIT',
    neon: 'CYBER',
    blueprint: 'CAD',
    cosmic: 'VOID',
    legacy: 'CLASSIC',
};

function getDioramaBoxStyle(themeId: GameTheme): React.CSSProperties {
    switch (themeId) {
        case 'arcade':
            return {
                borderRadius: 0,
                background: '#27272a',
                border: '1.5px solid #facc15',
                boxShadow: 'inset 1.5px 1.5px 0 rgba(255,255,255,0.7), inset -1.5px -1.5px 0 rgba(0,0,0,0.8)',
                color: '#facc15',
            };
        case 'neon':
            return {
                borderRadius: 3,
                background: 'rgba(10, 22, 38, 0.95)',
                border: '1.5px solid #00ff88',
                boxShadow: '0 0 8px rgba(0,255,136,0.5), inset 0 0 3px rgba(0,255,136,0.3)',
                color: '#00ff88',
            };
        case 'blueprint':
            return {
                borderRadius: 2,
                background: '#0c274c',
                border: '1.5px solid #38bdf8',
                boxShadow: '0 0 8px rgba(56,189,248,0.45), inset 0 0 3px rgba(56,189,248,0.2)',
                color: '#38bdf8',
            };
        case 'cosmic':
            return {
                borderRadius: 5,
                background: '#120824',
                border: '1.5px solid #a78bfa',
                boxShadow: '0 0 8px rgba(167,139,250,0.45), inset 0 0 3px rgba(167,139,250,0.2)',
                color: '#a78bfa',
            };
        case 'legacy':
        default:
            return {
                borderRadius: 5,
                background: 'rgba(15, 23, 35, 0.95)',
                border: '1.5px solid #f97316',
                boxShadow: '0 0 8px rgba(249,115,22,0.5), 0 0 16px rgba(249,115,22,0.2)',
                color: '#f97316',
            };
    }
}

function DioramaObstacle({ themeId }: { themeId: GameTheme }) {
    switch (themeId) {
        case 'arcade':
            return (
                <div className="theme-diorama__obstacle theme-diorama__obstacle--arcade">
                    <div className="theme-diorama__obstacle-inner--arcade">
                        <div className="theme-diorama__arcade-brick-mark" />
                    </div>
                </div>
            );
        case 'neon':
            return (
                <div className="theme-diorama__obstacle theme-diorama__obstacle--neon">
                    <div className="theme-diorama__obstacle-inner--neon">
                        <div className="theme-diorama__neon-plate-mark" />
                    </div>
                </div>
            );
        case 'blueprint':
            return (
                <div className="theme-diorama__obstacle theme-diorama__obstacle--blueprint">
                    <div className="theme-diorama__obstacle-inner--blueprint">
                        <div className="theme-diorama__blueprint-cross-h" />
                        <div className="theme-diorama__blueprint-cross-v" />
                    </div>
                </div>
            );
        case 'cosmic':
            return (
                <div className="theme-diorama__obstacle theme-diorama__obstacle--cosmic">
                    <div className="theme-diorama__obstacle-inner--cosmic">
                        <div className="theme-diorama__cosmic-obsidian-mark" />
                    </div>
                </div>
            );
        case 'legacy':
        default:
            return (
                <div className="theme-diorama__obstacle theme-diorama__obstacle--legacy">
                    <div className="theme-diorama__obstacle-inner--legacy">
                        <div className="theme-diorama__legacy-mark" />
                    </div>
                </div>
            );
    }
}

function DioramaHazard({ themeDef }: { themeDef: ThemeDefinition }) {
    const isSkull = themeDef.forbiddenCell.hazardType === 'skull' || themeDef.forbiddenCell.hazardType === 'pixel_skull';
    return (
        <div
            className="theme-diorama__cell"
            style={{
                background: themeDef.forbiddenCell.background,
                border: themeDef.forbiddenCell.border,
                boxShadow: themeDef.forbiddenCell.boxShadow,
                borderRadius: themeDef.normalCell.borderRadius,
            }}
        >
            <div className="theme-diorama__hazard">
                {isSkull ? (
                    <GameIcon name="skull" size={14} color={themeDef.forbiddenCell.symbolColor} />
                ) : (
                    <GameIcon name="close" size={13} color={themeDef.forbiddenCell.symbolColor} />
                )}
            </div>
        </div>
    );
}

function DioramaTarget({ themeDef }: { themeDef: ThemeDefinition }) {
    return (
        <div
            className="theme-diorama__cell"
            style={{
                background: themeDef.normalCell.background,
                border: themeDef.normalCell.border,
                boxShadow: themeDef.normalCell.boxShadow,
                borderRadius: themeDef.normalCell.borderRadius,
            }}
        >
            <div className="theme-diorama__target">
                <div
                    className="theme-diorama__target-dot"
                    style={{
                        background: themeDef.accentColor,
                        boxShadow: `0 0 8px ${themeDef.accentColor}`,
                    }}
                >
                    <div
                        style={{
                            width: 3.5,
                            height: 3.5,
                            borderRadius: '50%',
                            background: '#ffffff',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function MiniDiorama({
    themeDef,
    isHovered,
    isFocused,
}: {
    themeDef: ThemeDefinition;
    isHovered: boolean;
    isFocused: boolean;
}) {
    const boardBg = themeDef.board.background || themeDef.bgDark;
    const boardBorder = themeDef.board.border(isHovered || isFocused);
    const boardShadow = themeDef.board.boxShadow(isHovered || isFocused);

    return (
        <div
            className="theme-diorama"
            style={{
                background: boardBg,
                border: boardBorder,
                boxShadow: boardShadow,
                borderRadius: themeDef.board.borderRadius ?? 6,
            }}
        >
            {/* Themed ambient atmosphere layer */}
            <div className={`theme-diorama__atmosphere theme-diorama__atmosphere--${themeDef.id}`} />

            {/* 3x2 Mini Board Grid */}
            <div className="theme-diorama__board">
                {/* (0, 0): Player 1 (Green) on Normal Cell */}
                <div
                    className="theme-diorama__cell"
                    style={{
                        background: themeDef.normalCell.background,
                        border: themeDef.normalCell.border,
                        boxShadow: themeDef.normalCell.boxShadow,
                        borderRadius: themeDef.normalCell.borderRadius,
                    }}
                >
                    <div className="theme-diorama__player-wrap theme-diorama__player-wrap--p1">
                        <div className="theme-diorama__player-inner">
                            <PlayerGraphic entity={P1_ENTITY} themeConfig={themeDef} />
                        </div>
                    </div>
                </div>

                {/* (0, 1): Obstacle Block */}
                <div
                    className="theme-diorama__cell"
                    style={{
                        borderRadius: themeDef.obstacleCell.borderRadius ?? themeDef.normalCell.borderRadius,
                    }}
                >
                    <DioramaObstacle themeId={themeDef.id} />
                </div>

                {/* (0, 2): Player 2 (Blue) on Normal Cell */}
                <div
                    className="theme-diorama__cell"
                    style={{
                        background: themeDef.normalCell.background,
                        border: themeDef.normalCell.border,
                        boxShadow: themeDef.normalCell.boxShadow,
                        borderRadius: themeDef.normalCell.borderRadius,
                    }}
                >
                    <div className="theme-diorama__player-wrap theme-diorama__player-wrap--p2">
                        <div className="theme-diorama__player-inner">
                            <PlayerGraphic entity={P2_ENTITY} themeConfig={themeDef} />
                        </div>
                    </div>
                </div>

                {/* (1, 0): Themed Box on Normal Cell */}
                <div
                    className="theme-diorama__cell"
                    style={{
                        background: themeDef.normalCell.background,
                        border: themeDef.normalCell.border,
                        boxShadow: themeDef.normalCell.boxShadow,
                        borderRadius: themeDef.normalCell.borderRadius,
                    }}
                >
                    <div
                        className="theme-diorama__box"
                        style={getDioramaBoxStyle(themeDef.id)}
                    >
                        ▣
                    </div>
                </div>

                {/* (1, 1): Hazard Cell */}
                <DioramaHazard themeDef={themeDef} />

                {/* (1, 2): Target / Goal Cell */}
                <DioramaTarget themeDef={themeDef} />
            </div>
        </div>
    );
}

interface ThemeSelectorModalProps {
    onClose: () => void;
}

export function ThemeSelectorModal({ onClose }: ThemeSelectorModalProps) {
    const t = useT();
    useMountedModalSound();
    const { theme: activeTheme, setTheme, themeConfig } = useGameTheme();

    const initialIndex = ALL_THEMES.findIndex((th) => th.id === activeTheme);
    const [focusedIndex, setFocusedIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [selectedAnimTheme, setSelectedAnimTheme] = useState<GameTheme | null>(null);

    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);
    const modalRef = useRef<ModalRef>(null);
    const preferredColRef = useRef<number>(initialIndex >= 0 ? initialIndex % 2 : 0);
    const totalCount = ALL_THEMES.length + 1; // 5 Themes + 1 Close button

    const handleCloseModal = useCallback(() => {
        if (modalRef.current) {
            modalRef.current.close();
        } else {
            onClose();
        }
    }, [onClose]);

    const handleSelectTheme = useCallback((themeId: GameTheme) => {
        setSelectedAnimTheme(themeId);
        soundEngine.play('ui.themeSelect');
        setTheme(themeId);
        setTimeout(() => {
            handleCloseModal();
        }, 180);
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
                // Single column (mobile): sequential navigation
                if (dir === 'down' || dir === 'right') {
                    next = (prev + 1) % totalCount;
                } else if (dir === 'up' || dir === 'left') {
                    next = (prev - 1 + totalCount) % totalCount;
                }
            } else {
                // 2 Column Grid:
                // Col 0: [0: Arcade], [2: Neon], [4: Cosmic]
                // Col 1: [1: Legacy], [3: Blueprint]
                // Row 3: [5: CLOSE]
                switch (prev) {
                    case 0: // Arcade (Top Left)
                        if (dir === 'right') next = 1;
                        else if (dir === 'down') next = 2;
                        else if (dir === 'up') next = 5;
                        else if (dir === 'left') next = 1;
                        break;
                    case 1: // Legacy (Top Right)
                        if (dir === 'left') next = 0;
                        else if (dir === 'down') next = 3;
                        else if (dir === 'up') next = 5;
                        else if (dir === 'right') next = 0;
                        break;
                    case 2: // Neon (Mid Left)
                        if (dir === 'up') next = 0;
                        else if (dir === 'down') next = 4;
                        else if (dir === 'right') next = 3;
                        else if (dir === 'left') next = 2;
                        break;
                    case 3: // Blueprint (Mid Right)
                        if (dir === 'up') next = 1;
                        else if (dir === 'down') next = 4;
                        else if (dir === 'left') next = 2;
                        else if (dir === 'right') next = 3;
                        break;
                    case 4: // Cosmic (Bottom Left)
                        if (dir === 'up') next = 2;
                        else if (dir === 'down') next = 5;
                        else if (dir === 'right') next = 5;
                        else if (dir === 'left') next = 4;
                        break;
                    case 5: // CLOSE (Bottom Full Width)
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

    // Scroll focused card into view smoothly
    useEffect(() => {
        if (focusedIndex < ALL_THEMES.length) {
            cardRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (focusedIndex === ALL_THEMES.length) {
            closeBtnRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [focusedIndex]);

    // Gamepad support
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

    // Keyboard support (Arrows, WASD, Enter, Space)
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
            hideCloseIcon={false}
            showCloseButton={false}
            maxWidth={560}
        >
            {/* Themes Grid */}
            <div className="theme-modal__grid">
                {ALL_THEMES.map((themeDef, idx) => {
                    const isSelected = activeTheme === themeDef.id;
                    const isFocused = focusedIndex === idx;
                    const isHovered = hoveredIndex === idx;
                    const isSelecting = selectedAnimTheme === themeDef.id;
                    const localizedName = t(themeDef.nameKey) || themeDef.defaultName;
                    const localizedDesc = t(themeDef.descriptionKey) || themeDef.defaultDescription;
                    const tagText = THEME_TAGS[themeDef.id] || 'THEME';

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
                            onMouseEnter={() => {
                                setHoveredIndex(idx);
                                if (focusedIndex !== idx) {
                                    soundEngine.play('ui.tick');
                                    setFocusedIndex(idx);
                                }
                            }}
                            onMouseLeave={() => setHoveredIndex(null)}
                            data-theme-id={themeDef.id}
                            data-active={isSelected ? 'true' : undefined}
                            data-focused={isFocused ? 'true' : undefined}
                            data-selected-anim={isSelecting ? 'true' : undefined}
                            className="theme-card"
                            style={{
                                '--card-accent': themeDef.accentColor,
                                animationDelay: `${idx * 40}ms`,
                            } as React.CSSProperties}
                        >
                            {/* Card Header: Icon + Name + Tag / Active Badge */}
                            <div className="theme-card__header">
                                <div className="theme-card__title-area">
                                    <div
                                        className="theme-card__icon-badge"
                                        style={{
                                            background: `${themeDef.accentColor}18`,
                                            border: `1px solid ${themeDef.accentColor}40`,
                                            color: themeDef.accentColor,
                                        }}
                                    >
                                        <GameIcon name={themeDef.icon as any} size={16} />
                                    </div>
                                    <span
                                        className="theme-card__name"
                                        style={{
                                            color: isSelected || isFocused ? themeDef.accentColor : '#f1f5f9',
                                        }}
                                    >
                                        {localizedName}
                                    </span>
                                </div>

                                {isSelected ? (
                                    <div className="theme-card__tag-pill theme-card__tag-pill--active">
                                        <GameIcon name="check" size={10} color="#000000" />
                                        <span>{t('theme.active')}</span>
                                    </div>
                                ) : (
                                    <div
                                        className="theme-card__tag-pill"
                                        style={{
                                            background: `${themeDef.accentColor}15`,
                                            border: `1px solid ${themeDef.accentColor}35`,
                                            color: themeDef.accentColor,
                                        }}
                                    >
                                        {tagText}
                                    </div>
                                )}
                            </div>

                            {/* Centerpiece: Interactive Mini Game Diorama */}
                            <MiniDiorama
                                themeDef={themeDef}
                                isHovered={isHovered}
                                isFocused={isFocused}
                            />

                            {/* Card Footer: Vibe or Action Prompt */}
                            <div className="theme-card__footer">
                                {isSelected ? (
                                    <div className="theme-card__active-indicator">
                                        <span className="theme-card__active-dot" />
                                        <span>{t('theme.active')}</span>
                                    </div>
                                ) : isFocused || isHovered ? (
                                    <span className="theme-card__action-hint">
                                        <span>{t('theme.select_theme')}</span>
                                        <span>→</span>
                                    </span>
                                ) : (
                                    <span className="theme-card__vibe">{localizedDesc}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottom Close Button (Keyboard & Gamepad Navigable) */}
            <button
                ref={closeBtnRef}
                type="button"
                data-active={focusedIndex === ALL_THEMES.length}
                onClick={() => activateFocus(ALL_THEMES.length)}
                onMouseEnter={() => {
                    if (focusedIndex !== ALL_THEMES.length) {
                        soundEngine.play('ui.tick');
                        setFocusedIndex(ALL_THEMES.length);
                    }
                }}
                className="home-sheet__close-btn"
                style={{
                    marginTop: 6,
                    border: focusedIndex === ALL_THEMES.length
                        ? `1.5px solid ${themeConfig?.accentColor || '#00ff88'}`
                        : '1.5px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: focusedIndex === ALL_THEMES.length
                        ? `0 0 14px ${themeConfig?.accentGlow || 'rgba(0, 255, 136, 0.3)'}`
                        : 'none',
                    color: focusedIndex === ALL_THEMES.length ? '#ffffff' : '#94a3b8',
                    transform: focusedIndex === ALL_THEMES.length ? 'scale(1.01)' : 'scale(1)',
                    transition: 'all 0.18s ease-in-out',
                }}
            >
                {t('common.close')}
            </button>
        </Modal>
    );
}
