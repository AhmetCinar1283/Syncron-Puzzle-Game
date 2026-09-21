'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = containerRef || internalContainerRef;
  const contentRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const [contentWidth, setContentWidth] = useState(400);

  // Kaydırma (scroll/touch) esnasında hover olayının seçimi bozmasını engellemek için bayrak
  const isScrollNavigatingRef = useRef(false);
  // Dokunmatik ekranda sürükleme yaparken seviyenin yanlışlıkla açılmasını engelleyen bayrak
  const isSwipingRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const prevLevelsRef = useRef(levels);

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

  // Belirli bir seviyeyi dikeyde tam merkeze getiren pürüzsüz kaydırma fonksiyonu
  const scrollToLevel = (targetIdx: number, smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const pt = layout.nodePoints[targetIdx];
    if (!pt) {
      const el = nodeRefs.current.get(targetIdx);
      el?.scrollIntoView({
        behavior: smooth ? 'smooth' : 'instant',
        block: 'center',
        inline: 'center',
      });
      return;
    }

    // Seviye düğümünün dikey piksel konumu eksi ekran yüksekliğinin yarısı
    const targetTop = pt.yPx - container.clientHeight / 2;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const clampedTop = Math.max(0, Math.min(targetTop, maxScroll));

    container.scrollTo({
      top: clampedTop,
      behavior: smooth ? 'smooth' : 'instant',
    });
  };

  // Seviye adım fonksiyonu (ileri +1, geri -1)
  const stepLevel = useCallback(
    (delta: -1 | 1) => {
      if (levels.length === 0) return;
      const current = selectedIndex !== null ? selectedIndex : defaultActiveIndex;
      const next = Math.max(0, Math.min(levels.length - 1, current + delta));
      if (next !== current) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(10);
        }
        onSelect(next);
      }
    },
    [levels.length, selectedIndex, defaultActiveIndex, onSelect],
  );

  // 1. Masaüstü/Web: Fare tekerleği (wheel) ile seviyeler arası adım adım geçiş
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let wheelAccumulator = 0;
    let wheelCooldown = false;
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;
    let navTimer: ReturnType<typeof setTimeout> | null = null;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (wheelCooldown) return;

      wheelAccumulator += e.deltaY;

      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        wheelAccumulator = 0;
      }, 150);

      const WHEEL_THRESHOLD = 30;

      if (Math.abs(wheelAccumulator) >= WHEEL_THRESHOLD) {
        const delta: -1 | 1 = wheelAccumulator > 0 ? 1 : -1;
        wheelAccumulator = 0;
        wheelCooldown = true;
        isScrollNavigatingRef.current = true;

        stepLevel(delta);

        setTimeout(() => {
          wheelCooldown = false;
        }, 180);

        if (navTimer) clearTimeout(navTimer);
        navTimer = setTimeout(() => {
          isScrollNavigatingRef.current = false;
        }, 350);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (wheelTimer) clearTimeout(wheelTimer);
      if (navTimer) clearTimeout(navTimer);
    };
  }, [scrollContainerRef, stepLevel]);

  // 2. Mobil/Android/Dokunmatik: Kaydırma (touch swipe/drag) ile seviyeler arası adım adım geçiş
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let touchCooldown = false;
    let navTimer: ReturnType<typeof setTimeout> | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      isSwipingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = touchStartY - currentY; // Pozitif = yukarı kaydırma (sonraki seviye)
      const deltaX = touchStartX - currentX;

      if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isSwipingRef.current = true;
        isScrollNavigatingRef.current = true;

        if (e.cancelable) {
          e.preventDefault();
        }

        const SWIPE_STEP_THRESHOLD = 40;

        if (!touchCooldown && Math.abs(deltaY) >= SWIPE_STEP_THRESHOLD) {
          const delta: -1 | 1 = deltaY > 0 ? 1 : -1;
          touchStartY = currentY; // Sürekli sürüklemede bir sonraki adıma zemin hazırla
          touchCooldown = true;

          stepLevel(delta);

          setTimeout(() => {
            touchCooldown = false;
          }, 160);
        }
      }
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        isSwipingRef.current = false;
      }, 120);

      if (navTimer) clearTimeout(navTimer);
      navTimer = setTimeout(() => {
        isScrollNavigatingRef.current = false;
      }, 350);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      if (navTimer) clearTimeout(navTimer);
    };
  }, [scrollContainerRef, stepLevel]);

  // 3. Seçili seviye veya chapter değiştiğinde otomatik kaydırma (auto-scroll)
  useEffect(() => {
    const targetIdx = selectedIndex !== null ? selectedIndex : defaultActiveIndex;
    if (targetIdx === null || targetIdx === undefined) return;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      const timer = setTimeout(() => {
        scrollToLevel(targetIdx, false);
      }, 50);
      return () => clearTimeout(timer);
    }

    const isChapterChange = prevLevelsRef.current !== levels;
    prevLevelsRef.current = levels;

    // Sektör değiştiğinde anında odaklan; seviye gezintisinde yumuşak süzül
    scrollToLevel(targetIdx, !isChapterChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, defaultActiveIndex, levels, layout.nodePoints]);

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
      ref={scrollContainerRef}
      className="relative flex-1 w-full overflow-y-auto overflow-x-hidden select-none overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              onSelect={() => {
                if (isScrollNavigatingRef.current) return;
                onSelect(idx);
              }}
              onPlay={() => {
                if (isSwipingRef.current) return;
                onPlay(lv);
              }}
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
