export type MotifType = 'primary' | 'secondary' | 'accent' | 'dot';

export interface ParticleItem {
  x: number;
  y: number;
  size: number;
  speedY: number;
  driftX: number;
  driftSpeed: number;
  color: string;
  maxOpacity: number;
  opacity: number;
  angle: number;
  rotation: number;
  rotationSpeed: number;
  motifType: MotifType;
}

export interface EngineConfig {
  width: number;
  height: number;
  isMobile: boolean;
  theme: string;
  accentColor: string;
}
