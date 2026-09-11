import { NEON_COLORS, type NeonColor } from './colors';

export interface SpinnerProps {
  size?: number;
  /** A `NeonColor` token or a raw CSS color string. */
  color?: NeonColor | string;
  className?: string;
}

function resolveColor(color: NeonColor | string): string {
  return color in NEON_COLORS ? NEON_COLORS[color as NeonColor].hex : color;
}

/**
 * Reproduces the `animation: spin ...` refresh-button spinner
 * (`@keyframes spin` in `src/app/globals.css:55`), generalized into a
 * standalone loading indicator.
 */
export function Spinner({ size = 18, color = 'emerald', className }: SpinnerProps) {
  const hex = resolveColor(color);
  return (
    <span
      role="status"
      aria-label="loading"
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `2px solid ${hex}33`,
        borderTopColor: hex,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}
