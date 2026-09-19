'use client';

import React from 'react';
import { PlayerGraphic } from '@/game-engine/components/entities/PlayerGraphic';
import { Entity } from '@/game-engine/logic/entityTypes';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';

interface PuzzleMenuPlayerProps {
  activeRowIndex: number;
  totalRows: number;
  slidePhase: 'idle' | 'freeze' | 'sliding' | 'won';
  isMobile: boolean;
  cellSize: number;
  rowGap: number;
  padding: number;
}

export function PuzzleMenuPlayer({
  activeRowIndex,
  slidePhase,
  isMobile,
  cellSize,
  rowGap,
  padding,
}: PuzzleMenuPlayerProps) {
  const { themeConfig } = useGameTheme();

  // Calculate vertical center of the active row
  const top = padding + activeRowIndex * (cellSize + rowGap) + cellSize / 2;

  // Horizontal position: Left dock center vs Right target cell center
  const leftStart = padding + cellSize / 2;
  const isAtTarget = slidePhase === 'sliding' || slidePhase === 'won';

  // Entity configuration for PlayerGraphic
  const playerEntity: Entity = {
    id: 1,
    type: 'player',
    position: { row: activeRowIndex, col: 0 },
    physics: { direction: isAtTarget ? 'right' : 'up', force: 0, z: 0 },
    def: { mass: 1, resistance: 0, isSolid: true },
    traits: new Set(),
    isElectrified: false,
    customData: { playerIndex: 0, mode: 'normal' },
  };

  const scale = isMobile ? 0.65 : 0.75;
  const isMovingHorizontally = slidePhase === 'sliding';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 20,
        overflow: 'visible',
      }}
    >
      {/* Motion & Frost Trail behind player when sliding */}
      {isMovingHorizontally && (
        <div
          style={{
            position: 'absolute',
            top: top - 1.5,
            left: leftStart,
            width: `calc(100% - ${leftStart * 2}px)`,
            height: 3,
            background: `linear-gradient(to right, transparent 0%, ${themeConfig.accentColor}40 40%, #cffafe 85%, #ffffff 100%)`,
            boxShadow: `0 0 10px ${themeConfig.accentColor}70, 0 0 5px #cffafe`,
            borderRadius: 2,
            transformOrigin: 'left center',
            pointerEvents: 'none',
            animation: 'trailGlow 0.35s cubic-bezier(0.22, 0.9, 0.3, 1) forwards',
          }}
        />
      )}

      {/* Main Animated Player Entity */}
      <div
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: isAtTarget ? `calc(100% - ${leftStart}px)` : `${leftStart}px`,
          transform: `translate(-50%, -50%) scale(${scale}) ${
            isMovingHorizontally ? 'skewX(-10deg) scaleX(1.08)' : ''
          }`,
          transition: isMovingHorizontally
            ? 'left 0.32s cubic-bezier(0.22, 0.9, 0.3, 1)'
            : 'top 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.22s ease',
          filter: `drop-shadow(0 0 ${isAtTarget ? '16px' : '10px'} ${themeConfig.accentColor})`,
        }}
      >
        <PlayerGraphic entity={playerEntity} />
      </div>

      <style>{`
        @keyframes trailGlow {
          0% {
            transform: scaleX(0);
            opacity: 0.9;
          }
          65% {
            transform: scaleX(1);
            opacity: 0.75;
          }
          100% {
            transform: scaleX(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
