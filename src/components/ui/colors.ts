/**
 * Shared neon color tokens for `components/ui/*` primitives.
 * Values are lifted verbatim from the current inline-style usage across
 * pages (see README.md for file:line references) so primitives reproduce
 * the existing look instead of inventing a new palette.
 */
export type NeonColor =
  | 'emerald'
  | 'sky'
  | 'pink'
  | 'red'
  | 'amber'
  | 'purple'
  | 'orange'
  | 'neutral';

interface ColorTokens {
  /** Solid hex, used for text/border/hover-fill. */
  hex: string;
  /** `r, g, b` triplet for building rgba() glows/backgrounds inline. */
  rgb: string;
}

export const NEON_COLORS: Record<NeonColor, ColorTokens> = {
  emerald: { hex: '#00ff88', rgb: '0, 255, 136' },
  sky: { hex: '#00c4ff', rgb: '0, 196, 255' },
  pink: { hex: '#ec4899', rgb: '236, 72, 153' },
  red: { hex: '#ef4444', rgb: '239, 68, 68' },
  amber: { hex: '#ffd700', rgb: '255, 215, 0' },
  purple: { hex: '#bf5fff', rgb: '191, 95, 255' },
  orange: { hex: '#f97316', rgb: '249, 115, 22' },
  neutral: { hex: '#9ca3af', rgb: '156, 163, 175' },
};

export function glow(color: NeonColor, alpha: number): string {
  return `rgba(${NEON_COLORS[color].rgb}, ${alpha})`;
}
