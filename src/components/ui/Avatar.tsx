import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { NEON_COLORS, glow, type NeonColor } from './colors';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  fallback: string;
  size?: number;
  color?: NeonColor;
}

/**
 * Circular avatar (`borderRadius: '50%'`), used repeatedly in
 * `FriendsClient.tsx`, `ProfileClient.tsx`, `LeaderboardClient.tsx`,
 * `app/page.tsx`. Falls back to initials on a neon-ringed circle when no
 * `src` is given.
 */
export function Avatar({ src, fallback, size = 40, color = 'sky', className, style, ...rest }: AvatarProps) {
  const tokens = NEON_COLORS[color];
  const common = {
    width: size,
    height: size,
    borderRadius: '50%',
    ...style,
  };

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={fallback}
        className={cn('object-cover', className)}
        style={{ ...common, border: `1px solid ${glow(color, 0.4)}` }}
      />
    );
  }

  return (
    <div
      className={cn('flex items-center justify-center font-bold', className)}
      style={{
        ...common,
        background: glow(color, 0.12),
        border: `1px solid ${glow(color, 0.4)}`,
        color: tokens.hex,
        fontSize: size * 0.4,
      }}
      {...rest}
    >
      {fallback}
    </div>
  );
}
