'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useT } from '@/contexts/LanguageContext';
import { useGamepad } from '@/hooks/useGamepad';
import { useSoundManager } from '@/game-engine/hooks/useSoundManager';
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
  const { play: playSound } = useSoundManager();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | HTMLButtonElement | null)[]>([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const totalCount = items.length + 1; // items + Kapat butonu

  const activateIndex = useCallback(
    (index: number) => {
      playSound('toggle');
      if (index >= 0 && index < items.length) {
        onClose();
        items[index].onClick();
      } else {
        onClose();
      }
    },
    [items, onClose, playSound]
  );

  const moveUp = useCallback(() => {
    setActiveIndex((prev) => {
      const next = prev > 0 ? prev - 1 : totalCount - 1;
      playSound('move');
      return next;
    });
  }, [totalCount, playSound]);

  const moveDown = useCallback(() => {
    setActiveIndex((prev) => {
      const next = prev < totalCount - 1 ? prev + 1 : 0;
      playSound('move');
      return next;
    });
  }, [totalCount, playSound]);

  // Gamepad desteği
  useGamepad({
    enabled: true,
    onMove: (dir) => {
      if (dir === 'up') moveUp();
      else if (dir === 'down') moveDown();
    },
    onConfirm: () => {
      activateIndex(activeIndex);
    },
    onCancel: () => {
      playSound('toggle');
      onClose();
    },
  });

  // Klavye desteği
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        moveUp();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        moveDown();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateIndex(activeIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        playSound('toggle');
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveUp, moveDown, activateIndex, activeIndex, onClose, playSound]);

  // Sayfa açılır açılmaz odak panele girsin
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  // Aktif eleman değiştiğinde görünür alana kaydır
  useEffect(() => {
    rowRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

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

        {items.map((item, idx) => {
          const isActive = activeIndex === idx;
          return (
            <div
              key={item.id}
              ref={(el) => {
                rowRefs.current[idx] = el;
              }}
              className="home-sheet__row"
              role="button"
              tabIndex={0}
              data-active={isActive}
              style={{
                background: isActive
                  ? `linear-gradient(160deg, ${item.color}26 0%, rgba(15, 23, 42, 0.95) 100%)`
                  : 'rgba(255, 255, 255, 0.04)',
                border: `1.5px solid ${isActive ? item.color : `${item.color}40`}`,
                boxShadow: isActive ? `0 0 16px ${item.color}40` : 'none',
              }}
              onPointerEnter={() => setActiveIndex(idx)}
              onClick={() => activateIndex(idx)}
            >
              <span className="home-sheet__icon-wrap">
                <GameIcon name={item.icon} size={20} color={isActive ? item.color : '#94a3b8'} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: isActive ? '#ffffff' : '#e2e8f0',
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    color: isActive ? '#cbd5e1' : '#64748b',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.sub}
                </span>
              </span>
            </div>
          );
        })}

        <button
          type="button"
          ref={(el) => {
            rowRefs.current[items.length] = el;
          }}
          data-active={activeIndex === items.length}
          onClick={() => activateIndex(items.length)}
          onPointerEnter={() => setActiveIndex(items.length)}
          className="home-sheet__row"
          style={{
            justifyContent: 'center',
            background:
              activeIndex === items.length
                ? 'rgba(255, 255, 255, 0.12)'
                : 'transparent',
            border: `1.5px solid ${
              activeIndex === items.length
                ? themeConfig.accentColor || '#ffffff'
                : 'rgba(255, 255, 255, 0.1)'
            }`,
            color: activeIndex === items.length ? '#ffffff' : '#94a3b8',
            boxShadow:
              activeIndex === items.length
                ? `0 0 14px ${themeConfig.accentGlow || 'rgba(255, 255, 255, 0.3)'}`
                : 'none',
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
