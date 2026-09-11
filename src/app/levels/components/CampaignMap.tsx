'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { StoredLevel, StoredPlayedLevel } from '@/services/db';
import type { LevelPart } from '@/services/firebase/adminTypes';
import { getMapTheme } from '../mapThemes';
import { LevelNode } from './LevelNode';
import { PortalNode } from './PortalNode';

type LevelEntry = StoredLevel & { id: number };

export interface CampaignMapProps {
  levels: LevelEntry[];
  activePart?: LevelPart;
  hasPortalStart: boolean;
  isSessionCompleted: boolean;
  playedMap: Map<string, StoredPlayedLevel>;
  lockedSet: Set<string>;
  selectedIndex: number | null;
  defaultActiveIndex: number;
  isMobile: boolean;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
  onEntryPortal: () => void;
  onExitPortal: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface Point {
  x: number;
  y: number;
}

function nodePosition(levels: LevelEntry[], activePart: LevelPart | undefined, idx: number): Point {
  const lv = levels[idx];
  const entry = lv?.firestoreId ? activePart?.order[lv.firestoreId] : undefined;
  if (entry?.mapX !== undefined && entry?.mapY !== undefined) {
    return { x: entry.mapX, y: entry.mapY };
  }
  const count = levels.length;
  const ratio = count > 1 ? idx / (count - 1) : 0.5;
  return { x: Math.round(50 + Math.sin(ratio * Math.PI * 3.5) * 35), y: Math.round(85 - ratio * 70) };
}

export function CampaignMap({
  levels,
  activePart,
  hasPortalStart,
  isSessionCompleted,
  playedMap,
  lockedSet,
  selectedIndex,
  defaultActiveIndex,
  isMobile,
  onSelect,
  onActivate,
  onEntryPortal,
  onExitPortal,
  containerRef,
}: CampaignMapProps) {
  const theme = getMapTheme(activePart?.mapTheme);
  const canvasHeight = isMobile ? 900 : 1000;
  const nodeRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const portalStart: Point = {
    x: activePart?.portalStartX ?? 50,
    y: activePart?.portalStartY ?? 90,
  };
  const portalEnd: Point = {
    x: activePart?.portalX ?? 50,
    y: activePart?.portalY ?? 10,
  };

  // Yol noktaları: giriş portalı (varsa) → seviyeler → çıkış portalı.
  // Not: bu hesap ucuz (en fazla düzine nokta) — projedeki React Compiler zaten otomatik
  // memoize ettiği için elle useMemo eklemiyoruz (derleyiciyle çakışmaması için).
  const points: Point[] = [];
  if (hasPortalStart) points.push(portalStart);
  levels.forEach((_, idx) => points.push(nodePosition(levels, activePart, idx)));
  points.push(portalEnd);

  // SVG `d` içine literal "%" yazmak standart değildir (tarayıcılar arası tutarsız);
  // bunun yerine viewBox="0 0 100 100" kullanıp düz sayısal (0-100) koordinatlar veriyoruz.
  let pathData = '';
  if (points.length >= 2) {
    pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      pathData += ` Q ${p0.x} ${p0.y}, ${(p0.x + p1.x) / 2} ${(p0.y + p1.y) / 2}`;
    }
    pathData += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  }

  // idx (levels dizisindeki) → segment durumu ("locked" | "current" | "completed")
  const segmentState = useCallback(
    (levelIdx: number): 'locked' | 'current' | 'completed' => {
      const lv = levels[levelIdx];
      if (!lv) return 'locked';
      const isLocked = lv.firestoreId ? lockedSet.has(lv.firestoreId) : false;
      const isCompleted = lv.firestoreId ? playedMap.has(lv.firestoreId) : false;
      if (isCompleted) return 'completed';
      if (!isLocked) return 'current';
      return 'locked';
    },
    [levels, lockedSet, playedMap],
  );

  // Seçili düğüm değiştiğinde görünüme kaydır (manuel piksel matematiği yerine tarayıcı API'si)
  useEffect(() => {
    if (selectedIndex === null) return;
    const el = nodeRefs.current.get(selectedIndex);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [selectedIndex]);

  // Fareyle sürükleyerek kaydırma (basit pan, fizik yok)
  const panState = useRef<{ active: boolean; startX: number; startY: number; scrollLeft: number; scrollTop: number }>({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const handlePanDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    const c = containerRef.current;
    if (!c) return;
    panState.current = { active: true, startX: e.pageX, startY: e.pageY, scrollLeft: c.scrollLeft, scrollTop: c.scrollTop };
  };
  const handlePanMove = (e: React.MouseEvent) => {
    const s = panState.current;
    const c = containerRef.current;
    if (!s.active || !c) return;
    c.scrollLeft = s.scrollLeft - (e.pageX - s.startX);
    c.scrollTop = s.scrollTop - (e.pageY - s.startY);
  };
  const endPan = () => {
    panState.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handlePanDown}
      onMouseMove={handlePanMove}
      onMouseUp={endPan}
      onMouseLeave={endPan}
      className="absolute inset-0 overflow-y-auto"
      style={{
        overflowX: isMobile ? 'hidden' : 'auto',
        cursor: 'grab',
        touchAction: isMobile ? 'pan-y' : 'pan-x pan-y',
        WebkitOverflowScrolling: 'touch',
        paddingTop: 'calc(var(--hud-h) + 12px)',
        paddingBottom: 'calc(var(--dock-h) + var(--panel-h) + 12px)',
      }}
    >
      <div className="relative mx-auto" style={{ width: isMobile ? '100%' : 800, height: canvasHeight }}>
        {/* İnce ızgara arkaplanı (statik, GPU-ucuz) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, ${theme.gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${theme.gridColor} 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}
        />

        {/* Yol (path) — viewBox 0-100 sayesinde koordinatlar doğrudan yüzdeye eşit */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ zIndex: 1 }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d={pathData}
            fill="none"
            stroke="rgba(71,85,105,0.3)"
            strokeWidth={1.2}
            strokeDasharray="2.5,2.5"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {levels.map((_, i) => {
            const state = segmentState(i);
            if (state === 'locked') return null;
            const p0 = points[i];
            const p1 = points[i + 1];
            if (!p0 || !p1) return null;
            const color = state === 'completed' ? theme.activeColor : '#ffd700';
            return (
              <path
                key={`seg-${i}`}
                d={`M ${p0.x} ${p0.y} Q ${(p0.x + p1.x) / 2} ${(p0.y + p1.y) / 2}, ${p1.x} ${p1.y}`}
                fill="none"
                stroke={color}
                strokeWidth={1.6}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ opacity: 0.85 }}
              />
            );
          })}
        </svg>

        {/* Giriş portalı */}
        {hasPortalStart && (
          <PortalNode x={portalStart.x} y={portalStart.y} kind="start" isUnlocked title="Önceki bölüme dön" onActivate={onEntryPortal} />
        )}

        {/* Seviye düğümleri */}
        {levels.map((lv, idx) => {
          const isLocked = lv.firestoreId ? lockedSet.has(lv.firestoreId) : false;
          const isCompleted = lv.firestoreId ? playedMap.has(lv.firestoreId) : false;
          const isCurrent = idx === defaultActiveIndex && !isLocked && !isCompleted;
          const playedData = lv.firestoreId ? playedMap.get(lv.firestoreId) : undefined;
          const pos = nodePosition(levels, activePart, idx);

          return (
            <LevelNode
              key={lv.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(idx, el);
                else nodeRefs.current.delete(idx);
              }}
              index={idx}
              label={lv.name}
              x={pos.x}
              y={pos.y}
              isLocked={isLocked}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isSelected={selectedIndex === idx}
              stars={playedData?.stars}
              activeColor={theme.activeColor}
              isMobile={isMobile}
              onSelect={() => onSelect(idx)}
              onActivate={() => onActivate(idx)}
            />
          );
        })}

        {/* Çıkış portalı */}
        <PortalNode
          x={portalEnd.x}
          y={portalEnd.y}
          kind="end"
          isUnlocked={isSessionCompleted}
          title={isSessionCompleted ? 'Sonraki bölüme geç' : 'Önce bu bölümü tamamla'}
          onActivate={onExitPortal}
        />
      </div>
    </div>
  );
}
