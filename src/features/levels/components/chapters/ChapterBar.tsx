'use client';

import React, { useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
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
}


/** İlerleme halkalı numara jetonu (sektör rotası boncuğu). */
function SectorRing({
  index, ch, size, active, themeDef,
}: { index: number; ch: ChapterItemData; size: number; active: boolean; themeDef: LevelThemeDefinition }) {
  const accent = themeDef.accentColor;
  const done = ch.maxStars > 0 && ch.earnedStars >= ch.maxStars;
  const ring = ch.maxStars > 0 ? (ch.earnedStars / ch.maxStars) * 100 : 0;
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: ch.isLocked
          ? 'rgba(255,255,255,0.08)'
          : `conic-gradient(${done ? '#facc15' : accent} ${ring}%, rgba(255,255,255,0.14) 0)`,
      }}
    >
      <span
        className="flex items-center justify-center rounded-full font-black tabular-nums"
        style={{
          width: size - 6,
          height: size - 6,
          fontSize: 12,
          background: active ? accent : themeDef.bgDark,
          color: active ? '#030712' : ch.isLocked ? '#64748b' : '#e2e8f0',
        }}
      >
        {ch.isLocked ? <Lock size={12} strokeWidth={2.8} /> : index + 1}
      </span>
    </span>
  );
}

/**
 * Sektör seçici (üst çubuğun ortası): iki satır — aktif sektörün adı + yıldızı, altında
 * yan yana "1 2 3 …" jetonları (her biri ilerleme halkalı, dokununca o sektöre geçer).
 * Sağ/sol ok, klavye ve d-pad aynı geçişi `useCircuitNavigation` üzerinden yapar.
 */
export function ChapterBar({ chapters, selectedChapterId, onSelectChapter, themeDef }: ChapterBarProps) {
  const t = useT();
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const activeIdx = chapters.findIndex((c) => c.id === selectedChapterId);
  const active = chapters[activeIdx];

  // Aktif jetonu şeridin ortasına getir (sayfayı değil, yalnızca şeridi kaydırır)
  useEffect(() => {
    const strip = stripRef.current;
    const chip = activeRef.current;
    if (!strip || !chip) return;
    strip.scrollTo({ left: chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
  }, [selectedChapterId, chapters.length]);

  if (chapters.length === 0 || !active) return null;

  const pill = themeDef.chapterPill;
  const accent = themeDef.accentColor;

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-1">
      <div className="flex max-w-full items-center gap-2">
        <span className={`min-w-0 truncate text-[13px] font-black tracking-wide text-white sm:text-[15px] ${themeDef.fontClass ?? ''}`}>
          {active.name}
        </span>
        {active.isLocked ? (
          <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-black text-amber-400">
            <Lock size={11} strokeWidth={2.6} />
            {active.unlockRequirement}
            <GameIcon name="star" size={11} color="#fbbf24" />
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-black tabular-nums" style={{ color: pill.activeText }}>
            <GameIcon name="star" size={11} color={accent} />
            {active.earnedStars}/{active.maxStars}
          </span>
        )}
      </div>

      <div
        ref={stripRef}
        className="w-full overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex w-max items-center gap-1.5 px-1">
          {chapters.map((ch, idx) => {
            const isActive = ch.id === selectedChapterId;
            return (
              <button
                key={ch.id}
                ref={isActive ? activeRef : null}
                type="button"
                title={ch.name}
                aria-label={`${t('levels.sector_n', { n: idx + 1 })}: ${ch.name}`}
                aria-current={isActive}
                onClick={() => onSelectChapter(ch.id)}
                className="shrink-0 rounded-full outline-none transition-transform duration-200 active:scale-90"
                style={{
                  transform: isActive ? 'scale(1.12)' : undefined,
                  opacity: ch.isLocked && !isActive ? 0.65 : 1,
                  boxShadow: isActive ? `0 0 12px ${themeDef.accentGlow}` : undefined,
                }}
              >
                <SectorRing index={idx} ch={ch} size={28} active={isActive} themeDef={themeDef} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
