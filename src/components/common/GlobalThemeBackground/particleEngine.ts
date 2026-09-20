/**
 * DOSYA AMACI: Arka plan parçacık motorunun matematik, havuz yönetimi ve render döngüsü.
 */

import { ParticleItem, MotifType } from './types';
import { drawMotifByTheme } from './themeMotifs';

export function getThemePalette(theme: string, accentColor: string): string[] {
  switch (theme) {
    case 'arcade':
      return [accentColor, '#eab308', '#ef4444', '#3b82f6', '#00ff88', '#f97316'];
    case 'blueprint':
      return [accentColor, '#7dd3fc', '#0284c7', '#38bdf8', '#bae6fd'];
    case 'cosmic':
      return [accentColor, '#c084fc', '#818cf8', '#e879f9', '#f472b6'];
    case 'neon':
      return [accentColor, '#00ff88', '#00c4ff', '#ffd700', '#ec4899'];
    default:
      return [accentColor, '#00c4ff', '#00ff88', '#ffd700', '#38bdf8'];
  }
}

const MOTIF_TYPES: MotifType[] = ['primary', 'secondary', 'accent', 'dot'];

export function createParticlePool(
  count: number,
  width: number,
  height: number,
  colors: string[]
): ParticleItem[] {
  const pool: ParticleItem[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const isInitial = true;
    const motifType = MOTIF_TYPES[i % MOTIF_TYPES.length];
    const isDot = motifType === 'dot';

    pool[i] = {
      x: Math.random() * width,
      y: isInitial ? Math.random() * height : height + 30,
      size: isDot ? 4 : 10 + Math.random() * 16,
      speedY: 0.35 + Math.random() * 0.55,
      driftX: (Math.random() - 0.5) * 0.9,
      driftSpeed: 0.006 + Math.random() * 0.012,
      color: colors[i % colors.length],
      maxOpacity: isDot ? 0.35 : 0.14 + Math.random() * 0.16,
      opacity: 0,
      angle: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.015,
      motifType,
    };
  }

  return pool;
}

export function updateAndRenderPool(
  pool: ParticleItem[],
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: string,
  dt: number,
  colors: string[]
) {
  // Rate-normalize to ~60 FPS baseline (dt = 0.016s -> factor = 1)
  const factor = Math.min(dt * 60, 2);
  const fadeZone = 120;

  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];

    p.y -= p.speedY * factor;
    p.angle += p.driftSpeed * factor;
    p.x += (Math.sin(p.angle) * 0.4 + p.driftX) * factor;
    p.rotation += p.rotationSpeed * factor;

    // Smooth edge alpha fading
    if (p.y > height - fadeZone) {
      p.opacity = ((height - p.y) / fadeZone) * p.maxOpacity;
    } else if (p.y < fadeZone) {
      p.opacity = (p.y / fadeZone) * p.maxOpacity;
    } else {
      p.opacity = p.maxOpacity;
    }

    // Wrap-around
    if (p.y < -30 || p.x < -30 || p.x > width + 30) {
      p.x = Math.random() * width;
      p.y = height + 30;
      p.color = colors[Math.floor(Math.random() * colors.length)];
      p.opacity = 0;
    }

    // Draw theme-specific motif
    drawMotifByTheme(theme, ctx, p);
  }
}
