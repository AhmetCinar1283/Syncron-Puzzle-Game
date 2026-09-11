'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { NEON_COLORS, glow, type NeonColor } from './colors';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: NeonColor;
  size?: number;
  icon: ReactNode;
  'aria-label': string;
}

/**
 * Round icon-only neon button (back buttons, copy-tag, close buttons).
 * Reproduces e.g. `src/app/friends/FriendsClient.tsx:266` (round back
 * button) and `src/app/friends/FriendsClient.tsx:464` (copy-tag button).
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { color = 'sky', size = 40, icon, disabled, className, style, ...rest },
  ref
) {
  const tokens = NEON_COLORS[color];
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      style={{
        width: size,
        height: size,
        background: glow(color, 0.08),
        border: `1px solid ${glow(color, 0.35)}`,
        color: tokens.hex,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = glow(color, 0.18);
        e.currentTarget.style.boxShadow = `0 0 14px ${glow(color, 0.4)}`;
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = glow(color, 0.08);
        e.currentTarget.style.boxShadow = 'none';
      }}
      {...rest}
    >
      {icon}
    </button>
  );
});
