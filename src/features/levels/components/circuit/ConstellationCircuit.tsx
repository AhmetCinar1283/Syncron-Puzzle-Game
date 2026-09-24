'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useT } from '@/contexts/LanguageContext';
import type { StoredLevel, StoredPlayedLevel } from '@/services/db';
import type { LevelThemeDefinition } from '../../themes/types';
import { calculateCircuitLayout, type CircuitPoint } from '../../lib/circuitCalculations';
import { ConstellationNode } from './ConstellationNode';
import { EnergyPathSvg } from './EnergyPathSvg';
import { CircuitPortalNode } from './CircuitPortalNode';
import { LevelsMascot } from './LevelsMascot';

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

  // Seçim, kaydırma takibinden (veya tıklamadan) geldiyse otomatik ortalama kaydırmayı atla
  // (böylece sayfa kullanıcının parmağına/tekerleğine karşı "akmaz")
  const skipAutoScrollRef = useRef(false);
  // Programatik (kod tarafından tetiklenen) kaydırma sürerken, kaydırma takibinin
  // seçimi değiştirmesini engelleyen bayrak (klavye/gamepad ile hedefe süzülürken çakışmayı önler)
  const suppressScrollTrackingRef = useRef(false);
  const suppressScrollTrackingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMountRef = useRef(true);
  const prevLevelsRef = useRef(levels);

  useEffect(() => {
    return () => {
      if (suppressScrollTrackingTimerRef.current) clearTimeout(suppressScrollTrackingTimerRef.current);
    };
  }, []);

  // Dinamik yükseklik ve düğüm koordinatlarını hesapla
  const layout = useMemo(() => {
    return calculateCircuitLayout(levels.length, isMobile, hasPortalStart);
  }, [levels.length, isMobile, hasPortalStart]);

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
  const scrollToLevel = useCallback(
    (targetIdx: number, smooth = true) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Bu, kod tarafından tetiklenen bir kaydırma — bitene kadar kaydırma takibinin
      // seçimi ele geçirip hedefle çakışmasını engelle
      suppressScrollTrackingRef.current = true;
      if (suppressScrollTrackingTimerRef.current) clearTimeout(suppressScrollTrackingTimerRef.current);
      suppressScrollTrackingTimerRef.current = setTimeout(
        () => {
          suppressScrollTrackingRef.current = false;
        },
        smooth ? 600 : 100,
      );

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
    },
    [scrollContainerRef, layout.nodePoints],
  );

  // Kaydırma konumuna göre "şu an ekranda olan" seviyenin index'ini bulur.
  // Ham piksel-merkez mesafesi yerine kaydırma *ilerlemesini* (0 = en üst, 1 = en alt)
  // düğümlerin kendi konum aralığına eşliyoruz. Böylece:
  //  - En üste tam kaydırıldığında her zaman ilk seviye, en alta tam kaydırıldığında
  //    her zaman son seviye seçilir (viewport düğüm aralığından büyük/küçük olsa bile).
  //  - Aradaki seviyeler kaydırma oranına göre doğal bir sırayla seçilir.
  const getNearestIndexToCenter = useCallback(() => {
    const container = scrollContainerRef.current;
    const points = layout.nodePoints;
    if (!container || points.length === 0) return null;

    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const progress = maxScroll > 0 ? Math.max(0, Math.min(1, container.scrollTop / maxScroll)) : 0;

    const minY = points[0].yPx;
    const maxY = points[points.length - 1].yPx;
    const targetY = minY + progress * (maxY - minY);

    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].yPx - targetY);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    return nearestIdx;
  }, [scrollContainerRef, layout.nodePoints]);

  // 1. Serbest kaydırma (mouse tekerleği, touch sürükleme, trackpad — hepsi native scroll):
  // kaydırdıkça o anki seviyeyi canlı olarak seçili hale getir.
  // NOT: 'scroll' olayına değil, her animasyon karesinde scrollTop'u okuyan sürekli bir
  // döngüye dayanıyor — bazı Android tarayıcılarında touch kaydırma sırasında 'scroll'
  // olayının güvenilmez/seyrek tetiklenmesi (event coalescing) yüzünden seçim hiç
  // güncellenmiyordu; doğrudan konum okumak tüm platformlarda tutarlı çalışır.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId: number;
    let lastScrollTop = container.scrollTop;

    const tick = () => {
      rafId = requestAnimationFrame(tick);

      const st = container.scrollTop;
      if (Math.abs(st - lastScrollTop) < 0.5) return;
      lastScrollTop = st;

      if (suppressScrollTrackingRef.current) return;

      const nearest = getNearestIndexToCenter();
      if (nearest === null) return;

      const current = selectedIndex !== null ? selectedIndex : defaultActiveIndex;
      if (nearest !== current) {
        skipAutoScrollRef.current = true;
        onSelect(nearest);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [scrollContainerRef, getNearestIndexToCenter, selectedIndex, defaultActiveIndex, onSelect]);

  // 2. Seçili seviye veya chapter değiştiğinde otomatik kaydırma (auto-scroll)
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

    if (skipAutoScrollRef.current && !isChapterChange) {
      skipAutoScrollRef.current = false;
      return;
    }

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

  // Maskotun takip ettiği seviye ve durumu (ConstellationNode ile aynı türetme)
  const followIdx = levels.length > 0 ? (selectedIndex ?? defaultActiveIndex) : -1;
  const followLevel = levels[followIdx];
  const followMood = useMemo(() => {
    const fid = followLevel?.firestoreId;
    const played = fid ? playedMap.get(fid) : undefined;
    const isLocked = fid ? lockedSet.has(fid) : false;
    const isCompleted = !!played;
    const isSkipped = !isCompleted && !!fid && skippedSet.has(fid);
    return {
      isLocked,
      isCompleted,
      isSkipped,
      isCurrent: followIdx === defaultActiveIndex && !isLocked && !isCompleted && !isSkipped,
      stars: played?.stars ?? 0,
    };
  }, [followLevel, followIdx, defaultActiveIndex, playedMap, lockedSet, skippedSet]);

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
                skipAutoScrollRef.current = idx !== selectedIndex;
                onSelect(idx);
              }}
              onPlay={() => onPlay(lv)}
            />
          );
        })}

        {/* 3b. Seçili seviyeyi takip eden maskot */}
        <LevelsMascot point={layout.nodePoints[followIdx]} mood={followMood} isMobile={isMobile} />

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
