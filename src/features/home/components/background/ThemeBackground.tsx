'use client';

import React, { useEffect, useRef } from 'react';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import type { MotionTier } from '../../lib/motionTier';
import {
  createParticlePool,
  getThemePalette,
  updateAndRenderPool,
} from './particleEngine';

interface ThemeBackgroundProps {
  motionTier: MotionTier;
}

/** Mobil (dar ekran) için partikül sayısı; masaüstünde iki katı. */
const MOBILE_BREAKPOINT = 768;
const PARTICLES_MOBILE = 10;
const PARTICLES_DESKTOP = 22;

export function ThemeBackground({ motionTier }: ThemeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme, themeConfig } = useGameTheme();
  const isLite = motionTier === 'lite';

  useEffect(() => {
    if (isLite) return;

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
    // Mobilde dpr'yi 1'e sabitliyoruz: 2x tuval, ekranı dolduran bir efekt için
    // WebView'de dört katı fill-rate demek ve gözle görülür bir kazanç yok.
    const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

    /*
     * DİKKAT: `ctx.scale()` KÜMÜLATİFTİR. Önceki sürüm her resize'da tekrar
     * scale çağırıyordu; mobilde adres çubuğunun açılıp kapanması bile resize
     * ürettiği için ölçek katlanıyor ve arka plan bozuluyordu. `setTransform`
     * matrisi her seferinde sıfırdan kurar.
     */
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
  }, [isLite, theme, themeConfig.accentColor]);

  // Düşük performanslı cihaz / reduced-motion: kare başına iş yapmayan,
  // yalnızca bir kez boyanan statik katman.
  if (isLite) {
    return <div className="home-bg-static" aria-hidden="true" />;
  }

  return <canvas ref={canvasRef} className="home-bg-canvas" aria-hidden="true" />;
}
