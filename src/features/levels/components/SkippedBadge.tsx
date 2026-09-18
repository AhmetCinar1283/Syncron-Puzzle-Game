'use client';

/**
 * DOSYA AMACI: Ödüllü reklamla atlanmış (05) bölüm rozeti — liste satırında ve detay
 * panelinde aynı görsel dil. Atlanan bölüm skor/yıldız taşımaz; rozet bunu vurgular.
 */
import { SkipForward } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';

export const SKIPPED_COLOR = '#a78bfa';

export function SkippedBadge() {
  const t = useT();
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide"
      style={{ color: SKIPPED_COLOR, background: `${SKIPPED_COLOR}14`, border: `1px dashed ${SKIPPED_COLOR}66` }}
      title={t('levels.skipped_hint')}
    >
      <SkipForward size={10} strokeWidth={2.5} />
      {t('levels.skipped')}
    </span>
  );
}
