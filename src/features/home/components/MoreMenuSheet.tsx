'use client';

import React, { useEffect, useRef } from 'react';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useT } from '@/contexts/LanguageContext';
import type { HomeMenuItem } from '../hooks/useHomePage';

interface MoreMenuSheetProps {
  items: HomeMenuItem[];
  onClose: () => void;
}

/**
 * Izgaraya sığmayan menü öğeleri. Mobilde alttan kayan sayfa, 640px üstünde
 * ortalanmış panel (bkz. src/app/home.css). Giriş animasyonu yalnızca transform
 * + opacity; blur/backdrop-filter kullanılmaz.
 */
export function MoreMenuSheet({ items, onClose }: MoreMenuSheetProps) {
  const t = useT();
  const { themeConfig } = useGameTheme();
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Sayfa açılır açılmaz odak panele girsin; kapanışı Escape hook'ta yönetilir.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  return (
    <div
      className="home-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={t('home.more')}
    >
      <div className="home-sheet__scrim" onClick={onClose} />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="home-sheet__panel"
        style={{ background: themeConfig.board.background || '#070e1c', outline: 'none' }}
      >
        <div className="home-sheet__handle" />

        {items.map((item) => (
          <div
            key={item.id}
            className="home-sheet__row"
            role="button"
            tabIndex={0}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${item.color}40`,
            }}
            onClick={() => {
              onClose();
              item.onClick();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
                item.onClick();
              }
            }}
          >
            <GameIcon name={item.icon} size={20} color={item.color} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#e2e8f0',
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: '#64748b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.sub}
              </span>
            </span>
          </div>
        ))}

        <button
          type="button"
          onClick={onClose}
          className="home-sheet__row"
          style={{
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: 0,
          }}
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}
