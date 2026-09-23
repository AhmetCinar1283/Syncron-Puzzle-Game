/**
 * DOSYA AMACI: Seviyeye ait tasarımcı veya oyun notlarını (gameNotes / creatorNotes)
 * gösteren sunum kartı bileşeni.
 */

import React from 'react';
import { useT } from '@/contexts/LanguageContext';

interface LevelPreviewNotesProps {
  notes?: string;
  radius: number;
  accent: string;
}

export function LevelPreviewNotes({ notes, radius, accent }: LevelPreviewNotesProps) {
  const t = useT();

  if (!notes) return null;

  return (
    <div
      style={{
        borderRadius: radius,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.5)',
        padding: '10px 12px',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          display: 'block',
          fontWeight: 800,
          color: accent,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 4,
        }}
      >
        {t('levels.level_notes') || 'Bölüm Notu'}
      </span>
      <p style={{ margin: 0, fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5 }}>
        {notes}
      </p>
    </div>
  );
}
