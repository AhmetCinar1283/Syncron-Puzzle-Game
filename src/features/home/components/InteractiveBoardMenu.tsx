'use client';

import React from 'react';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { BoardInfoTicker } from './BoardInfoTicker';
import { BoardCellNode, BoardCellNodeOption } from './BoardCellNode';
import { BoardPlayerLayer } from './BoardPlayerLayer';
import { assetUrl } from '@/lib/assetUrl';

interface InteractiveBoardMenuProps {
  options: BoardCellNodeOption[];
  activeMenuIndex: number;
  setActiveMenuIndex: (index: number) => void;
  inputMode: 'touch' | 'controller';
  isConnected: boolean;
  isMobile: boolean;
  lastPlayedLevelId?: string | null;
}

export function InteractiveBoardMenu({
  options,
  activeMenuIndex,
  setActiveMenuIndex,
  inputMode,
  isConnected,
  isMobile,
  lastPlayedLevelId,
}: InteractiveBoardMenuProps) {
  const { theme, themeConfig } = useGameTheme();
  const optionIds = options.map((opt) => opt.id);
  const activeOption = options[activeMenuIndex] || options[0];
  const activeOptionId = activeOption?.id || 'play';

  const handleSelect = (index: number) => {
    if (activeMenuIndex !== index) {
      setActiveMenuIndex(index);
      try {
        new Audio(assetUrl('/sounds/tick.mp3')).play().catch(() => {});
      } catch {
        // Audio playback catch
      }
    }
  };

  const isArcade = theme === 'arcade';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 500,
        background: themeConfig.board.background || '#070e1c',
        border: `2px solid ${themeConfig.accentColor}70`,
        borderRadius: isArcade ? 0 : 16,
        boxShadow: `0 0 28px ${themeConfig.accentGlow}, inset 0 0 20px rgba(0,0,0,0.85)`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {/* Subtle Scanline / CRT Screen Texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.22) 50%)',
          backgroundSize: '100% 4px',
          pointerEvents: 'none',
          opacity: isArcade ? 0.35 : 0.12,
          zIndex: 8,
        }}
      />

      {/* Board Mission & Status Ticker */}
      <BoardInfoTicker
        activeOptionId={activeOptionId}
        themeConfig={themeConfig}
        lastPlayedLevelId={lastPlayedLevelId}
        isMobile={isMobile}
      />

      {/* Grid Stage: Stations & Floating Synchronized Players */}
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: isMobile ? 8 : 10,
          padding: isMobile ? '10px 8px 12px' : '14px 12px 16px',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {options.map((opt, idx) => (
          <BoardCellNode
            key={opt.id}
            option={opt}
            isSelected={activeMenuIndex === idx}
            isLit={inputMode === 'touch' || activeMenuIndex === idx}
            isHero={opt.id === 'play'}
            isGamepadConnected={isConnected}
            isMobile={isMobile}
            inputMode={inputMode}
            themeConfig={themeConfig}
            onSelect={() => handleSelect(idx)}
          />
        ))}

        {/* Synchronized Player Entities moving over the board */}
        <BoardPlayerLayer
          activeOptionId={activeOptionId}
          optionIds={optionIds}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}
