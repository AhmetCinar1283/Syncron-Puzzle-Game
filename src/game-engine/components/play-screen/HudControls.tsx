'use client';

import type { ReactNode } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { SettingsButton } from '@/features/settings';
import { Undo2, RefreshCw, StepForward } from 'lucide-react';

interface HudControlsProps {
    theme?: string;
    onToggleTheme?: () => void;
    muted?: boolean;
    onToggleMute?: () => void;
    isCompact: boolean;
    undoDisabled: boolean;
    onUndo: () => void;
    stepDisabled: boolean;
    /** Verilmezse "adım ileri" butonu çizilmez (yalnızca editör test modunda verilir). */
    onStepForward?: () => void;
    onRestart: () => void;
    /** "Adım ileri"nin yerine oturan ipucu butonu (yalnızca oyuncu modunda). */
    hintButton?: ReactNode;
    /** Aktif ipucu geri almayı / yeniden başlatmayı öneriyorsa ilgili buton nabız atar. */
    highlight?: 'undo' | 'restart' | null;
}

/**
 * HUD Sağ Buton Grubu:
 * Ayarlar kısayolu (SettingsModal açar) ve Oyun Aksiyonları (Geri Al, İpucu/İleri Adım, Yeniden Başlat).
 * Metin kutuları yerine kısayol destekli, dokunsal, neon siber butonlar.
 */
export function HudControls({
    isCompact,
    undoDisabled,
    onUndo,
    stepDisabled,
    onStepForward,
    onRestart,
    hintButton,
    highlight = null,
}: HudControlsProps) {
    const t = useT();

    const btnSize = isCompact ? 32 : 36;
    const iconSize = isCompact ? 15 : 17;

    return (
        <div style={{ display: 'flex', gap: isCompact ? 5 : 8, alignItems: 'center', flexShrink: 0 }}>
            {/* ── Ayarlar Modalı Butonu ───────────────────────────────── */}
            <SettingsButton isCompact={isCompact} />

            {/* Ayarlar ve Aksiyonlar Arası İnce Bölücü */}
            <div
                style={{
                    width: 1,
                    height: 20,
                    background: 'rgba(255, 255, 255, 0.12)',
                    margin: isCompact ? '0 1px' : '0 4px',
                    flexShrink: 0,
                }}
            />

            {/* ── Oyun Aksiyonları Grubu (Geri Al, İleri Adım, Yeniden Başlat) ─ */}
            {/* Geri Al (Undo) - Z kısayolu */}
            <button
                onClick={onUndo}
                disabled={undoDisabled}
                title={`${t('hud.undo')} (Z)`}
                aria-label={`${t('hud.undo')} (Z)`}
                style={{
                    width: btnSize,
                    height: btnSize,
                    borderRadius: 8,
                    border: '1px solid rgba(0, 196, 255, 0.25)',
                    background: 'rgba(0, 196, 255, 0.05)',
                    color: '#00c4ff',
                    boxShadow: undoDisabled ? 'none' : '0 0 8px rgba(0, 196, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: undoDisabled ? 'not-allowed' : 'pointer',
                    opacity: undoDisabled ? 0.35 : 1,
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    animation: highlight === 'undo' ? HIGHLIGHT_ANIMATION : undefined,
                }}
                onMouseEnter={(e) => {
                    if (undoDisabled) return;
                    e.currentTarget.style.transform = 'scale(1.06)';
                    e.currentTarget.style.borderColor = '#00c4ff';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 196, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(0, 196, 255, 0.25)';
                    e.currentTarget.style.boxShadow = undoDisabled ? 'none' : '0 0 8px rgba(0, 196, 255, 0.12)';
                }}
                onMouseDown={(e) => {
                    if (undoDisabled) return;
                    e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                    if (undoDisabled) return;
                    e.currentTarget.style.transform = 'scale(1.06)';
                }}
            >
                <Undo2 size={iconSize} />
            </button>

            {hintButton}

            {/* Adım İleri (Step Forward) - F kısayolu — yalnızca editör test modu */}
            {onStepForward && (
            <button
                onClick={onStepForward}
                disabled={stepDisabled}
                title={`${t('hud.step_forward')} (F)`}
                aria-label={`${t('hud.step_forward')} (F)`}
                style={{
                    width: btnSize,
                    height: btnSize,
                    borderRadius: 8,
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    background: 'rgba(168, 85, 247, 0.05)',
                    color: '#c084fc',
                    boxShadow: stepDisabled ? 'none' : '0 0 8px rgba(168, 85, 247, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: stepDisabled ? 'not-allowed' : 'pointer',
                    opacity: stepDisabled ? 0.35 : 1,
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                    if (stepDisabled) return;
                    e.currentTarget.style.transform = 'scale(1.06)';
                    e.currentTarget.style.borderColor = '#c084fc';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(168, 85, 247, 0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.25)';
                    e.currentTarget.style.boxShadow = stepDisabled ? 'none' : '0 0 8px rgba(168, 85, 247, 0.12)';
                }}
                onMouseDown={(e) => {
                    if (stepDisabled) return;
                    e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                    if (stepDisabled) return;
                    e.currentTarget.style.transform = 'scale(1.06)';
                }}
            >
                <StepForward size={iconSize} />
            </button>
            )}

            {/* Yeniden Başlat (Restart) - R kısayolu */}
            <button
                onClick={onRestart}
                title={`${t('hud.restart')} (R)`}
                aria-label={`${t('hud.restart')} (R)`}
                style={{
                    width: btnSize,
                    height: btnSize,
                    borderRadius: 8,
                    border: '1px solid rgba(251, 146, 60, 0.35)',
                    background: 'rgba(251, 146, 60, 0.08)',
                    color: '#fb923c',
                    boxShadow: '0 0 8px rgba(251, 146, 60, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    animation: highlight === 'restart' ? HIGHLIGHT_ANIMATION : undefined,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.06)';
                    e.currentTarget.style.borderColor = '#fb923c';
                    e.currentTarget.style.boxShadow = '0 0 14px rgba(251, 146, 60, 0.35)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = 'rgba(251, 146, 60, 0.35)';
                    e.currentTarget.style.boxShadow = '0 0 8px rgba(251, 146, 60, 0.15)';
                }}
                onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1.06)';
                }}
            >
                <RefreshCw size={iconSize} />
            </button>
        </div>
    );
}

/** İpucu vurgusu — keyframes: hint/hintStyles.ts (PlayScreen ipucu aktifken ekler). */
const HIGHLIGHT_ANIMATION = 'hint-button-pulse 1.1s ease-out infinite';
