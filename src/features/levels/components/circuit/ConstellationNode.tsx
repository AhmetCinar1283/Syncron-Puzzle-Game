'use client';

import React, { forwardRef } from 'react';
import { Lock, SkipForward } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import type { StoredLevel, StoredPlayedLevel } from '@/services/db';
import type { LevelThemeDefinition } from '../../themes/types';
import { LevelCellStars } from '../grid/LevelCellStars';

type LevelEntry = StoredLevel & { id: number };

export interface ConstellationNodeProps {
  level: LevelEntry;
  index: number;
  xPercent: number;
  yPx: number;
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

export const ConstellationNode = forwardRef<HTMLButtonElement, ConstellationNodeProps>(
  function ConstellationNode(
    {
      level,
      index,
      xPercent,
      yPx,
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
    const size = 50;

    const handleClick = () => {
      onSelect();
      if (!isLocked) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(12);
        }
        onPlay();
      }
    };

    // Temaya göre düğüm arkaplan ve kenarlık durumları
    const orbStyles = themeDef.nodeOrb;
    const nodeBg = isLocked
      ? orbStyles.lockedBackground
      : isCurrent
        ? `linear-gradient(135deg, ${themeDef.accentColor}33 0%, ${themeDef.bgDark} 100%)`
        : isCompleted
          ? `linear-gradient(135deg, ${themeDef.accentColor}22 0%, #0d1928 100%)`
          : '#0a0f1d';

    const nodeBorder = isLocked
      ? orbStyles.lockedBorder
      : isCurrent
        ? `2px solid ${themeDef.accentColor}`
        : isCompleted
          ? `1.5px solid ${orbStyles.completedBorder}`
          : isSkipped
            ? '1.5px dashed #f59e0b'
            : '1px solid rgba(255,255,255,0.15)';

    const nodeShadow = isLocked
      ? 'none'
      : isCurrent
        ? `0 0 20px ${themeDef.accentGlow}, inset 0 0 10px ${themeDef.accentColor}40`
        : isCompleted
          ? orbStyles.completedGlow
          : '0 4px 12px rgba(0,0,0,0.5)';

    return (
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none"
        style={{
          left: `${xPercent}%`,
          top: `${yPx}px`,
          zIndex: isSelected ? 25 : isCurrent ? 20 : 10,
        }}
      >
        <button
          ref={ref}
          type="button"
          onClick={handleClick}
          onMouseEnter={onSelect}
          disabled={isLocked}
          aria-label={`${t('levels.level')} ${index + 1}: ${level.name}${isLocked ? ` (${t('levels.locked')})` : ''}`}
          aria-current={isSelected}
          className={`group relative flex items-center justify-center rounded-full outline-none transition-all duration-300 ${
            isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-90 hover:scale-105'
          } ${isSelected ? 'scale-110' : ''}`}
          style={{
            width: size,
            height: size,
            background: nodeBg,
            border: nodeBorder,
            boxShadow: nodeShadow,
            willChange: 'transform',
            animation: isCurrent
              ? 'cosmicPulse 2.2s ease-in-out infinite'
              : 'cosmicFloat 3.8s ease-in-out infinite',
            animationDelay: `${(index % 4) * 0.9}s`,
          }}
        >
          {/* Aktif Seviye: Dönen Dış Yörünge Halkası */}
          {isCurrent && (
            <span
              className="pointer-events-none absolute -inset-2.5 rounded-full border border-dashed animate-spin"
              style={{
                borderColor: themeDef.accentColor,
                animationDuration: '10s',
                boxShadow: `0 0 12px ${themeDef.accentGlow}`,
              }}
            />
          )}

          {/* Klavye / Gamepad / Scroll Odak Halkası */}
          {isSelected && (
            <span
              className="pointer-events-none absolute -inset-2.5 rounded-full border-2 animate-pulse"
              style={{
                borderColor: '#ffffff',
                boxShadow: `0 0 18px #ffffff, inset 0 0 10px rgba(255,255,255,0.4)`,
              }}
            />
          )}

          {/* Düğüm İçeriği: Numara veya Kilit */}
          {isLocked ? (
            <Lock size={16} className="text-slate-500" strokeWidth={2.4} />
          ) : (
            <span
              className={`text-sm font-black tabular-nums ${themeDef.fontClass ?? ''}`}
              style={{
                color: isCurrent ? '#ffffff' : isCompleted ? themeDef.accentColor : '#94a3b8',
                textShadow: isCurrent ? `0 0 10px ${themeDef.accentColor}` : undefined,
              }}
            >
              {index + 1}
            </span>
          )}

          {/* Atlanmış Rozeti */}
          {isSkipped && (
            <span
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-black shadow"
              title={t('levels.skipped_hint')}
            >
              <SkipForward size={9} strokeWidth={3} />
            </span>
          )}
        </button>

        {/* Düğüm Altı: Yıldızlar veya "OYNA" Rozeti */}
        <div className="mt-1.5 flex flex-col items-center pointer-events-none min-h-[16px]">
          {isCurrent ? (
            <span
              className="rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-black shadow-lg animate-bounce"
              style={{
                background: themeDef.accentColor,
                boxShadow: `0 0 10px ${themeDef.accentGlow}`,
              }}
            >
              {t('levels.play_btn_upper')}
            </span>
          ) : isCompleted ? (
            <LevelCellStars stars={playedData?.stars} themeDef={themeDef} size={10} />
          ) : null}
        </div>
      </div>
    );
  },
);
