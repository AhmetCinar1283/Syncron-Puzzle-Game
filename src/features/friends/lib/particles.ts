export const NEON_TYPES = [
  { color: '#00ff88', glow: '0 0 6px #00ff88, 0 0 18px rgba(0,255,136,0.3)' },
  { color: '#00c4ff', glow: '0 0 6px #00c4ff, 0 0 18px rgba(0,196,255,0.3)' },
  { color: '#ffd700', glow: '0 0 6px #ffd700, 0 0 18px rgba(255,215,0,0.3)' },
  { color: '#fbbf24', glow: '0 0 6px #fbbf24, 0 0 18px rgba(251,191,36,0.3)' },
  { color: '#9333ea', glow: '0 0 6px #9333ea, 0 0 18px rgba(147,51,234,0.3)' },
  { color: '#ec4899', glow: '0 0 6px #ec4899, 0 0 18px rgba(236,72,153,0.3)' },
];

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

// Generates the floating background particle list for the Friends page (client-only, needs window size).
export function generateParticles(count = 20): Particle[] {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  return Array.from({ length: count }, (_, i) => {
    const type = NEON_TYPES[i % NEON_TYPES.length];
    return {
      id: i,
      color: type.color,
      glow: type.glow,
      size: 8 + Math.random() * 14,
      startX: Math.random() * vw,
      startY: Math.random() * vh,
      driftX: (Math.random() - 0.5) * 80,
      duration: 15 + Math.random() * 15,
      delay: -(Math.random() * 20),
      opacity: 0.08 + Math.random() * 0.15,
    };
  });
}
