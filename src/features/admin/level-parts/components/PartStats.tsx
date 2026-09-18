'use client';

import { useMemo } from 'react';
import type { LevelOrderEntry } from '@/services/firebase/admin';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/features/editor/lib/editorConfig';

interface PartStatsProps {
  levels: LevelOrderEntry[];
  unlockRequirement: number;
}

export function PartStats({ levels, unlockRequirement }: PartStatsProps) {
  const stats = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let unassigned = 0;

    for (const lvl of levels) {
      if (lvl.difficulty && counts[lvl.difficulty] !== undefined) {
        counts[lvl.difficulty]++;
      } else {
        unassigned++;
      }
    }

    return {
      total: levels.length,
      counts,
      unassigned,
    };
  }, [levels]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {/* Total levels badge */}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#00c4ff',
          background: 'rgba(0, 196, 255, 0.08)',
          border: '1px solid rgba(0, 196, 255, 0.25)',
          borderRadius: 6,
          padding: '2px 7px',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        {stats.total} Bölüm
      </span>

      {/* Difficulty breakdown pills */}
      {([1, 2, 3, 4] as const).map((diff) => {
        const count = stats.counts[diff];
        if (count === 0) return null;
        const color = DIFFICULTY_COLORS[diff];
        const label = DIFFICULTY_LABELS[diff];

        return (
          <span
            key={diff}
            title={`${label}: ${count} seviye`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              color,
              background: `${color}14`,
              border: `1px solid ${color}33`,
              borderRadius: 6,
              padding: '2px 6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                backgroundColor: color,
                display: 'inline-block',
                boxShadow: `0 0 5px ${color}`,
              }}
            />
            {label}: {count}
          </span>
        );
      })}

      {stats.unassigned > 0 && stats.total > stats.unassigned && (
        <span
          title={`Belirtilmemiş zorluk: ${stats.unassigned}`}
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: '#64748b',
            background: 'rgba(100, 116, 139, 0.1)',
            border: '1px solid rgba(100, 116, 139, 0.2)',
            borderRadius: 6,
            padding: '2px 6px',
            whiteSpace: 'nowrap',
          }}
        >
          Diğer: {stats.unassigned}
        </span>
      )}

      {/* Unlock requirement badge */}
      <span
        title={`Açılma Şartı: ${unlockRequirement} seviye`}
        style={{
          fontSize: 10,
          color: '#94a3b8',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          padding: '2px 7px',
          whiteSpace: 'nowrap',
        }}
      >
        🔓 {unlockRequirement > 0 ? `${unlockRequirement} seviye sonra` : 'Başlangıçta açık'}
      </span>
    </div>
  );
}
