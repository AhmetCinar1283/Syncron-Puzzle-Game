/**
 * DOSYA AMACI: LevelPreviewModal için başlık, durum ikonu ve alt bilgi (zorluk rozeti,
 * harita boyutları/oda sayısı, atlandı durumu ve yapımcı adı) bölümlerini render eden sunum bileşeni.
 */

import React from 'react';
import { User } from 'lucide-react';
import { GameIcon } from '@/components/icons';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/features/editor';
import { useT } from '@/contexts/LanguageContext';
import type { StoredPlayedLevel } from '@/services/db';

interface LevelPreviewHeaderProps {
  displayName: string;
  position?: number;
  partName?: string;
  difficulty?: 1 | 2 | 3 | 4;
  dimensionsLabel: string;
  creator?: string;
  isSkipped?: boolean;
  isLocked?: boolean;
  playedData?: StoredPlayedLevel;
  accent: string;
  glow: string;
  isArcade: boolean;
}

export function LevelPreviewHeader({
  displayName,
  position,
  partName,
  difficulty,
  dimensionsLabel,
  creator,
  isSkipped,
  isLocked,
  playedData,
  accent,
  glow,
  isArcade,
}: LevelPreviewHeaderProps) {
  const t = useT();

  const difficultyColor = difficulty ? DIFFICULTY_COLORS[difficulty] : accent;
  const difficultyLabel = difficulty ? DIFFICULTY_LABELS[difficulty] : null;

  const titleNode = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      {position !== undefined && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          {t('levels.level_n', { n: position + 1 }) || `SEVİYE ${position + 1}`}
          {partName ? ` · ${partName}` : ''}
        </span>
      )}
      <span
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: '#ffffff',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayName}
      </span>
    </div>
  );

  const iconNode = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: isArcade ? 0 : 8,
        background: `linear-gradient(135deg, ${accent}25 0%, rgba(255, 255, 255, 0.03) 100%)`,
        border: `1.5px solid ${accent}60`,
        boxShadow: `0 0 12px ${glow}30`,
        flexShrink: 0,
      }}
    >
      <GameIcon
        name={isLocked ? 'lock' : playedData ? 'star' : 'gamepad'}
        size={18}
        color={isLocked ? '#94a3b8' : accent}
      />
    </div>
  );

  const subtitleNode = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
      {difficultyLabel && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: isArcade ? 0 : 6,
            background: `${difficultyColor}18`,
            border: `1px solid ${difficultyColor}50`,
            color: difficultyColor,
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {difficultyLabel}
        </span>
      )}
      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>{dimensionsLabel}</span>
      {isSkipped && !playedData && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '2px 6px',
            borderRadius: isArcade ? 0 : 6,
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            color: '#fbbf24',
            fontSize: 10,
            fontWeight: 800,
          }}
        >
          {t('levels.skipped') || 'Atlandı'}
        </span>
      )}
      {creator && (
        <span style={{ color: '#64748b', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <User size={11} /> {creator}
        </span>
      )}
    </div>
  );

  return { titleNode, iconNode, subtitleNode };
}
