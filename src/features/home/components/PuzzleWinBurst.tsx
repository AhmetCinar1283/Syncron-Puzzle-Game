'use client';

import React, { useMemo } from 'react';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';

interface PuzzleWinBurstProps {
  top: number | string;
  left: number | string;
}

interface Particle {
  id: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
}

/**
 * Hero hedefe ulaştığında patlayan kıvılcım efekti.
 *
 * Keyframe'ler src/app/home.css'te (`homeBurst*`) tanımlıdır — eskiden bu
 * bileşen kendi <style> bloğunu DOM'a basıyordu. Parçacıklar deterministik
 * üretilir (Math.random yok), böylece SSR/CSR çıktısı ayrışmaz.
 */
export function PuzzleWinBurst({ top, left }: PuzzleWinBurstProps) {
  const { theme, themeConfig } = useGameTheme();
  const isArcade = theme === 'arcade';

  const particles = useMemo(() => {
    const colors =
      theme === 'arcade'
        ? ['#facc15', '#ef4444', '#3b82f6', '#00ff88', '#ffffff']
        : theme === 'blueprint'
        ? ['#38bdf8', '#bae6fd', '#0284c7', '#ffffff']
        : theme === 'cosmic'
        ? ['#c084fc', '#a78bfa', '#f472b6', '#ffffff']
        : ['#00ff88', '#00c4ff', '#ffd700', '#ffffff'];

    const count = 18;
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (((i * 17) % 7) - 3) * 0.05;
      const speed = 40 + ((i * 31) % 40);
      list.push({
        id: i,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        size: 3 + ((i * 13) % 4),
        color: colors[i % colors.length],
        delay: (i % 5) * 0.015,
      });
    }
    return list;
  }, [theme]);

  return (
    <div className="home-burst" style={{ top, left }}>
      <div
        className="home-burst__flash"
        style={{
          borderRadius: '50%',
          background: `radial-gradient(circle, #ffffff 0%, ${themeConfig.accentColor} 60%, transparent 100%)`,
        }}
      />

      <div
        className="home-burst__wave"
        style={{
          borderRadius: isArcade ? 0 : '50%',
          border: `2.5px solid ${themeConfig.accentColor}`,
        }}
      />

      {particles.map((p) => (
        <div
          key={p.id}
          className="home-burst__spark"
          style={
            {
              width: p.size,
              height: p.size,
              borderRadius: isArcade ? 0 : '50%',
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
