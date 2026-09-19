'use client';

import React, { forwardRef } from 'react';
import { SkipForward, Lock } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import type { StoredLevel, StoredPlayedLevel } from '@/services/db';
import type { LevelThemeDefinition } from '../../themes/types';
import { LevelCellStars } from './LevelCellStars';

type LevelEntry = StoredLevel & { id: number };

export interface LevelCellProps {
  level: LevelEntry;
  index: number;
  isLocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  isSkipped: boolean;
  isSelected: boolean;
  playedData?: StoredPlayedLevel;
  themeDef: LevelThemeDefinition;
  onSelect: () => void;
  onPlay: () => void;
}

export const LevelCell = forwardRef<HTMLButtonElement, LevelCellProps>(function LevelCell(
  {
    level,
    index,
    isLocked,
    isCompleted,
    isCurrent,
    isSkipped,
    isSelected,
    playedData,
    themeDef,
    onSelect,
    onPlay,
  },
  ref,
) {
  const t = useT();
  // Durum stili birleştirme
  const stateStyle = isLocked
    ? themeDef.cell.locked
    : isCurrent
      ? themeDef.cell.current
      : isCompleted
        ? themeDef.cell.completed
        : isSkipped
          ? themeDef.cell.skipped
          : {};

  const focusStyle = isSelected ? themeDef.cell.focused : {};

  const handleClick = () => {
    onSelect();
    if (!isLocked) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
      onPlay();
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      onMouseEnter={onSelect}
      disabled={isLocked}
      aria-label={`${t('levels.level')} ${index + 1}: ${level.name}${isLocked ? ` (${t('levels.locked')})` : ''}`}
      aria-current={isSelected}
      className={`group relative flex flex-col items-center justify-between p-2.5 text-center transition-all duration-200 outline-none select-none ${
        themeDef.fontClass ?? ''
      } ${
        isLocked
          ? 'cursor-not-allowed'
          : 'cursor-pointer active:scale-95'
      }`}
      style={{
        ...themeDef.cell.base,
        ...stateStyle,
        ...focusStyle,
        minHeight: 82,
        willChange: 'transform',
        transform: isSelected ? 'translateZ(0) scale(1.03)' : 'translateZ(0)',
      }}
    >
      {/* Aktif Seviye Pulse Parıltısı (GPU CSS animasyonu) */}
      {isCurrent && (
        <span
          className="pointer-events-none absolute -inset-1 rounded-xl opacity-70 animate-pulse"
          style={{
            border: `2px solid ${themeDef.accentColor}`,
            boxShadow: `0 0 16px ${themeDef.accentGlow}`,
          }}
        />
      )}

      {/* Üst Kısım: Seviye Numarası veya Kilit İkonu */}
      <div className="flex w-full items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider opacity-60">
          #{String(index + 1).padStart(2, '0')}
        </span>

        {isSkipped && (
          <span
            className="flex items-center gap-0.5 rounded px-1 py-0.2 text-[8px] font-extrabold text-amber-400 bg-amber-500/15 border border-amber-500/30"
            title={t('levels.skipped_hint')}
          >
            <SkipForward size={8} strokeWidth={3} />
            {t('levels.skip_short')}
          </span>
        )}
      </div>

      {/* Orta Kısım: Ana Rozet / Numara / Kilit */}
      <div className="my-1 flex items-center justify-center">
        {isLocked ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-slate-500">
            <Lock size={15} strokeWidth={2.4} />
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span
              className={`text-lg font-black leading-none ${
                isCurrent ? 'text-white scale-110 drop-shadow' : ''
              }`}
              style={{
                color: isCurrent ? '#ffffff' : isCompleted ? themeDef.accentColor : undefined,
                textShadow: isCurrent ? `0 0 10px ${themeDef.accentColor}` : undefined,
              }}
            >
              {index + 1}
            </span>
          </div>
        )}
      </div>

      {/* Alt Kısım: Yıldızlar veya Durum */}
      <div className="flex h-4 w-full items-center justify-center">
        {isCompleted ? (
          <LevelCellStars stars={playedData?.stars} themeDef={themeDef} size={11} />
        ) : isCurrent ? (
          <span
            className="text-[9px] font-extrabold uppercase tracking-widest animate-pulse"
            style={{ color: themeDef.accentColor }}
          >
            {t('levels.play_btn')}
          </span>
        ) : isLocked ? (
          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-600">
            {t('levels.locked')}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-slate-400">
            —
          </span>
        )}
      </div>
    </button>
  );
});
