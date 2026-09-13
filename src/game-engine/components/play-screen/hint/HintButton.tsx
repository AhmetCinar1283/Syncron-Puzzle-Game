'use client';

/**
 * DOSYA AMACI: HUD'daki ipucu butonu. Ödülün nasıl kazanıldığını (reklam,
 * ücretsiz hak) bilmez; çağıranın verdiği küçük rozeti gösterir.
 */
import type { ReactNode } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { HINT_COLOR, HINT_GLOW } from './hintStyles';

interface HintButtonProps {
    isCompact: boolean;
    disabled: boolean;
    busy: boolean;
    /** Butonun köşesindeki küçük rozet (ör. reklam ikonu ya da kalan hak). */
    badge?: ReactNode;
    onClick: () => void;
}

export function HintButton({ isCompact, disabled, busy, badge, onClick }: HintButtonProps) {
    const t = useT();
    const size = isCompact ? 32 : 36;
    const inactive = disabled || busy;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={inactive}
            title={`${t('hint.button')} (H)`}
            aria-label={t('hint.button')}
            style={{
                position: 'relative',
                width: size,
                height: size,
                borderRadius: 8,
                border: `1px solid ${HINT_COLOR}55`,
                background: 'rgba(250, 204, 21, 0.06)',
                color: HINT_COLOR,
                boxShadow: inactive ? 'none' : `0 0 8px ${HINT_GLOW}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inactive ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.35 : 1,
                transition: 'all 0.15s ease',
                flexShrink: 0,
            }}
        >
            {busy
                ? <Loader2 size={isCompact ? 15 : 17} style={{ animation: 'hint-spin 1s linear infinite' }} />
                : <Lightbulb size={isCompact ? 15 : 17} />}
            {badge !== undefined && badge !== null && !busy && (
                <span style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    minWidth: 14,
                    height: 14,
                    padding: '0 3px',
                    borderRadius: 7,
                    background: HINT_COLOR,
                    color: '#030712',
                    fontSize: 9,
                    fontWeight: 800,
                    lineHeight: '14px',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                }}>
                    {badge}
                </span>
            )}
        </button>
    );
}
