'use client';

import React from 'react';
import { CATEGORIES } from '../lib/constants';

interface CategoryTabsProps {
  t: (key: string) => string;
  catIndex: number;
  onSelect: (idx: number) => void;
}

export default function CategoryTabs({ t, catIndex, onSelect }: CategoryTabsProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '640px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        display: 'flex',
        gap: '8px',
        paddingBottom: '8px',
        marginBottom: '20px',
      }}
      className="no-scrollbar"
    >
      {CATEGORIES.map((cat, idx) => {
        const isSelected = catIndex === idx;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(idx)}
            style={{
              flexShrink: 0,
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '8px',
              border: isSelected ? `1px solid ${cat.color}` : '1px solid #1f2937',
              background: isSelected ? `${cat.color}15` : '#11182780',
              color: isSelected ? cat.color : '#9ca3af',
              cursor: 'pointer',
              boxShadow: isSelected ? `0 0 12px ${cat.color}20` : 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = `${cat.color}60`;
                e.currentTarget.style.color = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = '#1f2937';
                e.currentTarget.style.color = '#9ca3af';
              }
            }}
          >
            {t(cat.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
