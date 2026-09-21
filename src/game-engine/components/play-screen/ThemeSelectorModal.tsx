'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/contexts/LanguageContext';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { ALL_THEMES, GameTheme } from '../../themes/themeConfig';
import { PlayerGraphic } from '../entities/PlayerGraphic';
import type { Entity } from '../../logic/entityTypes';
import { GameIcon } from '@/components/icons';

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
    const { theme: activeTheme, setTheme } = useGameTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSelectTheme = (themeId: GameTheme) => {
        setTheme(themeId);
        onClose();
    };

    if (!mounted || typeof document === 'undefined') return null;

    return createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(2, 5, 14, 0.85)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                boxSizing: 'border-box',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'rgba(8, 14, 26, 0.98)',
                    border: '1.5px solid rgba(0, 255, 136, 0.35)',
                    borderRadius: 16,
                    padding: '22px 24px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 30px rgba(0, 255, 136, 0.18)',
                    width: '100%',
                    maxWidth: 540,
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    gap: 16,
                    margin: 'auto',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <GameIcon name="palette" size={20} />
                        <h2
                            style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 800,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: '#00ff88',
                                textShadow: '0 0 10px rgba(0, 255, 136, 0.4)',
                            }}
                        >
                            {t('theme.title')}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        title={t('common.close')}
                        aria-label={t('common.close')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: 18,
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: 6,
                            transition: 'color 0.15s, background 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <GameIcon name="close" size={16} />
                    </button>
                </div>

                {/* Subtitle */}
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                    {t('theme.subtitle')}
                </p>

                {/* Themes Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 12,
                        overflowY: 'auto',
                        paddingRight: 4,
                        maxHeight: '60vh',
                    }}
                >
                    {ALL_THEMES.map((themeDef) => {
                        const isSelected = activeTheme === themeDef.id;
                        const localizedName = t(themeDef.nameKey) || themeDef.defaultName;
                        const localizedDesc = t(themeDef.descriptionKey) || themeDef.defaultDescription;

                        return (
                            <div
                                key={themeDef.id}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isSelected}
                                aria-label={`${localizedName} - ${isSelected ? t('theme.active') : t('theme.select_theme')}`}
                                title={isSelected ? t('theme.active') : t('theme.select_theme')}
                                onClick={() => handleSelectTheme(themeDef.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleSelectTheme(themeDef.id);
                                    }
                                }}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: 10,
                                    border: isSelected
                                        ? `2px solid ${themeDef.accentColor}`
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                    background: isSelected
                                        ? `linear-gradient(135deg, ${themeDef.bgDark} 0%, rgba(20, 30, 50, 0.9) 100%)`
                                        : 'rgba(15, 23, 42, 0.65)',
                                    boxShadow: isSelected
                                        ? `0 0 16px ${themeDef.accentGlow}, inset 0 0 10px rgba(${themeDef.accentColor}, 0.1)`
                                        : 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.18s ease-in-out',
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
                                                color: isSelected ? themeDef.accentColor : '#e2e8f0',
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
                                        color: isSelected ? '#cbd5e1' : '#64748b',
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
            </div>
        </div>,
        document.body
    );
}
