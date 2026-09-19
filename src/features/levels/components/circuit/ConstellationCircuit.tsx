'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useT } from '@/contexts/LanguageContext';
import type { StoredLevel, StoredPlayedLevel } from '@/services/db';
import type { LevelThemeDefinition } from '../../themes/types';
import { calculateCircuitLayout, type CircuitPoint } from '../../lib/circuitCalculations';
import { ConstellationNode } from './ConstellationNode';
import { EnergyPathSvg } from './EnergyPathSvg';
import { CircuitPortalNode } from './CircuitPortalNode';

type LevelEntry = StoredLevel & { id: number };

export interface ConstellationCircuitProps {
  levels: LevelEntry[];
  hasPortalStart: boolean;
  isSessionCompleted: boolean;
  playedMap: Map<string, StoredPlayedLevel>;
  skippedSet: Set<string>;
  lockedSet: Set<string>;
  selectedIndex: number | null;
  defaultActiveIndex: number;
  themeDef: LevelThemeDefinition;
  isMobile: boolean;
  onSelect: (index: number) => void;
  onPlay: (level: LevelEntry) => void;
  onEntryPortal: () => void;
  onExitPortal: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function ConstellationCircuit({
  levels,
  hasPortalStart,
  isSessionCompleted,
  playedMap,
  skippedSet,
  lockedSet,
  selectedIndex,
  defaultActiveIndex,
  themeDef,
  isMobile,
  onSelect,
  onPlay,
  onEntryPortal,
  onExitPortal,
  containerRef,
}: ConstellationCircuitProps) {
  const t = useT();
  const contentRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [contentWidth, setContentWidth] = useState(400);

  // Dinamik yükseklik ve düğüm koordinatlarını hesapla
  const layout = useMemo(() => {
    return calculateCircuitLayout(levels.length, isMobile);
  }, [levels.length, isMobile]);

  // Tuval genişliğini takip et
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContentWidth(el.clientWidth || 400);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sayfa açıldığında veya chapter değiştiğinde aktif seviyeye yumuşakça süzül
  useEffect(() => {
    const targetIdx = selectedIndex !== null ? selectedIndex : defaultActiveIndex;
    if (targetIdx === null || targetIdx === undefined) return;
    const el = nodeRefs.current.get(targetIdx);
    el?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });
  }, [selectedIndex, defaultActiveIndex]);

  // Tamamlanan bölüm sayısı (enerji hattı için)
  const completedCount = useMemo(() => {
    let count = 0;
    for (const lv of levels) {
      if (lv.firestoreId && (playedMap.has(lv.firestoreId) || skippedSet.has(lv.firestoreId))) {
        count++;
      }
    }
    return count;
  }, [levels, playedMap, skippedSet]);

  // Rota üzerindeki tüm noktalar: (giriş portalı -> seviyeler -> çıkış portalı)
  const allPathPoints: CircuitPoint[] = useMemo(() => {
    const pts: CircuitPoint[] = [];
    if (hasPortalStart) {
      pts.push(layout.startPortal);
    }
    pts.push(...layout.nodePoints);
    pts.push(layout.endPortal);
    return pts;
  }, [hasPortalStart, layout]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full overflow-y-auto overflow-x-hidden select-none [scrollbar-width:thin]"
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        ref={contentRef}
        className="relative mx-auto w-full max-w-lg"
        style={{
          height: layout.canvasHeight,
        }}
      >
        {/* 1. SVG Enerji Yolu */}
        <EnergyPathSvg
          points={allPathPoints}
          containerWidth={contentWidth}
          containerHeight={layout.canvasHeight}
          completedCount={hasPortalStart ? completedCount + 1 : completedCount}
          themeDef={themeDef}
        />

        {/* 2. Başlangıç Portalı (Önceki Bölüme Dönüş) */}
        {hasPortalStart && (
          <CircuitPortalNode
            xPercent={layout.startPortal.xPercent}
            yPx={layout.startPortal.yPx}
            type="start"
            isUnlocked={true}
            themeDef={themeDef}
            label={t('levels.portal_prev_sector')}
            onActivate={onEntryPortal}
          />
        )}

        {/* 3. Seviye Düğümleri (Uzayda Süzülen Gezegen Çekirdekleri) */}
        {levels.map((lv, idx) => {
          const pt = layout.nodePoints[idx];
          if (!pt) return null;

          const isLocked = lv.firestoreId ? lockedSet.has(lv.firestoreId) : false;
          const isCompleted = lv.firestoreId ? playedMap.has(lv.firestoreId) : false;
          const isSkipped = !isCompleted && !!lv.firestoreId && skippedSet.has(lv.firestoreId);
          const isCurrent = idx === defaultActiveIndex && !isLocked && !isCompleted && !isSkipped;
          const isSelected = selectedIndex === idx;
          const playedData = lv.firestoreId ? playedMap.get(lv.firestoreId) : undefined;

          return (
            <ConstellationNode
              key={lv.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(idx, el);
                else nodeRefs.current.delete(idx);
              }}
              level={lv}
              index={idx}
              xPercent={pt.xPercent}
              yPx={pt.yPx}
              isLocked={isLocked}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isSkipped={isSkipped}
              isSelected={isSelected}
              playedData={playedData}
              themeDef={themeDef}
              onSelect={() => onSelect(idx)}
              onPlay={() => onPlay(lv)}
            />
          );
        })}

        {/* 4. Bitiş Portalı (Sonraki Sektöre Warp) */}
        <CircuitPortalNode
          xPercent={layout.endPortal.xPercent}
          yPx={layout.endPortal.yPx}
          type="end"
          isUnlocked={isSessionCompleted}
          themeDef={themeDef}
          label={isSessionCompleted ? t('levels.portal_next_sector') : t('levels.portal_complete_sector')}
          onActivate={onExitPortal}
        />
      </div>
    </div>
  );
}
