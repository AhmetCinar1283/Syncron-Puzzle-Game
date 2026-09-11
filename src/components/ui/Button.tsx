'use client';

import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { NEON_COLORS, glow, type NeonColor } from './colors';
import { Spinner } from './Spinner';

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: NeonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2.5 gap-2',
  lg: 'text-sm px-7 py-3 gap-2.5',
};

/**
 * Neon button reproducing the inline-style buttons repeated across pages
 * (e.g. `src/app/friends/FriendsClient.tsx:386`, `src/app/donate/DonateClient.tsx`,
 * `src/components/common/AuthModal.tsx`). Colors/glow come from CSS vars set
 * inline (`--nc`, `--nc-rgb`) so hover/disabled states stay declarative
 * (see `src/components/ui/button.css`-equivalent handled via style prop —
 * kept inline, not in globals.css, to avoid a combinatorial class explosion
 * for 8 colors x 3 variants x 3 sizes).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    color = 'emerald',
    variant = 'outline',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    disabled,
    className,
    children,
    style,
    ...rest
  },
  ref
) {
  const tokens = NEON_COLORS[color];
  const isDisabled = disabled || loading;

  const base: CSSProperties =
    variant === 'solid'
      ? {
          background: tokens.hex,
          color: '#030712',
          border: `1px solid ${tokens.hex}`,
          boxShadow: `0 0 20px ${glow(color, 0.5)}`,
        }
      : variant === 'ghost'
        ? {
            background: 'transparent',
            color: tokens.hex,
            border: '1px solid transparent',
            boxShadow: 'none',
          }
        : {
            background: glow(color, 0.12),
            color: tokens.hex,
            border: `1px solid ${tokens.hex}`,
            boxShadow: `0 0 14px ${glow(color, 0.2)}`,
          };

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-bold transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        fullWidth && 'w-full',
        SIZE_CLASSES[size],
        className
      )}
      style={{ ...base, ...style }}
      onMouseEnter={(e) => {
        if (isDisabled) return;
        if (variant === 'solid') {
          e.currentTarget.style.boxShadow = `0 0 28px ${glow(color, 0.8)}`;
        } else {
          e.currentTarget.style.background = variant === 'ghost' ? glow(color, 0.1) : tokens.hex;
          e.currentTarget.style.color = variant === 'ghost' ? tokens.hex : '#030712';
          e.currentTarget.style.boxShadow = `0 0 20px ${glow(color, 0.5)}`;
        }
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (isDisabled) return;
        Object.assign(e.currentTarget.style, base);
        rest.onMouseLeave?.(e);
      }}
      {...rest}
    >
      {loading ? <Spinner size={size === 'lg' ? 16 : 14} color={variant === 'solid' ? '#030712' : color} /> : icon}
      {children}
    </button>
  );
});
