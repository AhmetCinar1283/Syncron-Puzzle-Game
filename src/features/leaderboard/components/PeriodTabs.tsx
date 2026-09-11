'use client';

import React from 'react';
import { CATEGORIES } from '../lib/constants';

interface PeriodTabsProps {
  t: (key: string) => string;
  catIndex: number;
  periodIndex: number;
  onSelect: (idx: number) => void;
}

export default function PeriodTabs({ t, catIndex, periodIndex, onSelect }: PeriodTabsProps) {
  const activeCategory = CATEGORIES[catIndex];

  return (
    <div
      style={{
        display: 'flex',
        gap: '6px',
        background: '#090d16',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid #111827',
        marginBottom: '32px',
      }}
    >
      {activeCategory.periods.map((p, idx) => {
        const isSelected = periodIndex === idx;
        return (
          <button
            key={p}
            onClick={() => onSelect(idx)}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              background: isSelected ? activeCategory.color : 'transparent',
              color: isSelected ? '#030712' : '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            {t(`leaderboard.period_${p}`)}
          </button>
        );
      })}
    </div>
  );
}
