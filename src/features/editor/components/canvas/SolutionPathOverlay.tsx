import type { Position } from '@/game-engine/level-format';
import type { RoomPositions } from './canvasTypes';

type TrajectoryPoint = { roomId?: string; row: number; col: number; stepIndex?: number };

interface SolutionPathOverlayProps {
  trajectory: { player1: Position[]; player2: Position[] };
  roomPositions: RoomPositions;
  cellSize: number;
  totalWidth: number;
  totalHeight: number;
}

/**
 * Animated optimal-solution path (P1 green, P2 blue) + numbered step markers.
 * Also defines the `crawlPath` keyframes that the portal connection overlay reuses.
 */
export default function SolutionPathOverlay({ trajectory, roomPositions, cellSize, totalWidth, totalHeight }: SolutionPathOverlayProps) {
  const getOffsetPoints = (
    points: TrajectoryPoint[],
    isPlayer2: boolean
  ) => {
    const visitMap: Record<string, number> = {};
    const mapped = points.map((p) => {
      const rId = p.roomId ?? 'main';
      const offset = roomPositions[rId];
      if (!offset) return null;

      const key = `${rId}-${p.row},${p.col}`;
      const visitIndex = visitMap[key] || 0;
      if (p.stepIndex !== undefined) {
        visitMap[key] = visitIndex + 1;
      }

      const baseX = offset.left + p.col * cellSize + cellSize / 2;
      const baseY = offset.top + p.row * cellSize + cellSize / 2;

      let dx = 0;
      let dy = 0;
      if (visitIndex > 0 && p.stepIndex !== undefined) {
        // Symmetrically offset visits. Shift Player 2 by an extra 22.5 degrees (PI/8) to prevent overlaps between player paths.
        const baseAngle = ((visitIndex - 1) * Math.PI / 2) + Math.PI / 4;
        const angle = isPlayer2 ? baseAngle + Math.PI / 8 : baseAngle;
        const dist = cellSize * 0.22;
        dx = Math.cos(angle) * dist;
        dy = Math.sin(angle) * dist;
      }

      return {
        x: baseX + dx,
        y: baseY + dy,
        row: p.row,
        col: p.col,
        stepIndex: p.stepIndex,
      };
    });
    return mapped.filter((pt): pt is NonNullable<typeof pt> => pt !== null);
  };

  const p1Offsets = trajectory.player1 ? getOffsetPoints(trajectory.player1, false) : [];
  const p2Offsets = trajectory.player2 ? getOffsetPoints(trajectory.player2, true) : [];

  const getSvgPathFromOffsets = (offsets: { x: number; y: number }[]) => {
    if (offsets.length < 2) return '';
    return offsets.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  };

  const circleRadius = cellSize * 0.16;
  const fontSize = Math.max(7, Math.round(cellSize * 0.18));

  const renderPath = (offsets: { x: number; y: number }[], stroke: string) => (
    <path
      d={getSvgPathFromOffsets(offsets)}
      fill="none"
      stroke={stroke}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="6, 6"
      filter="url(#pathGlow)"
      style={{ animation: 'crawlPath 1.2s linear infinite' }}
      opacity={0.8}
    />
  );

  const renderMarkers = (offsets: ReturnType<typeof getOffsetPoints>, prefix: string, color: string) =>
    offsets.filter((pt) => pt.stepIndex !== undefined).map((pt) => (
      <g key={`${prefix}-${pt.stepIndex}`}>
        <circle
          cx={pt.x}
          cy={pt.y}
          r={circleRadius}
          fill="#060d1a"
          stroke={color}
          strokeWidth={1.5}
        />
        <text
          x={pt.x}
          y={pt.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={`${fontSize}px`}
          fontWeight="bold"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {pt.stepIndex}
        </text>
      </g>
    ));

  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0,
        width: totalWidth, height: totalHeight,
        pointerEvents: 'none', zIndex: 35
      }}
    >
      <defs>
        <filter id="pathGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <style dangerouslySetInnerHTML={{ __html: `
                @keyframes crawlPath {
                  to { stroke-dashoffset: -20; }
                }
              `}} />
      {p1Offsets.length > 1 && renderPath(p1Offsets, '#00ff88')}
      {p2Offsets.length > 1 && renderPath(p2Offsets, '#00c4ff')}

      {/* Player 1 Waypoint Markers */}
      {renderMarkers(p1Offsets, 'p1', '#00ff88')}

      {/* Player 2 Waypoint Markers */}
      {renderMarkers(p2Offsets, 'p2', '#00c4ff')}
    </svg>
  );
}
