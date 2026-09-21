'use client';

import React from 'react';
import type { StoredLevel, StoredPlayedLevel } from '@/services/db';
import { LevelListView } from '../LevelListView';
import { Plus } from 'lucide-react';

type LevelEntry = StoredLevel & { id: number };

export interface CustomLevelsViewProps {
  levels: LevelEntry[];
  isMobile: boolean;
  playedMap: Map<string, StoredPlayedLevel>;
  skippedSet: Set<string>;
  lockedSet: Set<string>;
  selectedIndex: number | null;
  onHover: (index: number) => void;
  onPlay: (level: LevelEntry) => void;
  onEdit: (level: LevelEntry) => void;
  onDelete: (id: number) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onNewLevel: () => void;
  t: (key: string) => string;
}

export function CustomLevelsView({
  levels,
  isMobile,
  playedMap,
  skippedSet,
  lockedSet,
  selectedIndex,
  onHover,
  onPlay,
  onEdit,
  onDelete,
  onMove,
  onNewLevel,
  t,
}: CustomLevelsViewProps) {
  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wide">
            {t('levels.custom')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('levels.custom_subtitle')}
          </p>
        </div>

        <button
          onClick={onNewLevel}
          className="flex items-center gap-1.5 rounded-xl border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 active:scale-95 transition-all shadow-lg"
        >
          <Plus size={14} />
          <span>{t('levels.new')}</span>
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#080c1c]/60 p-3 shadow-2xl backdrop-blur-md">
        <LevelListView
          levels={levels}
          isPreset={false}
          isMobile={isMobile}
          playedMap={playedMap}
          skippedSet={skippedSet}
          lockedSet={lockedSet}
          selectedIndex={selectedIndex}
          onHover={onHover}
          onPlay={onPlay}
          onEdit={onEdit}
          onDelete={(lv) => onDelete(lv.id)}
          onMoveUp={(idx) => onMove(idx, -1)}
          onMoveDown={(idx) => onMove(idx, 1)}
          emptyState={
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-sm font-medium text-slate-400">{t('levels.no_custom')}</p>
              <button
                onClick={onNewLevel}
                className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-cyan-400 hover:bg-cyan-400/20 transition-all shadow-[0_0_16px_rgba(0,196,255,0.2)]"
              >
                <Plus size={15} />
                {t('levels.create_first')}
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
