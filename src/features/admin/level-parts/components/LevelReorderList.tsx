'use client';

import { Reorder } from 'framer-motion';
import type { LevelOrderEntry } from '@/services/firebase/admin';
import { LevelRow } from './LevelRow';

interface LevelReorderListProps {
  levels: LevelOrderEntry[];
  onReorder: (newLevels: LevelOrderEntry[]) => void;
  onMoveUp: (levelId: string) => void;
  onMoveDown: (levelId: string) => void;
  onEditLevel: (levelId: string) => void;
  onDeleteLevel: (levelId: string) => void;
}

export function LevelReorderList({
  levels,
  onReorder,
  onMoveUp,
  onMoveDown,
  onEditLevel,
  onDeleteLevel,
}: LevelReorderListProps) {
  if (levels.length === 0) {
    return (
      <p style={{ color: '#1e3a5f', fontSize: 11, margin: '4px 0 8px', fontStyle: 'italic' }}>
        No levels yet. Publish a level to this part from the editor.
      </p>
    );
  }

  return (
    <Reorder.Group
      axis="y"
      values={levels}
      onReorder={onReorder}
      style={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {levels.map((entry, idx) => (
        <LevelRow
          key={entry.id}
          entry={entry}
          isFirst={idx === 0}
          isLast={idx === levels.length - 1}
          onMoveUp={() => onMoveUp(entry.id)}
          onMoveDown={() => onMoveDown(entry.id)}
          onEdit={() => onEditLevel(entry.id)}
          onDelete={() => onDeleteLevel(entry.id)}
        />
      ))}
    </Reorder.Group>
  );
}
