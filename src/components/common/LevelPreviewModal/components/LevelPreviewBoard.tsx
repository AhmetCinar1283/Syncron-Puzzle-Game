/**
 * DOSYA AMACI: Seviyenin mini harita önizlemesini (LevelMiniPreview), CRT tarama çizgisi
 * efektli ve temaya uygun parlak çerçeveli ekran kutusu içerisinde render eden bileşen.
 */

import React from 'react';
import type { LevelData } from '@/game-engine/level-format';
import LevelMiniPreview from '@/game-engine/components/LevelMiniPreview';

interface LevelPreviewBoardProps {
  level: LevelData;
  radius: number;
  accent: string;
  glow: string;
  boardBg: string;
  isArcade: boolean;
}

export function LevelPreviewBoard({
  level,
  radius,
  accent,
  glow,
  boardBg,
  isArcade,
}: LevelPreviewBoardProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 10px',
        borderRadius: radius,
        border: `1.5px solid ${accent}30`,
        background: boardBg,
        boxShadow: `inset 0 0 26px rgba(0, 0, 0, 0.8), 0 0 14px ${glow}15`,
        minHeight: 175,
        overflow: 'hidden',
      }}
    >
      {/* Statik CRT tarama çizgileri */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.22) 50%)',
          backgroundSize: '100% 4px',
          opacity: isArcade ? 0.35 : 0.12,
          zIndex: 2,
        }}
      />
      <div style={{ position: 'relative', zIndex: 3 }}>
        <LevelMiniPreview level={level} maxBoardSize={250} />
      </div>
    </div>
  );
}
