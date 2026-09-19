'use client';

import React from 'react';
import { GameIcon } from '@/components/icons';
import type { LevelThemeDefinition } from '../../themes/types';

export interface LevelCellStarsProps {
  stars?: number;
  themeDef: LevelThemeDefinition;
  size?: number;
}

export function LevelCellStars({ stars = 0, themeDef, size = 11 }: LevelCellStarsProps) {
  return (
    <div className="flex items-center justify-center gap-0.5" aria-label={`${stars} stars`}>
      {[1, 2, 3].map((num) => {
        const isEarned = num <= stars;
        const color = isEarned ? themeDef.stars.filledColor : themeDef.stars.emptyColor;
        const glow = isEarned ? themeDef.stars.glow : 'none';

        return (
          <div
            key={num}
            style={{
              filter: isEarned ? `drop-shadow(${glow})` : undefined,
              transition: 'transform 0.2s ease, filter 0.2s ease',
            }}
          >
            <GameIcon
              name="star"
              size={size}
              color={color}
            />
          </div>
        );
      })}
    </div>
  );
}
