/**
 * DOSYA AMACI: Kullanıcının daha önce tamamladığı seviyeler için en iyi derece (hamle sayısı,
 * geçen süre) ve kazanılan yıldız sayısını (1-3) temaya uygun kart içinde gösteren bileşen.
 */

import React from 'react';
import { Award } from 'lucide-react';
import { GameIcon } from '@/components/icons';
import { useT } from '@/contexts/LanguageContext';
import type { StoredPlayedLevel } from '@/services/db';
import { formatDuration } from '../lib/formatDuration';

interface LevelPreviewRecordProps {
  playedData: StoredPlayedLevel;
  radius: number;
  accent: string;
  glow: string;
  isArcade: boolean;
}

export function LevelPreviewRecord({
  playedData,
  radius,
  accent,
  glow,
  isArcade,
}: LevelPreviewRecordProps) {
  const t = useT();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: radius,
        border: `1.5px solid ${accent}45`,
        background: `linear-gradient(135deg, ${accent}15 0%, rgba(15, 23, 42, 0.7) 100%)`,
        padding: '10px 14px',
        boxShadow: `0 0 16px ${glow}20`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: isArcade ? 0 : '50%',
            background: `${accent}25`,
            border: `1px solid ${accent}60`,
          }}
        >
          <Award size={18} style={{ color: accent }} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <span
            style={{
              display: 'block',
              fontSize: 9.5,
              textTransform: 'uppercase',
              fontWeight: 800,
              color: accent,
              letterSpacing: '0.1em',
            }}
          >
            {t('levels.best_record') || 'EN İYİ DERECE'}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
            {playedData.moveCount ?? '?'} {t('game.moves') || 'Hamle'} · {formatDuration(playedData.timeSpent)}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1, 2, 3].map((star) => (
          <GameIcon
            key={star}
            name="star"
            size={16}
            color={star <= (playedData.stars ?? 0) ? '#facc15' : 'rgba(255, 255, 255, 0.15)'}
            style={{
              filter: star <= (playedData.stars ?? 0) ? 'drop-shadow(0 0 6px rgba(250, 204, 21, 0.6))' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}
