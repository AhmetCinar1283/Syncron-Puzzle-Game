import { ParticleItem } from './types';

export function drawArcadeMotif(ctx: CanvasRenderingContext2D, p: ParticleItem) {
  const half = p.size / 2;
  ctx.fillStyle = p.color;

  if (p.motifType === 'primary') {
    // 8-Bit Pixel Crate ▣
    ctx.fillRect(-half, -half, p.size, p.size);
    ctx.clearRect(-half + 3, -half + 3, p.size - 6, p.size - 6);
    ctx.fillRect(-half + 5, -half + 5, p.size - 10, p.size - 10);
  } else if (p.motifType === 'secondary') {
    // 8-Bit Pixel Brick
    ctx.fillRect(-half, -half / 2, p.size, half);
    ctx.fillRect(-half + 2, -half / 2 + 2, p.size - 4, half - 4);
  } else if (p.motifType === 'accent') {
    // Pixel Cross +
    const bar = Math.max(3, p.size / 4);
    ctx.fillRect(-half, -bar / 2, p.size, bar);
    ctx.fillRect(-bar / 2, -half, bar, p.size);
  } else {
    // 4x4 Pixel Spark
    ctx.fillRect(-2, -2, 4, 4);
  }
}

export function drawNeonMotif(ctx: CanvasRenderingContext2D, p: ParticleItem) {
  const half = p.size / 2;
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;

  if (p.motifType === 'primary') {
    // Cyber Diamond Reticle
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(half, 0);
    ctx.lineTo(0, half);
    ctx.lineTo(-half, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillRect(-2, -2, 4, 4);
  } else if (p.motifType === 'secondary') {
    // Glowing Laser Dash / Circuit Trace
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.stroke();
    ctx.fillRect(-half, -1.5, 3, 3);
    ctx.fillRect(half - 3, -1.5, 3, 3);
  } else if (p.motifType === 'accent') {
    // Cyber Ring
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Neon Spark
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBlueprintMotif(ctx: CanvasRenderingContext2D, p: ParticleItem) {
  const half = p.size / 2;
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;
  ctx.lineWidth = 1.2;

  if (p.motifType === 'primary') {
    // CAD Coordinate Crosshair + with center gap
    const gap = 3;
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(-gap, 0);
    ctx.moveTo(gap, 0);
    ctx.lineTo(half, 0);
    ctx.moveTo(0, -half);
    ctx.lineTo(0, -gap);
    ctx.moveTo(0, gap);
    ctx.lineTo(0, half);
    ctx.stroke();
  } else if (p.motifType === 'secondary') {
    // Drafting Corner Tick ┌
    ctx.beginPath();
    ctx.moveTo(-half, half);
    ctx.lineTo(-half, -half);
    ctx.lineTo(half, -half);
    ctx.stroke();
  } else if (p.motifType === 'accent') {
    // Dashed Guide Segment
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // Grid intersection point
    ctx.fillRect(-1.5, -1.5, 3, 3);
  }
}

export function drawCosmicMotif(ctx: CanvasRenderingContext2D, p: ParticleItem) {
  const half = p.size / 2;
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;

  if (p.motifType === 'primary') {
    // 4-Point Shimmering Star
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.quadraticCurveTo(0, 0, half, 0);
    ctx.quadraticCurveTo(0, 0, 0, half);
    ctx.quadraticCurveTo(0, 0, -half, 0);
    ctx.quadraticCurveTo(0, 0, 0, -half);
    ctx.fill();
  } else if (p.motifType === 'secondary') {
    // Celestial Orbit Ring with Satellite
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(half, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.motifType === 'accent') {
    // Starlight Diamond
    ctx.beginPath();
    ctx.moveTo(0, -half * 0.7);
    ctx.lineTo(half * 0.7, 0);
    ctx.lineTo(0, half * 0.7);
    ctx.lineTo(-half * 0.7, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    // Star Mote
    ctx.beginPath();
    ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawLegacyMotif(ctx: CanvasRenderingContext2D, p: ParticleItem) {
  const half = p.size / 2;
  ctx.strokeStyle = p.color;
  ctx.fillStyle = p.color;

  if (p.motifType === 'primary') {
    // Double Target Ring ◎
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.motifType === 'secondary') {
    // Clean Geometric Square
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-half * 0.7, -half * 0.7, p.size * 0.7, p.size * 0.7);
  } else if (p.motifType === 'accent') {
    // Minimal Shard Diamond
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(half * 0.8, 0);
    ctx.lineTo(0, half);
    ctx.lineTo(-half * 0.8, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    // Soft Circle
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawMotifByTheme(
  theme: string,
  ctx: CanvasRenderingContext2D,
  p: ParticleItem
) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.rotation !== 0) {
    ctx.rotate(p.rotation);
  }
  ctx.globalAlpha = p.opacity;

  switch (theme) {
    case 'arcade':
      drawArcadeMotif(ctx, p);
      break;
    case 'neon':
      drawNeonMotif(ctx, p);
      break;
    case 'blueprint':
      drawBlueprintMotif(ctx, p);
      break;
    case 'cosmic':
      drawCosmicMotif(ctx, p);
      break;
    default:
      drawLegacyMotif(ctx, p);
      break;
  }

  ctx.restore();
}
