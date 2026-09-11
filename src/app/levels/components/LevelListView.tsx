'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { StoredLevel, StoredPlayedLevel } from '@/services/db';
import { LevelTable } from './LevelTable';
import { LevelRow } from './LevelRow';

type LevelEntry = StoredLevel & { id: number };

export interface LevelListViewProps {
  levels: LevelEntry[];
  isPreset: boolean;
  isAdmin?: boolean;
  isMobile: boolean;
  playedMap: Map<string, StoredPlayedLevel>;
  lockedSet: Set<string>;
  selectedIndex: number | null;
  onHover: (index: number) => void;
  onPlay: (level: LevelEntry) => void;
  onEdit: (level: LevelEntry) => void;
  onDelete: (level: LevelEntry) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  emptyState?: React.ReactNode;
}

/** Campaign-liste ve Custom sekmesi için tek ortak liste görünümü (kod tekrarını önler). */
export function LevelListView({
  levels, isPreset, isAdmin, isMobile, playedMap, lockedSet, selectedIndex,
  onHover, onPlay, onEdit, onDelete, onMoveUp, onMoveDown, emptyState,
}: LevelListViewProps) {
  if (levels.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <LevelTable>
      <AnimatePresence mode="popLayout">
        {levels.map((lv, idx) => {
          const isLocked = isPreset && lv.firestoreId ? lockedSet.has(lv.firestoreId) : false;
          return (
            <motion.div
              key={lv.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: Math.min(idx * 0.03, 0.35) }}
              onMouseEnter={() => onHover(idx)}
            >
              <LevelRow
                level={lv}
                index={idx}
                total={levels.length}
                isPreset={isPreset}
                isAdmin={isAdmin}
                isMobile={isMobile}
                cols=""
                playedLevel={lv.firestoreId ? playedMap.get(lv.firestoreId) : undefined}
                isLocked={isLocked}
                onPlay={() => onPlay(lv)}
                onEdit={() => onEdit(lv)}
                onDelete={() => onDelete(lv)}
                onMoveUp={() => onMoveUp(idx)}
                onMoveDown={() => onMoveDown(idx)}
                gamepadSelected={selectedIndex === idx}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </LevelTable>
  );
}
