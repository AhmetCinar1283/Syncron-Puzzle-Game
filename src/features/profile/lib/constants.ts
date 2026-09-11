export const NEON_TYPES = [
  { color: '#00ff88', glow: '0 0 6px #00ff88, 0 0 18px rgba(0,255,136,0.3)' },
  { color: '#00c4ff', glow: '0 0 6px #00c4ff, 0 0 18px rgba(0,196,255,0.3)' },
  { color: '#ffd700', glow: '0 0 6px #ffd700, 0 0 18px rgba(255,215,0,0.3)' },
  { color: '#fbbf24', glow: '0 0 6px #fbbf24, 0 0 18px rgba(251,191,36,0.3)' },
  { color: '#9333ea', glow: '0 0 6px #9333ea, 0 0 18px rgba(147,51,234,0.3)' },
  { color: '#ec4899', glow: '0 0 6px #ec4899, 0 0 18px rgba(236,72,153,0.3)' },
];

// Firestore `users/{uid}` doc shape is intentionally left loose here (as in
// the pre-split ProfileClient.tsx) rather than refactored into a full type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProfileDoc = any;

export interface Particle {
  id: number;
  color: string;
  glow: string;
  size: number;
  startX: number;
  startY: number;
  driftX: number;
  duration: number;
  delay: number;
  opacity: number;
}
