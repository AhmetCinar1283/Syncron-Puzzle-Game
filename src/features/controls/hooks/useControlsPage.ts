'use client';

import { useAppRouter } from '@/lib/navigation';
import { useEffect, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { useGamepad } from '@/hooks/useGamepad';
import { NEON_TYPES, type Particle } from '../lib/constants';

export function useControlsPage() {
  const t = useT();
  const router = useAppRouter();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeButtons, setActiveButtons] = useState<Record<number, boolean>>({});
  const [axes, setAxes] = useState<number[]>([0, 0, 0, 0]);

  // Use hook to detect gamepad and listen to inputs
  const { gamepad, isConnected } = useGamepad({
    onButtonPress: (index, pressed) => {
      setActiveButtons(prev => ({ ...prev, [index]: pressed }));
    },
    onAxisMove: (index, val) => {
      setAxes(prev => {
        const next = [...prev];
        next[index] = val;
        return next;
      });
      // Scroll page vertically using Right Stick Y (axis 3)
      if (index === 3 && Math.abs(val) > 0.15) {
        window.scrollBy({ top: val * 22, behavior: 'auto' });
      }
    },
    onMenu: () => router.push('/'),
    onMove: (dir) => {
      if (dir === 'up') {
        window.scrollBy({ top: -180, behavior: 'smooth' });
      } else if (dir === 'down') {
        window.scrollBy({ top: 180, behavior: 'smooth' });
      }
    }
  });

  // Keyboard navigation: Esc or Enter → back to home, ArrowUp/ArrowDown/PageUp/PageDown → scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/');
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        window.scrollBy({ top: -180, behavior: 'smooth' });
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        window.scrollBy({ top: 180, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Generate background neon particles
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const list: Particle[] = Array.from({ length: 15 }, (_, i) => {
      const type = NEON_TYPES[i % NEON_TYPES.length];
      return {
        id: i,
        color: type.color,
        glow: type.glow,
        size: 8 + Math.random() * 12,
        startX: Math.random() * vw,
        startY: Math.random() * vh,
        driftX: (Math.random() - 0.5) * 60,
        duration: 15 + Math.random() * 15,
        delay: -(Math.random() * 20),
        opacity: 0.08 + Math.random() * 0.15,
        borderRadius: Math.random() > 0.5 ? 50 : 4,
      };
    });
    setParticles(list);
  }, []);

  return { t, router, particles, activeButtons, axes, gamepad, isConnected };
}
