export type Particle = {
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
  borderRadius: number;
};

// Admin paneline özel, biraz daha "sistem" hissiyatı veren renkler
export const NEON_TYPES = [
  { color: '#00c4ff', glow: '0 0 6px #00c4ff, 0 0 18px rgba(0,196,255,0.3)' }, // Cyan
  { color: '#ffd700', glow: '0 0 6px #ffd700, 0 0 18px rgba(255,215,0,0.3)' }, // Gold
  { color: '#ec4899', glow: '0 0 6px #ec4899, 0 0 18px rgba(236,72,153,0.3)' }, // Pink
  { color: '#9333ea', glow: '0 0 6px #9333ea, 0 0 18px rgba(147,51,234,0.3)' }, // Purple
];

export function generateParticles(vw: number, vh: number): Particle[] {
  return Array.from({ length: 25 }, (_, i) => {
    const type = NEON_TYPES[i % NEON_TYPES.length];
    return {
      id: i,
      color: type.color,
      glow: type.glow,
      size: 6 + Math.random() * 14,
      startX: Math.random() * vw,
      startY: Math.random() * vh,
      driftX: (Math.random() - 0.5) * 60,
      duration: 15 + Math.random() * 15,
      delay: -(Math.random() * 20),
      opacity: 0.1 + Math.random() * 0.15,
      borderRadius: Math.random() > 0.5 ? 50 : 2,
    };
  });
}
