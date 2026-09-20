'use client';

import { useAppRouter } from '@/lib/navigation';
import { useEffect, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { useGamepad } from '@/hooks/useGamepad';

export function useControlsPage() {
  const t = useT();
  const router = useAppRouter();
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

  return { t, router, activeButtons, axes, gamepad, isConnected };
}
