/**
 * DOSYA AMACI: Seviye verisinden (LevelData) türetilen hedefler, oyuncular, kutular ve
 * çarpışma durumu istatistiklerini 4'lü kart ızgarasında gösteren sunum bileşeni.
 */

import React from 'react';
import type { LevelData } from '@/game-engine/level-format';
import { useT } from '@/contexts/LanguageContext';
import type { StatCardItem } from '../types';

interface LevelPreviewStatsProps {
  data: LevelData;
  innerRadius: number;
  fontClass?: string;
}

export function LevelPreviewStats({ data, innerRadius, fontClass }: LevelPreviewStatsProps) {
  const t = useT();

  const statCards: StatCardItem[] = [
    {
      label: t('levels.stat_targets') || 'HEDEFLER',
      value: data.targets?.length ?? 0,
      color: '#34d399',
    },
    {
      label: t('levels.stat_players') || 'OYUNCULAR',
      value: data.initialObjects?.length ?? 0,
      color: '#38bdf8',
    },
    {
      label: t('levels.stat_boxes') || 'KUTULAR',
      value: data.initialBoxes?.length ?? 0,
      color: '#fbbf24',
    },
    {
      label: t('levels.stat_collision') || 'ÇARPIŞMA',
      value: data.trailCollision
        ? (t('common.on') || 'AÇIK')
        : (t('common.off') || 'KAPALI'),
      color: data.trailCollision ? '#f43f5e' : '#94a3b8',
      isText: true,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
        textAlign: 'center',
      }}
    >
      {statCards.map((card) => (
        <div
          key={card.label}
          style={{
            borderRadius: innerRadius,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '8px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <span
            style={{
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#64748b',
              fontWeight: 800,
            }}
          >
            {card.label}
          </span>
          <span
            className={fontClass}
            style={{
              fontSize: card.isText ? 12 : 15,
              fontWeight: 900,
              color: card.color,
            }}
          >
            {card.value}
          </span>
        </div>
      ))}
    </div>
  );
}
