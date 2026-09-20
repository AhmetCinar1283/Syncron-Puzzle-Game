'use client';

/**
 * DOSYA AMACI: Uygulama genelinde (RootLayout seviyesinde) çalışan merkezi
 * tema arka planı ve GPU hızlandırmalı parçacık katmanı.
 *
 * MİMARİ:
 * - Sayfalar arasında gezinirken (Next.js client-side navigation) `layout.tsx`
 *   unmount olmadığı için parçacıklar ve tuval asla sıfırlanmaz, kesintisiz
 *   akmaya devam eder.
 * - Kullanıcı ayarlarından tema değiştiğinde (`useGameTheme`), `themeConfig.bgDark`
 *   ve geometrik motifler anında ve yumuşakça güncellenir.
 * - `/play` ve `/editor` rotalarında oyun tahtası odaklılığı ve mobil pil/GPU
 *   tasarrufu için parçacık çizim döngüsü otomatik olarak duraklatılır.
 * - Düşük performanslı cihazlarda (`lite` motion tier) statik katmana düşer.
 */

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useMotionTier } from '@/lib/motionTier';
import {
  createParticlePool,
  getThemePalette,
  updateAndRenderPool,
} from './particleEngine';

/** Mobil (dar ekran) için partikül sayısı; masaüstünde iki katı. */
const MOBILE_BREAKPOINT = 768;
const PARTICLES_MOBILE = 10;
const PARTICLES_DESKTOP = 22;

export function GlobalThemeBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pathname = usePathname();
  const { theme, themeConfig } = useGameTheme();
  const motionTier = useMotionTier();

  const isLite = motionTier === 'lite';
  const isExcludedRoute = pathname?.startsWith('/play') || pathname?.startsWith('/editor');

  useEffect(() => {
    if (isLite || isExcludedRoute) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId = 0;
    let lastTime = performance.now();
    let isRunning = true;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const isMobile = width < MOBILE_BREAKPOINT;
    // Mobilde dpr'yi 1'e sabitliyoruz: WebView'de gereksiz fill-rate yükünü önler.
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    const applySize = () => {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    applySize();

    const colors = getThemePalette(theme, themeConfig.accentColor);
    const pool = createParticlePool(
      isMobile ? PARTICLES_MOBILE : PARTICLES_DESKTOP,
      width,
      height,
      colors
    );

    const animate = (currentTime: number) => {
      if (!isRunning) return;
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      ctx.clearRect(0, 0, width, height);
      updateAndRenderPool(pool, ctx, width, height, theme, dt, colors);

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      applySize();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        cancelAnimationFrame(animationFrameId);
      } else if (!isRunning) {
        isRunning = true;
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLite, isExcludedRoute, theme, themeConfig.accentColor]);

  if (isExcludedRoute) {
    return null;
  }

  return (
    <div
      className="global-theme-bg"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        backgroundColor: themeConfig.bgDark || '#050505',
        transition: 'background-color 0.4s ease',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {isLite ? (
        <div className="home-bg-static" aria-hidden="true" />
      ) : !isExcludedRoute ? (
        <canvas ref={canvasRef} className="home-bg-canvas" aria-hidden="true" />
      ) : null}
    </div>
  );
}
