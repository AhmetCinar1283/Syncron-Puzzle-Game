'use client';

import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import type { LevelThemeDefinition } from '../themes/types';

export interface LevelsControlBarProps {
  isMobile: boolean;
  themeDef: LevelThemeDefinition;
  canGoPrevSector: boolean;
  canGoNextSector: boolean;
  onPrevSector: () => void;
  onNextSector: () => void;
  onPlay: () => void;
  playDisabled: boolean;
  playLabel: string;
}

/**
 * Kaydırarak/klavye/gamepad ile ulaşılması zahmetli olabilen üç ana eylemi
 * (önceki sektör, seçili seviyeyi oyna, sonraki sektör) her zaman ekranda
 * sabit tutan alt kontrol çubuğu — dokunmatik/mouse kullanıcıları için.
 */
export function LevelsControlBar({
  isMobile,
  themeDef,
  canGoPrevSector,
  canGoNextSector,
  onPrevSector,
  onNextSector,
  onPlay,
  playDisabled,
  playLabel,
}: LevelsControlBarProps) {
  const t = useT();

  return (
    <div
      className="relative z-20 flex shrink-0 items-center justify-center gap-2 border-t border-white/[0.06] bg-black/40 px-3 py-2 backdrop-blur-md"
      style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onPrevSector}
        disabled={!canGoPrevSector}
        title={canGoPrevSector ? t('levels.portal_prev_tooltip') : undefined}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[11px] font-bold tracking-wide text-slate-400 transition-colors hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-slate-400"
      >
        <ChevronLeft size={16} />
        {!isMobile && <span>{t('levels.portal_prev')}</span>}
      </button>

      <button
        type="button"
        onClick={onPlay}
        disabled={playDisabled}
        className="flex min-w-0 flex-1 max-w-[240px] items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-black uppercase tracking-wide text-black shadow-lg transition-transform disabled:cursor-not-allowed disabled:opacity-40 active:not-disabled:scale-95"
        style={{
          background: themeDef.accentColor,
          boxShadow: playDisabled ? 'none' : `0 0 16px ${themeDef.accentGlow}`,
        }}
      >
        {playDisabled ? <Lock size={15} /> : null}
        <span className="truncate">{playLabel}</span>
      </button>

      <button
        type="button"
        onClick={onNextSector}
        disabled={!canGoNextSector}
        title={canGoNextSector ? t('levels.portal_next_tooltip_unlocked') : t('levels.portal_next_tooltip_locked')}
        className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[11px] font-bold tracking-wide text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-30 hover:not-disabled:text-slate-200"
      >
        {!isMobile && <span>{t('levels.portal_next')}</span>}
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
