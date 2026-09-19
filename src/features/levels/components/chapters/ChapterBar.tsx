'use client';

import React, { useRef, useEffect } from 'react';
import { Lock, Crosshair } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import type { LevelThemeDefinition } from '../../themes/types';

export interface ChapterItemData {
  id: string;
  name: string;
  total: number;
  completed: number;
  earnedStars: number;
  maxStars: number;
  isLocked: boolean;
  unlockRequirement: number;
}

export interface ChapterBarProps {
  chapters: ChapterItemData[];
  selectedChapterId: string;
  onSelectChapter: (id: string) => void;
  themeDef: LevelThemeDefinition;
  isGamepadConnected: boolean;
  onJumpToCurrent?: () => void;
}

export function ChapterBar({
  chapters,
  selectedChapterId,
  onSelectChapter,
  themeDef,
  isGamepadConnected,
  onJumpToCurrent,
}: ChapterBarProps) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);

  // Aktif chapter değiştiğinde görünür alana ortala
  useEffect(() => {
    activeBtnRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedChapterId]);

  if (chapters.length === 0) return null;

  const pillStyles = themeDef.chapterPill;

  return (
    <div className="relative z-20 flex w-full items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.06] bg-black/40 backdrop-blur-md">
      {/* Gamepad L1 ipucu */}
      {isGamepadConnected && (
        <span className="hidden sm:flex shrink-0 items-center justify-center px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-[9px] font-black text-slate-300">
          LB / L1
        </span>
      )}

      {/* Yatay Kaydırılabilir Chapter Kapsülleri */}
      <div
        ref={containerRef}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chapters.map((ch, idx) => {
          const isActive = ch.id === selectedChapterId;
          const pct = ch.maxStars > 0 ? (ch.earnedStars / ch.maxStars) * 100 : 0;

          return (
            <button
              key={ch.id}
              ref={isActive ? activeBtnRef : null}
              onClick={() => onSelectChapter(ch.id)}
              className="group relative flex shrink-0 flex-col gap-0.5 rounded-xl px-3 py-1.5 text-left transition-all duration-200 outline-none select-none"
              style={{
                background: isActive ? pillStyles.activeBg : pillStyles.inactiveBg,
                border: `1px solid ${isActive ? pillStyles.activeBorder : pillStyles.inactiveBorder}`,
                color: isActive ? pillStyles.activeText : pillStyles.inactiveText,
                minWidth: 120,
              }}
            >
              {/* Bölüm Başlığı & Kilit Durumu */}
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">
                  {t('levels.sector_n', { n: idx + 1 })}
                </span>
                {ch.isLocked ? (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400">
                    <Lock size={10} strokeWidth={2.5} />
                    {ch.unlockRequirement} ⭐
                  </span>
                ) : (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold tabular-nums">
                    <GameIcon name="star" size={9} color={isActive ? pillStyles.activeText : '#64748b'} />
                    {ch.earnedStars}/{ch.maxStars}
                  </span>
                )}
              </div>

              {/* Bölüm Adı */}
              <span className="truncate text-xs font-black tracking-wide text-white">
                {ch.name}
              </span>

              {/* Alt İlerleme Çizgisi */}
              {!ch.isLocked && ch.maxStars > 0 && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      background: pillStyles.progressBar,
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Gamepad R1 ipucu */}
      {isGamepadConnected && (
        <span className="hidden sm:flex shrink-0 items-center justify-center px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-[9px] font-black text-slate-300">
          RB / R1
        </span>
      )}

      {/* Kaldığın Seviyeye Odaklan Butonu */}
      {onJumpToCurrent && (
        <button
          onClick={onJumpToCurrent}
          title={t('levels.focus_current_hint')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.05] text-white hover:bg-white/[0.1] active:scale-95 transition-all outline-none"
          style={{
            borderColor: themeDef.accentColor,
            color: themeDef.accentColor,
          }}
        >
          <Crosshair size={16} />
        </button>
      )}
    </div>
  );
}
