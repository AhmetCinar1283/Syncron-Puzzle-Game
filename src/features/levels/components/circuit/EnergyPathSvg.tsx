'use client';

import React, { useMemo } from 'react';
import type { CircuitPoint } from '../../lib/circuitCalculations';
import { generateSmoothSvgPath } from '../../lib/circuitCalculations';
import type { LevelThemeDefinition } from '../../themes/types';

export interface EnergyPathSvgProps {
  points: CircuitPoint[];
  containerWidth: number;
  containerHeight: number;
  completedCount: number;
  themeDef: LevelThemeDefinition;
}

export function EnergyPathSvg({
  points,
  containerWidth,
  containerHeight,
  completedCount,
  themeDef,
}: EnergyPathSvgProps) {
  // Yüzde ve piksel koordinatlarını SVG piksel noktalarına dönüştür
  const pixelPoints = useMemo(() => {
    return points.map((p) => ({
      x: (p.xPercent / 100) * containerWidth,
      y: p.yPx,
    }));
  }, [points, containerWidth]);

  // Tüm yolun SVG rotası
  const fullPathD = useMemo(() => {
    return generateSmoothSvgPath(pixelPoints);
  }, [pixelPoints]);

  // Tamamlanan ve sıradaki aktif seviyeye kadar olan aydınlatılmış yol
  const activePixelPoints = useMemo(() => {
    // completedCount + 1 (sıradaki oynanabilir seviye dahil)
    const activeLimit = Math.min(pixelPoints.length, Math.max(0, completedCount + 1));
    return pixelPoints.slice(0, activeLimit);
  }, [pixelPoints, completedCount]);

  const activePathD = useMemo(() => {
    return generateSmoothSvgPath(activePixelPoints);
  }, [activePixelPoints]);

  if (pixelPoints.length < 2) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 1 }}
      width={containerWidth}
      height={containerHeight}
    >
      <defs>
        {/* Neon Işıltı Filtresi */}
        <filter id="conduitGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. Arka Plan: Gelecekteki sönük ve kesikli uzay rotası */}
      <path
        d={fullPathD}
        fill="none"
        stroke={themeDef.conduit.inactiveStroke}
        strokeWidth={1.8}
        strokeDasharray="4, 4"
        strokeLinecap="round"
      />

      {/* 2. Aktif Enerji Hattı: Tamamlanan bölümlere kadar yanan parlak hat */}
      {activePathD && (
        <path
          d={activePathD}
          fill="none"
          stroke={themeDef.conduit.activeStroke}
          strokeWidth={2.8}
          strokeLinecap="round"
          filter="url(#conduitGlow)"
          style={{ opacity: 0.95 }}
        />
      )}

      {/* 3. Canlı Enerji Akımı: Hat üzerinde kayan plazma akımı */}
      {activePathD && (
        <path
          d={activePathD}
          fill="none"
          stroke={themeDef.conduit.pulseParticleColor}
          strokeWidth={2}
          strokeDasharray="10, 24"
          strokeLinecap="round"
          className="animate-pulse"
        />
      )}
    </svg>
  );
}
