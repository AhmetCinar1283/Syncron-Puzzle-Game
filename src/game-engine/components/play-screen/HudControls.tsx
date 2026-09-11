'use client';

import type { CSSProperties } from 'react';
import { useT } from '@/contexts/LanguageContext';

interface HudControlsProps {
    theme: string;
    onToggleTheme: () => void;
    muted: boolean;
    onToggleMute: () => void;
    isCompact: boolean;
    undoDisabled: boolean;
    onUndo: () => void;
    stepDisabled: boolean;
    onStepForward: () => void;
    onRestart: () => void;
}

const ICON_BUTTON_BASE: CSSProperties = {
    fontSize: 14,
    width: 30,
    height: 30,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
    flexShrink: 0,
    touchAction: 'manipulation',
};

const TEXT_BUTTON_BASE: CSSProperties = {
    fontSize: 11,
    padding: '4px 10px',
    background: 'rgba(0,255,136,0.05)',
    border: '1px solid rgba(0,255,136,0.3)',
    color: '#00ff88',
    borderRadius: 6,
    letterSpacing: '0.04em',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
    touchAction: 'manipulation',
};

/** HUD sağ grup: tema, ses, geri al, adım ileri, yeniden başlat. */
export function HudControls({
    theme,
    onToggleTheme,
    muted,
    onToggleMute,
    isCompact,
    undoDisabled,
    onUndo,
    stepDisabled,
    onStepForward,
    onRestart,
}: HudControlsProps) {
    const t = useT();

    return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <button
                onClick={onToggleTheme}
                title={`Theme: ${theme === 'neon' ? 'Neon' : 'Classic'}`}
                style={{
                    ...ICON_BUTTON_BASE,
                    background: theme === 'neon' ? 'rgba(0,255,136,0.05)' : 'rgba(0,196,255,0.05)',
                    border: theme === 'neon' ? '1px solid rgba(0,255,136,0.2)' : '1px solid rgba(0,196,255,0.2)',
                    color: theme === 'neon' ? '#00ff88' : '#00c4ff',
                }}
            >
                🎨
            </button>
            <button
                onClick={onToggleMute}
                title={muted ? t('hud.unmute') : t('hud.mute')}
                style={{
                    ...ICON_BUTTON_BASE,
                    background: 'rgba(0,255,136,0.05)',
                    border: '1px solid rgba(0,255,136,0.2)',
                    color: muted ? '#334155' : '#00ff88',
                }}
            >
                {muted ? '🔇' : '🔊'}
            </button>
            <button
                onClick={onUndo}
                disabled={undoDisabled}
                title={t('hud.undo')}
                style={{
                    ...TEXT_BUTTON_BASE,
                    cursor: undoDisabled ? 'not-allowed' : 'pointer',
                    opacity: undoDisabled ? 0.4 : 1,
                }}
            >
                ↩ {!isCompact && t('hud.undo')}
            </button>
            <button
                onClick={onStepForward}
                disabled={stepDisabled}
                title={t('hud.step_forward')}
                style={{
                    ...TEXT_BUTTON_BASE,
                    cursor: stepDisabled ? 'not-allowed' : 'pointer',
                    opacity: stepDisabled ? 0.4 : 1,
                }}
            >
                ↪ {!isCompact && t('hud.step_forward')}
            </button>
            <button
                onClick={onRestart}
                style={{
                    ...TEXT_BUTTON_BASE,
                    cursor: 'pointer',
                }}
            >
                {t('hud.restart')}
            </button>
        </div>
    );
}
