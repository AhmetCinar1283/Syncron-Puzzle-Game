'use client';
import { useState } from 'react';

export function MenuCard({
  id, label, sub, color, onClick, isSelected, onMouseEnter, isHero, isGamepadConnected, isMobile
}: {
  id: string; label: string; sub: string; color: string; onClick: () => void; isSelected?: boolean; onMouseEnter?: () => void; isHero?: boolean; isGamepadConnected?: boolean; isMobile?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const active = isSelected || hovered;

  const getIcon = () => {
    switch (id) {
      case 'play': return '🎮';
      case 'levels': return '🏆';
      case 'editor': return '🛠️';
      case 'friends': return '👥';
      case 'controls': return '🕹️';
      case 'admin': return '⚡';
      default: return '✦';
    }
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => {
        setHovered(true);
        onMouseEnter?.();
      }}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: isHero ? '1 / -1' : undefined,
        width: '100%',
        minHeight: isHero ? 90 : 80,
        padding: '14px 18px',
        background: active
          ? `linear-gradient(135deg, ${color}24 0%, rgba(13, 20, 37, 0.97) 100%)`
          : isMobile
            ? 'rgba(13, 20, 37, 0.82)'
            : 'rgba(13, 20, 37, 0.45)',
        backdropFilter: isMobile ? 'blur(6px)' : 'blur(16px)',
        WebkitBackdropFilter: isMobile ? 'blur(6px)' : 'blur(16px)',
        border: `1.5px solid ${active ? color : `${color}25`}`,
        color: active ? '#fff' : '#94a3b8',
        borderRadius: 14,
        cursor: 'pointer',
        boxShadow: active
          ? `0 0 24px ${color}25, inset 0 0 8px ${color}15`
          : '0 8px 32px rgba(0, 0, 0, 0.4)',
        transition: 'background 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        textAlign: 'left',
        outline: 'none',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: isHero ? 15 : 13,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: active ? '#fff' : '#e2e8f0',
            transition: 'color 0.2s',
          }}>
            {label}
          </span>
          {isSelected && isGamepadConnected && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#00ff88',
              color: '#030712',
              fontSize: 9,
              fontWeight: 900,
              borderRadius: '50%',
              width: 14,
              height: 14,
              boxShadow: '0 0 6px #00ff88',
            }}>
              A
            </span>
          )}
        </div>
        <span style={{
          fontSize: isHero ? 10 : 9,
          fontWeight: 500,
          color: active ? `${color}` : '#64748b',
          lineHeight: 1.3,
          letterSpacing: '0.02em',
          transition: 'color 0.2s',
        }}>
          {sub}
        </span>
      </div>

      <div style={{
        width: isHero ? 40 : 34,
        height: isHero ? 40 : 34,
        borderRadius: 10,
        background: active ? `${color}20` : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${active ? `${color}40` : 'rgba(255, 255, 255, 0.05)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isHero ? 18 : 15,
        color: active ? color : '#475569',
        boxShadow: active ? `0 0 12px ${color}25` : 'none',
        transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
        flexShrink: 0,
      }}>
        {getIcon()}
      </div>
    </button>
  );
}
