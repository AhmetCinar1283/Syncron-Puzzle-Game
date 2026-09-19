'use client';

import React, { useState } from 'react';
import { GameIcon, IconName } from '@/components/icons';
import { ThemeDefinition } from '@/game-engine/themes/themeConfig';

export interface BoardCellNodeOption {
  id: string;
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
}

interface BoardCellNodeProps {
  option: BoardCellNodeOption;
  isSelected: boolean;
  isLit: boolean;
  isHero: boolean;
  isGamepadConnected: boolean;
  isMobile: boolean;
  inputMode: 'touch' | 'controller';
  themeConfig: ThemeDefinition;
  onSelect: () => void;
}

export function BoardCellNode({
  option,
  isSelected,
  isLit,
  isHero,
  isGamepadConnected,
  isMobile,
  inputMode,
  themeConfig,
  onSelect,
}: BoardCellNodeProps) {
  const [hovered, setHovered] = useState(false);
  const color = option.color;
  const isFocusedInController = inputMode === 'controller' && isSelected;
  const active = isFocusedInController || hovered;

  const getIconName = (): IconName => {
    switch (option.id) {
      case 'play': return 'gamepad';
      case 'daily': return 'star';
      case 'levels': return 'trophy';
      case 'editor': return 'tools';
      case 'friends': return 'friends';
      case 'controls': return 'joystick';
      case 'admin': return 'lightning';
      default: return 'sparkles';
    }
  };

  const getBadgeText = () => {
    if (option.id === 'play') return 'CORE • 1P & 2P';
    if (option.id === 'daily') return 'DAILY';
    return null;
  };

  const badgeText = getBadgeText();

  return (
    <button
      type="button"
      data-cell-id={option.id}
      onClick={() => {
        onSelect();
        option.onClick();
      }}
      onMouseEnter={() => {
        setHovered(true);
        onSelect();
      }}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: isHero ? '1 / -1' : 'span 2',
        minHeight: isHero ? (isMobile ? 86 : 96) : (isMobile ? 74 : 82),
        padding: isMobile ? '10px 12px' : '14px 18px',
        background: active
          ? `linear-gradient(135deg, ${color}35 0%, rgba(10, 18, 35, 0.98) 100%)`
          : isLit
            ? `linear-gradient(135deg, ${color}1a 0%, rgba(8, 14, 28, 0.94) 100%)`
            : 'rgba(8, 14, 28, 0.85)',
        border: active
          ? `2px solid ${color}`
          : isLit
            ? `1.5px solid ${color}80`
            : `1.5px solid ${themeConfig.normalCell.border || 'rgba(255,255,255,0.12)'}`,
        borderRadius: themeConfig.id === 'arcade' ? 0 : isHero ? 12 : 8,
        boxShadow: active
          ? `0 0 24px ${color}60, inset 0 0 14px ${color}25`
          : isLit
            ? `0 4px 16px ${color}20, inset 0 0 8px ${color}10`
            : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 8 : 12,
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        outline: 'none',
        userSelect: 'none',
        transform: active ? 'scale(1.02)' : 'scale(1)',
        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        boxSizing: 'border-box',
      }}
    >
      {/* Decorative Corner Target Marker Ticks */}
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: 4,
          fontSize: 8,
          lineHeight: 1,
          color: active ? color : `${color}60`,
          fontFamily: 'monospace',
          fontWeight: 900,
        }}
      >
        ┌
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 3,
          right: 4,
          fontSize: 8,
          lineHeight: 1,
          color: active ? color : `${color}60`,
          fontFamily: 'monospace',
          fontWeight: 900,
        }}
      >
        ┘
      </div>

      {/* Text Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isFocusedInController && (
            <span style={{ color, fontSize: 10, lineHeight: 1, fontWeight: 900 }}>▶</span>
          )}

          <span
            style={{
              fontSize: isHero ? (isMobile ? 15 : 17) : (isMobile ? 12 : 13.5),
              fontWeight: 900,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#ffffff',
              textShadow: active ? `0 0 10px ${color}` : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {option.label}
          </span>

          {badgeText && (
            <span
              style={{
                fontSize: 8,
                fontWeight: 900,
                letterSpacing: '0.08em',
                background: `${color}25`,
                border: `1px solid ${color}80`,
                color,
                padding: '1px 5px',
                borderRadius: 4,
              }}
            >
              {badgeText}
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: isHero ? (isMobile ? 9.5 : 10.5) : (isMobile ? 8.5 : 9.5),
            fontWeight: 600,
            color: active ? color : '#94a3b8',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {option.sub}
        </span>
      </div>

      {/* Cell Node Icon Box */}
      <div
        style={{
          width: isHero ? (isMobile ? 38 : 44) : (isMobile ? 32 : 36),
          height: isHero ? (isMobile ? 38 : 44) : (isMobile ? 32 : 36),
          borderRadius: themeConfig.id === 'arcade' ? 0 : 8,
          background: active ? `${color}30` : `${color}18`,
          border: `1.5px solid ${active ? color : `${color}55`}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: active ? '#ffffff' : color,
          boxShadow: active ? `0 0 14px ${color}50` : 'none',
          flexShrink: 0,
        }}
      >
        <GameIcon name={getIconName()} size={isHero ? (isMobile ? 20 : 22) : (isMobile ? 16 : 18)} />
      </div>

      {/* Controller Glyphs */}
      {isFocusedInController && (
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: color,
            color: '#000',
            fontSize: 8,
            fontWeight: 900,
            borderRadius: isGamepadConnected ? '50%' : 3,
            width: isGamepadConnected ? 13 : 'auto',
            height: 13,
            padding: isGamepadConnected ? 0 : '0 3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {isGamepadConnected ? 'A' : '↵'}
        </span>
      )}
    </button>
  );
}
