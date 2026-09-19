'use client';

import React from 'react';
import { useT } from '@/contexts/LanguageContext';
import { GameIcon, IconName } from '@/components/icons';
import { ThemeDefinition, GameTheme } from '@/game-engine/themes/themeConfig';

export interface PuzzleMenuOption {
  id: string;
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
}

interface PuzzleMenuLaneProps {
  option: PuzzleMenuOption;
  index: number;
  isSelected: boolean;
  isFrozen: boolean;
  isSliding: boolean;
  isMobile: boolean;
  cellSize?: number;
  themeConfig: ThemeDefinition;
  theme: GameTheme;
  onSelect: () => void;
  onTrigger: () => void;
}

export function PuzzleMenuLane({
  option,
  isSelected,
  isFrozen,
  isSliding,
  isMobile,
  cellSize: propCellSize,
  themeConfig,
  theme,
  onSelect,
  onTrigger,
}: PuzzleMenuLaneProps) {
  const t = useT();
  const color = option.color || themeConfig.accentColor;
  const isArcade = theme === 'arcade';
  const isBlueprint = theme === 'blueprint';
  const isCosmic = theme === 'cosmic';

  const getIconName = (): IconName => {
    switch (option.id) {
      case 'play': return 'gamepad';
      case 'daily': return 'star';
      case 'levels': return 'trophy';
      case 'editor': return 'tools';
      case 'theme': return 'palette';
      case 'friends': return 'friends';
      case 'controls': return 'joystick';
      case 'admin': return 'lightning';
      default: return 'sparkles';
    }
  };

  const getBadgeText = () => {
    if (option.id === 'play') return '1P & 2P';
    if (option.id === 'daily') return t('home.badge_daily');
    if (option.id === 'theme') return t('home.badge_theme');
    if (option.id === 'editor') return 'PRO';
    return null;
  };

  const badgeText = getBadgeText();
  const cellSize = propCellSize || (isMobile ? 42 : 48);

  // Ice styling based on theme
  let iceBackground = 'linear-gradient(135deg, rgba(165,243,252,0.35) 0%, rgba(147,210,255,0.18) 100%)';
  let iceBorder = '1.5px solid rgba(165,243,252,0.85)';
  let iceGlow = '0 0 20px rgba(165,243,252,0.4), inset 0 0 14px rgba(255,255,255,0.3)';

  if (isArcade) {
    iceBackground = '#0f172a';
    iceBorder = '2px solid #38bdf8';
    iceGlow = 'inset 2px 2px 0 #7dd3fc, inset -2px -2px 0 #0284c7';
  } else if (isCosmic) {
    iceBackground = 'linear-gradient(135deg, rgba(167,139,250,0.32) 0%, rgba(100,70,160,0.18) 100%)';
    iceBorder = '1.5px solid #ddd6fe';
    iceGlow = '0 0 16px rgba(167,139,250,0.45), inset 0 0 12px rgba(167,139,250,0.2)';
  } else if (isBlueprint) {
    iceBackground = 'rgba(56,189,248,0.2)';
    iceBorder = '1.5px dashed #bae6fd';
    iceGlow = 'inset 0 0 10px rgba(56,189,248,0.3)';
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isSliding) return;
        if (!isSelected) {
          onSelect();
        }
        onTrigger();
      }}
      onMouseEnter={() => {
        if (!isSliding && !isSelected) {
          onSelect();
        }
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: `${cellSize}px 1fr ${cellSize}px`,
        gap: isMobile ? 6 : 8,
        height: cellSize,
        width: '100%',
        alignItems: 'center',
        position: 'relative',
        cursor: isSliding ? 'default' : 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        outline: 'none',
        transition: 'transform 0.15s ease',
      }}
    >
      {/* ── 1. LEFT CELL: DOCK / SPAWN CELL ── */}
      <div
        style={{
          width: cellSize,
          height: cellSize,
          background: isSelected
            ? `linear-gradient(135deg, ${color}28 0%, ${themeConfig.normalCell.background} 100%)`
            : themeConfig.normalCell.background,
          border: isSelected ? `2px solid ${color}` : themeConfig.normalCell.border,
          borderRadius: isArcade ? 0 : isBlueprint ? 2 : 8,
          boxShadow: isSelected
            ? `0 0 16px ${color}60, inset 0 0 10px ${color}30`
            : themeConfig.normalCell.boxShadow || 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Dock Guide Marker */}
        <div
          style={{
            width: isMobile ? 22 : 26,
            height: isMobile ? 22 : 26,
            borderRadius: isArcade ? 0 : '50%',
            border: `1.5px dashed ${isSelected ? color : 'rgba(255,255,255,0.18)'}`,
            opacity: isSelected ? 0.9 : 0.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'border-color 0.2s ease',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: isArcade ? 0 : '50%',
              backgroundColor: isSelected ? color : 'rgba(255,255,255,0.25)',
            }}
          />
        </div>

        {/* Technical Corner Brackets */}
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: 4,
            fontSize: 7,
            fontFamily: 'monospace',
            color: isSelected ? color : 'rgba(255,255,255,0.2)',
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          ┌
        </div>
      </div>

      {/* ── 2. CENTER TRACK: PATHWAY / ICE TRANSFORM & GLOWING TITLE ── */}
      <div
        style={{
          height: cellSize,
          position: 'relative',
          borderRadius: isArcade ? 0 : isBlueprint ? 2 : 8,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0 10px' : '0 16px',
          boxSizing: 'border-box',
          background: isFrozen
            ? iceBackground
            : isSelected
            ? `linear-gradient(90deg, ${color}20 0%, rgba(10, 18, 32, 0.85) 50%, ${color}15 100%)`
            : themeConfig.normalCell.background,
          border: isFrozen
            ? iceBorder
            : isSelected
            ? `1.5px solid ${color}80`
            : themeConfig.normalCell.border,
          boxShadow: isFrozen
            ? iceGlow
            : isSelected
            ? `0 0 16px ${color}35, inset 0 0 10px ${color}15`
            : 'none',
          transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Subtle grid segment lines inside center track */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: `${cellSize}px 100%`,
            pointerEvents: 'none',
            opacity: isFrozen ? 0.15 : 0.4,
          }}
        />

        {/* Ice Frost Overlay with Shimmer (Active when frozen) */}
        {isFrozen && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 50% 50%, rgba(207,250,254,0.3) 0%, transparent 80%)',
                pointerEvents: 'none',
              }}
            />
            {/* Sliding Ice Flakes */}
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 14,
                color: '#cffafe',
                filter: 'drop-shadow(0 0 6px #38bdf8)',
                animation: 'icePulse 0.4s infinite alternate',
                pointerEvents: 'none',
              }}
            >
              ❄
            </div>

            {/* Subtle Light Beam Sweep across the ice track when sliding */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '40%',
                background: `linear-gradient(90deg, transparent 0%, ${color}20 25%, rgba(255, 255, 255, 0.45) 50%, ${color}35 75%, transparent 100%)`,
                boxShadow: `0 0 16px ${color}50`,
                filter: 'blur(1px)',
                pointerEvents: 'none',
                zIndex: 3,
                animation: 'laneLightSweep 0.36s cubic-bezier(0.22, 0.9, 0.3, 1) forwards',
              }}
            />
          </>
        )}

        {/* Text Container: Glowing Button Title & Subtitle */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 2,
            zIndex: 2,
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isSelected && (
              <span
                style={{
                  color,
                  fontSize: isMobile ? 10 : 12,
                  fontWeight: 900,
                  filter: `drop-shadow(0 0 6px ${color})`,
                  animation: 'cursorBounce 0.8s infinite alternate ease-in-out',
                }}
              >
                ▶
              </span>
            )}
            <span
              style={{
                fontSize: isMobile ? 12 : 14,
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isSelected ? '#ffffff' : '#cbd5e1',
                textShadow: isSelected
                  ? `0 0 12px ${color}, 0 0 24px ${color}80`
                  : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                transition: 'color 0.18s ease, text-shadow 0.18s ease',
              }}
            >
              {option.label}
            </span>

            {badgeText && (
              <span
                style={{
                  fontSize: 7.5,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  padding: '1px 4px',
                  borderRadius: isArcade ? 0 : 4,
                  background: `${color}25`,
                  border: `1px solid ${color}80`,
                  color: isSelected ? '#ffffff' : color,
                  textShadow: isSelected ? `0 0 6px ${color}` : 'none',
                }}
              >
                {badgeText}
              </span>
            )}
          </div>

          <span
            style={{
              fontSize: isMobile ? 8.5 : 9.5,
              fontWeight: 600,
              color: isSelected ? color : '#64748b',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'color 0.18s ease',
            }}
          >
            {isFrozen ? t('home.sliding_on_ice') : option.sub}
          </span>
        </div>

        {/* Lane Icon Badge */}
        <div
          style={{
            width: isMobile ? 26 : 32,
            height: isMobile ? 26 : 32,
            borderRadius: isArcade ? 0 : 6,
            background: isSelected ? `${color}30` : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.12)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSelected ? '#ffffff' : '#94a3b8',
            boxShadow: isSelected ? `0 0 12px ${color}50` : 'none',
            flexShrink: 0,
            zIndex: 2,
            transition: 'all 0.18s ease',
          }}
        >
          <GameIcon name={getIconName()} size={isMobile ? 14 : 17} color={isSelected ? color : '#94a3b8'} />
        </div>
      </div>

      {/* ── 3. RIGHT CELL: TARGET CELL (HEDEF HÜCRE) ── */}
      <div
        style={{
          width: cellSize,
          height: cellSize,
          background: isSelected
            ? `linear-gradient(135deg, ${color}25 0%, rgba(15, 23, 42, 0.9) 100%)`
            : 'rgba(15, 23, 42, 0.65)',
          border: isSelected ? `2px solid ${color}` : `1.5px solid ${color}55`,
          borderRadius: isArcade ? 0 : isBlueprint ? 2 : 8,
          boxShadow: isSelected
            ? `0 0 20px ${color}70, inset 0 0 14px ${color}35`
            : `inset 0 0 10px rgba(0,0,0,0.5)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Rotating Dashed Target Ring */}
        <div
          style={{
            position: 'absolute',
            width: isMobile ? 28 : 34,
            height: isMobile ? 28 : 34,
            borderRadius: isArcade ? 0 : '50%',
            border: `1.5px dashed ${color}`,
            opacity: isSelected ? 0.9 : 0.45,
            animation: isSelected ? 'targetSpin 4s linear infinite' : 'none',
          }}
        />

        {/* Pulsing Center Target Glyph */}
        <span
          style={{
            fontSize: isMobile ? 16 : 19,
            lineHeight: 1,
            color,
            textShadow: isSelected ? `0 0 12px ${color}, 0 0 20px ${color}` : `0 0 6px ${color}60`,
            zIndex: 1,
            userSelect: 'none',
            display: 'inline-block',
            animation: isSelected ? 'targetPulse 1.2s infinite ease-in-out' : 'none',
          }}
        >
          ◎
        </span>
      </div>

      <style>{`
        @keyframes targetSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes targetPulse {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes cursorBounce {
          0% { transform: translateX(0); }
          100% { transform: translateX(3px); }
        }
        @keyframes icePulse {
          0% { opacity: 0.6; transform: translateY(-50%) scale(0.9); }
          100% { opacity: 1; transform: translateY(-50%) scale(1.15); }
        }
        @keyframes laneLightSweep {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          15% {
            opacity: 0.85;
          }
          85% {
            opacity: 0.85;
          }
          100% {
            transform: translateX(300%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
