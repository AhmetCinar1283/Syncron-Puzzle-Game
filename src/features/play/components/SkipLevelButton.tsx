'use client';

/**
 * DOSYA AMACI: Oyuncu takıldığında board alanının altında beliren "Level'ı atla"
 * butonu (05). Görünürlük kararı `usePlaySkip`'tedir; bu bileşen yalnızca çizer.
 */
import { motion } from 'framer-motion';
import { Clapperboard, SkipForward } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';

const ACCENT = '#a78bfa';

interface SkipLevelButtonProps {
    busy: boolean;
    onClick: () => void;
}

export function SkipLevelButton({ busy, onClick }: SkipLevelButtonProps) {
    const t = useT();
    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, y: 12, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={onClick}
            disabled={busy}
            // Board alanı swipe'ı yakalar; butona dokunuş hamle sayılmasın.
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label={t('skip.button')}
            style={{
                position: 'absolute',
                left: '50%',
                bottom: 12,
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                background: 'rgba(4, 9, 20, 0.92)',
                border: `1px solid ${ACCENT}80`,
                boxShadow: `0 0 18px ${ACCENT}33`,
                color: ACCENT,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                cursor: busy ? 'wait' : 'pointer',
                touchAction: 'manipulation',
            }}
        >
            <SkipForward size={14} strokeWidth={2.5} />
            {t('skip.button')}
            <Clapperboard size={12} style={{ opacity: 0.7 }} />
        </motion.button>
    );
}
