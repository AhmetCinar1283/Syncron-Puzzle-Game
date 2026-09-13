'use client';

/**
 * DOSYA AMACI: Aktif ipucunun bilgi paneli (board alanının üstünde, ölçeklenmeden):
 * "çözüme N adım kaldı" (gerekirse önce "geri al" / "baştan başla") ve sıradaki
 * en fazla 5 adım. Adımlar basılacak TUŞU gösterir; oyuncunun fiilen gideceği yön
 * (ters mod vb.) board işaretindedir.
 */
import { Lightbulb } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import type { ActiveHint, HintMoveCode } from '../../../hint';
import { HINT_COLOR, HINT_GLOW } from './hintStyles';

const MOVE_GLYPH: Record<HintMoveCode, string> = { u: '↑', d: '↓', l: '←', r: '→', s: '⇄' };

function hintMessage(hint: ActiveHint, t: ReturnType<typeof useT>): string {
    switch (hint.phase) {
        case 'restart':
            return t('hint.banner_restart', { n: hint.stepsRemaining });
        case 'undo':
            return t('hint.banner_undo', { u: hint.undoLeft, n: hint.stepsRemaining });
        case 'moves':
            return t('hint.banner_steps', { n: hint.stepsRemaining });
    }
}

export function HintBanner({ hint }: { hint: ActiveHint }) {
    const t = useT();
    const waiting = hint.phase !== 'moves';

    return (
        <div
            role="status"
            style={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 45,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 5,
                maxWidth: 'calc(100% - 24px)',
                padding: '6px 12px',
                borderRadius: 14,
                background: 'rgba(3, 7, 18, 0.9)',
                border: `1px solid ${HINT_COLOR}80`,
                boxShadow: `0 0 14px ${HINT_GLOW}`,
                color: HINT_COLOR,
                fontSize: 'clamp(11px, 3vw, 13px)',
                fontWeight: 700,
                letterSpacing: '0.02em',
                pointerEvents: 'none',
                boxSizing: 'border-box',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
                <Lightbulb size={14} style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hintMessage(hint, t)}
                </span>
            </div>
            <div aria-label={t('hint.next_steps')} style={{ display: 'flex', gap: 4, opacity: waiting ? 0.45 : 1 }}>
                {hint.moves.map((move, index) => (
                    <span
                        key={`${index}-${move}`}
                        title={move === 's' ? t('hint.step_switch_room') : undefined}
                        style={{
                            minWidth: 22,
                            height: 22,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            lineHeight: 1,
                            color: index === 0 && !waiting ? '#030712' : HINT_COLOR,
                            background: index === 0 && !waiting ? HINT_COLOR : 'rgba(250, 204, 21, 0.08)',
                            border: `1px solid ${HINT_COLOR}66`,
                        }}
                    >
                        {MOVE_GLYPH[move]}
                    </span>
                ))}
            </div>
        </div>
    );
}
