'use client';

import React, { useRef, useState } from 'react';
import { GameIcon } from '@/components/icons';
import type { SwipeDirection } from '../hooks/useControlsPage';
import { useAppRouter } from '@/lib/navigation';

interface TouchControlsCardProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  lastSwipeDir: SwipeDirection | null;
  onTestSwipe: (dir: SwipeDirection) => void;
}

export function TouchControlsCard({ t, lastSwipeDir, onTestSwipe }: TouchControlsCardProps) {
  const router = useAppRouter();
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [activeCompassDir, setActiveCompassDir] = useState<SwipeDirection | null>(null);

  // Handle touch or mouse swipe detection inside the test pad
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const minDistance = 24;

    if (Math.max(absX, absY) < minDistance) return;

    let dir: SwipeDirection;
    if (absX > absY) {
      dir = dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      dir = dy > 0 ? 'DOWN' : 'UP';
    }

    onTestSwipe(dir);
    setActiveCompassDir(dir);
    setTimeout(() => setActiveCompassDir(null), 350);
  };

  const handlePointerDown = (dir: SwipeDirection) => {
    onTestSwipe(dir);
    setActiveCompassDir(dir);
    setTimeout(() => setActiveCompassDir(null), 350);
  };

  const highlightedDir = activeCompassDir || lastSwipeDir;

  return (
    <div
      style={{
        background: 'rgba(10, 18, 32, 0.75)',
        border: '1px solid var(--ctrl-accent-soft, rgba(0, 196, 255, 0.2))',
        borderRadius: 'var(--ctrl-card-radius, 16px)',
        padding: 'clamp(16px, 4vw, 24px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Header */}
      <h2
        style={{
          fontSize: 'clamp(15px, 3.5vw, 18px)',
          fontWeight: 900,
          color: 'var(--ctrl-accent, #00c4ff)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderBottom: '1px solid var(--ctrl-accent-soft, rgba(0, 196, 255, 0.2))',
          paddingBottom: 12,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <GameIcon name="joystick" size={22} color="var(--ctrl-accent, #00c4ff)" />
        <span>{t('controls.touch_title')}</span>
      </h2>

      {/* Description info */}
      <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
        {t('controls.touch_desc')}
      </p>

      {/* Swipe Mechanics & Interactive Test Pad */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--ctrl-radius, 12px)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', letterSpacing: '0.04em' }}>
            {t('controls.swipe_label')}
          </span>
          {highlightedDir && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: 'var(--ctrl-accent, #00c4ff)',
                background: 'var(--ctrl-accent-soft, rgba(0, 196, 255, 0.15))',
                border: '1px solid var(--ctrl-accent, #00c4ff)',
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: '0.05em',
                boxShadow: '0 0 10px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.3))',
              }}
            >
              {t('controls.swiped', { dir: highlightedDir })}
            </span>
          )}
        </div>

        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          {t('controls.swipe_desc')}
        </p>

        {/* Interactive Gesture Compass / Test Area */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(6, 13, 26, 0.8) 0%, rgba(10, 18, 32, 0.95) 100%)',
            border: '1.5px dashed var(--ctrl-accent-soft, rgba(0, 196, 255, 0.3))',
            borderRadius: 'var(--ctrl-radius, 10px)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
            cursor: 'grab',
            minHeight: 140,
            overflow: 'hidden',
          }}
        >
          {/* Compass layout */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {/* UP */}
            <button
              type="button"
              onClick={() => handlePointerDown('UP')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--ctrl-btn-radius, 8px)',
                background: highlightedDir === 'UP' ? 'var(--ctrl-accent, #00c4ff)' : 'rgba(255, 255, 255, 0.06)',
                border: highlightedDir === 'UP' ? '1.5px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                color: highlightedDir === 'UP' ? '#000000' : '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: highlightedDir === 'UP' ? '0 0 14px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.6))' : 'none',
                transform: highlightedDir === 'UP' ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <GameIcon name="arrow-up" size={18} color={highlightedDir === 'UP' ? '#000000' : '#f8fafc'} />
            </button>

            {/* LEFT / CENTER / RIGHT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => handlePointerDown('LEFT')}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--ctrl-btn-radius, 8px)',
                  background: highlightedDir === 'LEFT' ? 'var(--ctrl-accent, #00c4ff)' : 'rgba(255, 255, 255, 0.06)',
                  border: highlightedDir === 'LEFT' ? '1.5px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: highlightedDir === 'LEFT' ? '#000000' : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: highlightedDir === 'LEFT' ? '0 0 14px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.6))' : 'none',
                  transform: highlightedDir === 'LEFT' ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <GameIcon name="arrow-left" size={18} color={highlightedDir === 'LEFT' ? '#000000' : '#f8fafc'} />
              </button>

              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--ctrl-accent-soft, rgba(0, 196, 255, 0.2))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  color: 'var(--ctrl-accent, #00c4ff)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                SWIPE
              </div>

              <button
                type="button"
                onClick={() => handlePointerDown('RIGHT')}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--ctrl-btn-radius, 8px)',
                  background: highlightedDir === 'RIGHT' ? 'var(--ctrl-accent, #00c4ff)' : 'rgba(255, 255, 255, 0.06)',
                  border: highlightedDir === 'RIGHT' ? '1.5px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: highlightedDir === 'RIGHT' ? '#000000' : '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: highlightedDir === 'RIGHT' ? '0 0 14px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.6))' : 'none',
                  transform: highlightedDir === 'RIGHT' ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <GameIcon name="arrow-right" size={18} color={highlightedDir === 'RIGHT' ? '#000000' : '#f8fafc'} />
              </button>
            </div>

            {/* DOWN */}
            <button
              type="button"
              onClick={() => handlePointerDown('DOWN')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--ctrl-btn-radius, 8px)',
                background: highlightedDir === 'DOWN' ? 'var(--ctrl-accent, #00c4ff)' : 'rgba(255, 255, 255, 0.06)',
                border: highlightedDir === 'DOWN' ? '1.5px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
                color: highlightedDir === 'DOWN' ? '#000000' : '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: highlightedDir === 'DOWN' ? '0 0 14px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.6))' : 'none',
                transform: highlightedDir === 'DOWN' ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <GameIcon name="arrow-down" size={18} color={highlightedDir === 'DOWN' ? '#000000' : '#f8fafc'} />
            </button>
          </div>

          <span style={{ marginTop: 12, fontSize: 10, color: '#64748b', letterSpacing: '0.04em' }}>
            {t('controls.test_swipe_hint')}
          </span>
        </div>
      </div>

      {/* On-Screen D-Pad Option */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--ctrl-radius, 12px)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', letterSpacing: '0.04em' }}>
          {t('controls.dpad_touch_label')}
        </span>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          {t('controls.dpad_touch_desc')}
        </p>

        {/* Action Link to Settings */}
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            onClick={() => router.push('/settings')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 'var(--ctrl-btn-radius, 8px)',
              background: 'var(--ctrl-accent-soft, rgba(0, 196, 255, 0.12))',
              border: '1px solid var(--ctrl-accent, #00c4ff)',
              color: 'var(--ctrl-accent, #00c4ff)',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 0 10px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.2))',
              transition: 'all 0.15s ease',
            }}
          >
            <GameIcon name="settings" size={14} color="var(--ctrl-accent, #00c4ff)" />
            <span>{t('controls.open_settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
