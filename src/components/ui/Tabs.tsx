'use client';

import { cn } from '@/lib/cn';
import { NEON_COLORS, glow, type NeonColor } from './colors';

export interface TabItem {
  value: string;
  label: React.ReactNode;
  color?: NeonColor;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  color?: NeonColor;
  className?: string;
}

/**
 * Controlled segmented tab bar reproducing the pill-tab pattern used for
 * friends/leaderboard/profile section switches.
 */
export function Tabs({ items, value, onChange, color = 'sky', className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex gap-1 rounded-full p-1', className)}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {items.map((item) => {
        const active = item.value === value;
        const c = item.color ?? color;
        const tokens = NEON_COLORS[c];
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className="rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200"
            style={
              active
                ? { background: tokens.hex, color: '#030712', boxShadow: `0 0 14px ${glow(c, 0.5)}` }
                : { background: 'transparent', color: '#9ca3af' }
            }
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
