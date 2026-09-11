'use client';

import { useMemo, type RefObject } from 'react';
import type { LevelOrderEntry } from '@/services/firebase/admin';
import { getThemeBackground } from '../lib/designerThemes';

interface Coords {
  x: number;
  y: number;
}

export function DesignerCanvas({
  canvasRef,
  mapTheme,
  activeThemeColor,
  sortedLevels,
  levelCoords,
  portalCoords,
  portalStartCoords,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  canvasRef: RefObject<HTMLDivElement | null>;
  mapTheme: string;
  activeThemeColor: string;
  sortedLevels: LevelOrderEntry[];
  levelCoords: Record<string, Coords>;
  portalCoords: Coords;
  portalStartCoords: Coords;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (id: string, e: React.PointerEvent) => void;
}) {
  // Organic B-Spline smooth winding path calculation
  const svgPathData = useMemo(() => {
    const points: Array<Coords> = [];
    points.push({ x: portalStartCoords.x, y: portalStartCoords.y });
    sortedLevels.forEach((lv) => {
      const c = levelCoords[lv.id];
      if (c) points.push({ x: c.x, y: c.y });
    });
    points.push({ x: portalCoords.x, y: portalCoords.y });

    if (points.length < 2) return '';
    let path = `M ${points[0].x}% ${points[0].y}%`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const mx = (p0.x + p1.x) / 2;
      const my = (p0.y + p1.y) / 2;
      path += ` Q ${p0.x}% ${p0.y}%, ${mx}% ${my}%`;
    }
    path += ` L ${points[points.length - 1].x}% ${points[points.length - 1].y}%`;
    return path;
  }, [sortedLevels, levelCoords, portalCoords, portalStartCoords]);

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%',
        maxWidth: 420,
        aspectRatio: '1 / 1.5',
        position: 'relative',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...getThemeBackground(mapTheme),
        transition: 'all 0.3s ease'
      }}
    >
      {svgPathData && (
        <svg
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1
          }}
        >
          {/* Thick glowing organic rope backing */}
          <path
            d={svgPathData}
            fill="none"
            stroke={activeThemeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.18, filter: 'blur(5px)' }}
          />
          <path
            d={svgPathData}
            fill="none"
            stroke={activeThemeColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.55 }}
          />
        </svg>
      )}

      {/* Entry Portal (Green border, bottom portal) */}
      <div
        onPointerDown={(e) => onPointerDown('portalStart', e)}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerUp('portalStart', e)}
        style={{
          position: 'absolute',
          left: `${portalStartCoords.x}%`,
          top: `${portalStartCoords.y}%`,
          transform: 'translate(-50%, -50%)',
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #10b981 0%, #064e3b 100%)',
          border: '2px solid #34d399',
          boxShadow: '0 0 15px rgba(16, 185, 129, 0.6)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 900,
          cursor: 'move',
          zIndex: 10,
          userSelect: 'none',
          touchAction: 'none'
        }}
        title="Entry Portal"
      >
        🌀
      </div>

      {/* Exit Portal (Yellow border, top portal) */}
      <div
        onPointerDown={(e) => onPointerDown('portal', e)}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerUp('portal', e)}
        style={{
          position: 'absolute',
          left: `${portalCoords.x}%`,
          top: `${portalCoords.y}%`,
          transform: 'translate(-50%, -50%)',
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #f59e0b 0%, #b45309 100%)',
          border: '2px solid #ffd700',
          boxShadow: '0 0 15px rgba(245, 158, 11, 0.6)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 900,
          cursor: 'move',
          zIndex: 10,
          userSelect: 'none',
          touchAction: 'none'
        }}
        title="Exit Portal"
      >
        🌀
      </div>

      {/* Level Nodes */}
      {sortedLevels.map((lv, idx) => {
        const coords = levelCoords[lv.id] || { x: 50, y: 50 };
        return (
          <div
            key={lv.id}
            onPointerDown={(e) => onPointerDown(lv.id, e)}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => onPointerUp(lv.id, e)}
            style={{
              position: 'absolute',
              left: `${coords.x}%`,
              top: `${coords.y}%`,
              transform: 'translate(-50%, -50%)',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#0a0f1d',
              border: `2px solid ${activeThemeColor}`,
              boxShadow: `0 0 8px ${activeThemeColor}40`,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'move',
              zIndex: 5,
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            {idx + 1}
          </div>
        );
      })}
    </div>
  );
}
