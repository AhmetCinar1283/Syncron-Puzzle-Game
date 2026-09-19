'use client';

import React, { useRef, useEffect } from 'react';
import { useT } from '@/contexts/LanguageContext';
import type { StoredLevel, StoredPlayedLevel } from '@/services/db';
import type { LevelThemeDefinition } from '../../themes/types';
import { LevelCell } from './LevelCell';

type LevelEntry = StoredLevel & { id: number };

export interface SectorGridProps {
  levels: LevelEntry[];
  lockedSet: Set<string>;
  playedMap: Map<string, StoredPlayedLevel>;
  skippedSet: Set<string>;
  selectedIndex: number | null;
  defaultActiveIndex: number;
  themeDef: LevelThemeDefinition;
  columns: number;
  onSelect: (index: number) => void;
  onPlay: (level: LevelEntry) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function SectorGrid({
  levels,
  lockedSet,
  playedMap,
  skippedSet,
  selectedIndex,
  defaultActiveIndex,
  themeDef,
  columns,
  onSelect,
  onPlay,
  containerRef,
}: SectorGridProps) {
  const t = useT();
  const cellRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Seçili hücre veya ilk yüklenen aktif seviye görünür alana yumuşakça kaydırılsın
  useEffect(() => {
    const targetIdx = selectedIndex ?? defaultActiveIndex;
    if (targetIdx === null || targetIdx === undefined) return;
    const el = cellRefs.current.get(targetIdx);
    el?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [selectedIndex, defaultActiveIndex]);

  if (levels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
        <p className="text-sm font-bold">{t('levels.no_levels_in_sector')}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full flex-1 overflow-y-auto px-3 sm:px-6 py-4 [scrollbar-width:thin]"
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        className="mx-auto grid gap-2.5 sm:gap-3.5 max-w-5xl"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {levels.map((lv, idx) => {
          const isLocked = lv.firestoreId ? lockedSet.has(lv.firestoreId) : false;
          const isCompleted = lv.firestoreId ? playedMap.has(lv.firestoreId) : false;
          const isSkipped = !isCompleted && !!lv.firestoreId && skippedSet.has(lv.firestoreId);
          const isCurrent = idx === defaultActiveIndex && !isLocked && !isCompleted && !isSkipped;
          const playedData = lv.firestoreId ? playedMap.get(lv.firestoreId) : undefined;
          const isSelected = selectedIndex === idx;

          return (
            <LevelCell
              key={lv.id}
              ref={(el) => {
                if (el) cellRefs.current.set(idx, el);
                else cellRefs.current.delete(idx);
              }}
              level={lv}
              index={idx}
              isLocked={isLocked}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isSkipped={isSkipped}
              isSelected={isSelected}
              playedData={playedData}
              themeDef={themeDef}
              onSelect={() => onSelect(idx)}
              onPlay={() => onPlay(lv)}
            />
          );
        })}
      </div>
    </div>
  );
}
