import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { NEON_COLORS, glow, type NeonColor } from './colors';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: NeonColor;
  size?: 'sm' | 'md';
}

/**
 * Pill/badge chip (`borderRadius: '999px'` pattern, e.g.
 * `src/app/profile/ProfileClient.tsx:767`).
 */
export function Badge({ color = 'sky', size = 'sm', className, style, children, ...rest }: BadgeProps) {
  const tokens = NEON_COLORS[color];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold whitespace-nowrap',
        size === 'sm' ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3 py-1.5',
        className
      )}
      style={{
        background: glow(color, 0.12),
        border: `1px solid ${glow(color, 0.4)}`,
        color: tokens.hex,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}

export { Badge as Pill };
