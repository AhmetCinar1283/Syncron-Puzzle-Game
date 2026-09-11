export const NEON_TYPES = [
  { color: '#00ff88', glow: '0 0 6px #00ff88, 0 0 18px rgba(0,255,136,0.3)' },
  { color: '#00c4ff', glow: '0 0 6px #00c4ff, 0 0 18px rgba(0,196,255,0.3)' },
  { color: '#ffd700', glow: '0 0 6px #ffd700, 0 0 18px rgba(255,215,0,0.3)' },
  { color: '#fbbf24', glow: '0 0 6px #fbbf24, 0 0 18px rgba(251,191,36,0.3)' },
];

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

// Map of standard Gamepad buttons for visualization
export const BUTTONS_MAP = [
  { index: 0, label: 'A / ✕', role: 'confirm' },
  { index: 1, label: 'B / ◯', role: 'menu' },
  { index: 2, label: 'X / ▢', role: 'restart' },
  { index: 3, label: 'Y / △', role: 'restart' },
  { index: 4, label: 'LB / L1', role: 'none' },
  { index: 5, label: 'RB / R1', role: 'none' },
  { index: 6, label: 'LT / L2', role: 'none' },
  { index: 7, label: 'RT / R2', role: 'none' },
  { index: 8, label: 'SELECT', role: 'restart' },
  { index: 9, label: 'START', role: 'menu' },
  { index: 12, label: 'D-Pad ▲', role: 'move' },
  { index: 13, label: 'D-Pad ▼', role: 'move' },
  { index: 14, label: 'D-Pad ◀', role: 'move' },
  { index: 15, label: 'D-Pad ▶', role: 'move' },
];
