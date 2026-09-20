'use client';

import React, { memo } from 'react';
import { GameIcon } from '@/components/icons';
import type { HomeMenuItem } from '../hooks/useHomePage';

interface MenuTileGridProps {
  tiles: HomeMenuItem[];
  /** 0 = hero; ızgara hücreleri 1'den başlar. */
  activeIndex: number;
  disabled: boolean;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
}

/**
 * İkincil eylemler. Hero'nun aksine seremoni yok — dokunuşa anında tepki verip
 * hemen gider; bekleme hissi yaratmamak akıcılığın yarısı.
 *
 * ızgara en fazla 4 hücre tutar (bkz. useHomePage/MAX_TILES): mobilde 2×2,
 * 560px üstünde tek satır 4 sütun. Böylece yerleşim platform yeteneklerine göre
 * uzayıp kısalmaz.
 */
function MenuTileGridBase({
  tiles,
  activeIndex,
  disabled,
  onSelect,
  onActivate,
}: MenuTileGridProps) {
  return (
    <div className="home-grid">
      {tiles.map((tile, i) => {
        const index = i + 1;
        const isActive = activeIndex === index;
        const color = tile.color;

        return (
          <div
            key={tile.id}
            className="home-tile"
            role="button"
            tabIndex={0}
            aria-label={`${tile.label} — ${tile.sub}`}
            data-active={isActive}
            style={{
              background: isActive
                ? `linear-gradient(160deg, ${color}26 0%, rgba(10, 18, 32, 0.9) 100%)`
                : 'rgba(12, 20, 34, 0.72)',
              border: `1.5px solid ${isActive ? color : `${color}44`}`,
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse' && !disabled && !isActive) onSelect(index);
            }}
            onClick={() => {
              if (disabled) return;
              onActivate(index);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!disabled) onActivate(index);
              }
            }}
          >
            <span
              className="home-glow"
              style={{ boxShadow: `0 0 16px ${color}55, inset 0 0 12px ${color}22` }}
            />

            {tile.badge && (
              <span
                className="home-tile__badge"
                style={{ background: `${color}2e`, border: `1px solid ${color}88`, color }}
              >
                {tile.badge}
              </span>
            )}

            <span className="home-tile__icon-wrap">
              <GameIcon name={tile.icon} size={22} color={isActive ? color : '#94a3b8'} />
            </span>

            <span
              className="home-tile__label"
              style={{ color: isActive ? '#ffffff' : '#cbd5e1' }}
            >
              {tile.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const MenuTileGrid = memo(MenuTileGridBase);
