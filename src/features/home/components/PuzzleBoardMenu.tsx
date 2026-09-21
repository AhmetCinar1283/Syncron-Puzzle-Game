'use client';

import React, { useRef, useEffect } from 'react';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useT } from '@/contexts/LanguageContext';
import { PuzzleMenuOption, PuzzleMenuLane } from './PuzzleMenuLane';
import { PuzzleMenuPlayer } from './PuzzleMenuPlayer';
import { PuzzleWinBurst } from './PuzzleWinBurst';
import { GameIcon } from '@/components/icons';
import { soundEngine } from '@/services/audio';

interface PuzzleBoardMenuProps {
  options: PuzzleMenuOption[];
  activeMenuIndex: number;
  setActiveMenuIndex: (index: number) => void;
  slidePhase: 'idle' | 'freeze' | 'sliding' | 'won';
  isSliding: boolean;
  triggerSlideAndNavigate: (index: number) => void;
  inputMode: 'touch' | 'controller';
  isConnected: boolean;
  isMobile: boolean;
  lastPlayedLevelId?: string | null;
  onOpenThemeModal: () => void;
}

export function PuzzleBoardMenu({
  options,
  activeMenuIndex,
  setActiveMenuIndex,
  slidePhase,
  isSliding,
  triggerSlideAndNavigate,
  inputMode,
  isConnected,
  isMobile,
  lastPlayedLevelId,
  onOpenThemeModal,
}: PuzzleBoardMenuProps) {
  const t = useT();
  const { theme, themeConfig } = useGameTheme();
  const boardRef = useRef<HTMLDivElement | null>(null);

  const cellSize = isMobile ? 42 : 48;
  const rowGap = isMobile ? 6 : 8;
  const padding = isMobile ? 8 : 10;

  const laneRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Smart safety net: Smoothly scroll selected lane into view if screen is short/narrow
  useEffect(() => {
    if (activeMenuIndex >= 0 && activeMenuIndex < options.length) {
      const el = laneRefs.current[activeMenuIndex];
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    } else if (activeMenuIndex === -1) {
      document.getElementById('user-profile-badge')?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [activeMenuIndex, options.length]);

  const handleSelect = (index: number) => {
    if (isSliding) return;
    if (activeMenuIndex !== index) {
      setActiveMenuIndex(index);
      soundEngine.playMenu('ui.tick');
    }
  };

  const isArcade = theme === 'arcade';

  // Target burst coordinates
  const winBurstTop = padding + activeMenuIndex * (cellSize + rowGap) + cellSize / 2;
  const winBurstLeft = `calc(100% - ${padding + cellSize / 2}px)`;

  return (
    <div
      ref={boardRef}
      style={{
        width: '100%',
        maxWidth: 520,
        background: themeConfig.board.background || '#070e1c',
        border: `2px solid ${themeConfig.accentColor}80`,
        borderRadius: isArcade ? 0 : 16,
        boxShadow: `0 0 32px ${themeConfig.accentGlow}, inset 0 0 24px rgba(0,0,0,0.85)`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {/* Scanline CRT texture overlay for Arcade / Retro feel */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%)',
          backgroundSize: '100% 4px',
          pointerEvents: 'none',
          opacity: isArcade ? 0.4 : 0.12,
          zIndex: 15,
        }}
      />

      {/* ── STAGE HUD HEADER ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '8px 12px' : '10px 16px',
          borderBottom: `1px solid ${themeConfig.accentColor}30`,
          background: 'rgba(0, 0, 0, 0.45)',
          fontSize: isMobile ? 10 : 11,
          fontFamily: isArcade ? 'monospace' : 'inherit',
          letterSpacing: '0.08em',
          fontWeight: 700,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: themeConfig.accentColor }}>
          <span
            style={{
              display: 'inline-block',
              width: 7,
              height: 7,
              borderRadius: isArcade ? 0 : '50%',
              backgroundColor: themeConfig.accentColor,
              boxShadow: `0 0 8px ${themeConfig.accentColor}`,
            }}
          />
          <span>SYNCRON // STAGE 00</span>
        </div>

        {/* Quick Theme Switcher Button */}
        <button
          type="button"
          onClick={onOpenThemeModal}
          title={t('home.change_theme')}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${themeConfig.accentColor}60`,
            borderRadius: isArcade ? 0 : 6,
            color: themeConfig.accentColor,
            padding: '3px 9px',
            fontSize: isMobile ? 9 : 10,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'all 0.15s ease',
            outline: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${themeConfig.accentColor}25`;
            e.currentTarget.style.borderColor = themeConfig.accentColor;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = `${themeConfig.accentColor}60`;
          }}
        >
          <GameIcon name="palette" size={12} color={themeConfig.accentColor} />
          <span>{t(themeConfig.nameKey) || themeConfig.defaultName}</span>
        </button>
      </div>

      {/* ── PUZZLE LANES STAGE (The Board IS The Menu) ── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: rowGap,
          padding: `${padding}px`,
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {options.map((option, idx) => (
          <div
            key={option.id}
            ref={(el) => {
              laneRefs.current[idx] = el;
            }}
            style={{ width: '100%' }}
          >
            <PuzzleMenuLane
              option={option}
              index={idx}
              isSelected={activeMenuIndex === idx}
              isFrozen={isSliding && activeMenuIndex === idx}
              isSliding={isSliding}
              isMobile={isMobile}
              cellSize={cellSize}
              themeConfig={themeConfig}
              theme={theme}
              onSelect={() => handleSelect(idx)}
              onTrigger={() => triggerSlideAndNavigate(idx)}
            />
          </div>
        ))}

        {/* Sliding Player Layer */}
        <PuzzleMenuPlayer
          activeRowIndex={activeMenuIndex}
          totalRows={options.length}
          slidePhase={slidePhase}
          isMobile={isMobile}
          cellSize={cellSize}
          rowGap={rowGap}
          padding={padding}
        />

        {/* Level Win Explosion Effect upon reaching target cell */}
        {slidePhase === 'won' && (
          <PuzzleWinBurst top={winBurstTop} left={winBurstLeft} />
        )}
      </div>

      {/* ── FOOTER HINT BAR ── */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: `1px solid ${themeConfig.accentColor}20`,
          background: 'rgba(0, 0, 0, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 9.5,
          color: '#64748b',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isConnected && (
            <>
              <GameIcon name="gamepad" size={11} color={themeConfig.accentColor} />
              <span style={{ color: themeConfig.accentColor, fontWeight: 700 }}>Gamepad</span>
              <span style={{ color: '#334155' }}>•</span>
            </>
          )}
          <span style={{ color: themeConfig.accentColor }}>[↑/↓]</span>
          <span>{inputMode === 'controller' ? t('home.guide_navigate') : t('home.guide_select')}</span>
          <span style={{ color: '#334155' }}>•</span>
          <span style={{ color: themeConfig.accentColor }}>[ENTER / (A)]</span>
          <span>{t('home.guide_slide_go')}</span>
        </div>

        {lastPlayedLevelId && (
          <span style={{ color: `${themeConfig.accentColor}90`, fontWeight: 700 }}>
            {t('home.resume_level', { id: lastPlayedLevelId })}
          </span>
        )}
      </div>
    </div>
  );
}
