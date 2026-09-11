import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { glow, type NeonColor } from './colors';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: NeonColor;
  padding?: 'sm' | 'md' | 'lg';
}

const PADDING_CLASSES: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * Dark gradient panel repeated across pages, e.g.
 * `src/app/friends/FriendsClient.tsx:418` (`linear-gradient(to bottom,
 * #0a0f1a, #070a12)` + subtle neon border). `accent` tints the border/glow;
 * omit it for the plain neutral panel.
 */
export function Card({ accent, padding = 'md', className, style, children, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl', PADDING_CLASSES[padding], className)}
      style={{
        background: 'linear-gradient(to bottom, #0a0f1a, #070a12)',
        border: `1px solid ${accent ? glow(accent, 0.15) : 'rgba(255,255,255,0.06)'}`,
        boxShadow: accent ? `0 0 24px ${glow(accent, 0.06)}` : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export { Card as Panel };
