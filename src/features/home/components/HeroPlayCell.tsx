'use client';

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { PlayerGraphic } from '@/game-engine/components/entities/PlayerGraphic';
import { Entity } from '@/game-engine/logic/entityTypes';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { PuzzleWinBurst } from './PuzzleWinBurst';
import type { HomeMenuItem, SlidePhase } from '../hooks/useHomePage';

interface HeroPlayCellProps {
  item: HomeMenuItem;
  phase: SlidePhase;
  isActive: boolean;
  onSelect: () => void;
  onTrigger: () => void;
  onSlideEnd: () => void;
}

/**
 * Ana menünün tek birincil eylemi: PLAY. "Tahta = menü" dili korunur — soldaki
 * dock hücresinden hedefe uzanan bir kulvar, üzerinde gerçek oyun karakteri.
 *
 * Tüm hareket CSS'ten gelir (bkz. src/app/home.css). Bu bileşen yalnızca
 * `data-phase` yazar; kayma mesafesi ray/runner yapısı sayesinde piksel hesabı
 * gerektirmez, `translateX(100%)` ekran boyutundan bağımsız çalışır.
 */
function HeroPlayCellBase({
  item,
  phase,
  isActive,
  onSelect,
  onTrigger,
  onSlideEnd,
}: HeroPlayCellProps) {
  const { themeConfig } = useGameTheme();
  const color = item.color;
  const isBusy = phase !== 'idle';

  // Seçim giriş/çıkış animasyonu: Play'den ayrılınca ani kesilmemesi için 'exiting' geçişi kullanılır
  const [animMode, setAnimMode] = useState<'idle' | 'active' | 'exiting'>('idle');
  const wasActiveRef = useRef(isActive);

  useEffect(() => {
    if (isActive) {
      setAnimMode('active');
    } else if (wasActiveRef.current) {
      setAnimMode('exiting');
      const timer = setTimeout(() => {
        setAnimMode('idle');
      }, 360);
      return () => clearTimeout(timer);
    }
    wasActiveRef.current = isActive;
  }, [isActive]);

  // Karakter grafiği gerçek oyun varlığını kullanır — menü ile oyun aynı dili konuşur.
  const playerEntity: Entity = useMemo(
    () => ({
      id: 1,
      type: 'player',
      position: { row: 0, col: 0 },
      physics: { direction: phase === 'idle' || phase === 'freeze' ? 'up' : 'right', force: 0, z: 0 },
      def: { mass: 1, resistance: 0, isSolid: true },
      traits: new Set(),
      isElectrified: false,
      customData: { playerIndex: 0, mode: 'normal' },
    }),
    [phase]
  );

  return (
    <div
      className="home-hero"
      role="button"
      tabIndex={0}
      aria-label={item.label}
      data-phase={phase}
      data-active={isActive}
      onPointerEnter={(e) => {
        // Dokunmatikte sentetik mouse olayı seçim/ses tetiklemesin.
        if (e.pointerType === 'mouse' && !isBusy && !isActive) onSelect();
      }}
      onClick={() => {
        if (isBusy) return;
        onSelect();
        onTrigger();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isBusy) onTrigger();
        }
      }}
    >
      {/* Sol: karakterin beklediği dock hücresi */}
      <div
        className="home-hero__dock"
        style={{
          background: themeConfig.normalCell.background,
          border: `2px solid ${color}`,
        }}
      >
        <span
          className="home-glow"
          style={{ boxShadow: `0 0 16px ${color}70, inset 0 0 10px ${color}35` }}
        />
        <span className="home-hero__dock-mark" style={{ borderColor: color }} />
      </div>

      {/* Orta: kulvar */}
      <div
        className="home-hero__track"
        style={{
          background: `linear-gradient(90deg, ${color}22 0%, rgba(8, 16, 30, 0.88) 55%, ${color}18 100%)`,
          border: `1.5px solid ${color}70`,
        }}
      >
        {/* Kulvarın kendi parlaması yalnızca inset — dış gölge overflow ile kırpılırdı. */}
        <span className="home-glow" style={{ boxShadow: `inset 0 0 18px ${color}28` }} />
        <span className="home-hero__grid-lines" />
        <span className="home-hero__ice" />
        <span className="home-hero__sweep" />

        <span className="home-hero__label">
          <span className="home-hero__label-title">{item.label}</span>
          <span className="home-hero__label-sub">{item.sub}</span>
        </span>

        <span className="home-hero__chevrons" aria-hidden="true">
          <span className="home-ambient">›</span>
          <span className="home-ambient">›</span>
          <span className="home-ambient">›</span>
        </span>
      </div>

      {/* Sağ: hedef hücresi */}
      <div
        className="home-hero__target"
        style={{
          background: `linear-gradient(135deg, ${color}28 0%, rgba(12, 20, 36, 0.92) 100%)`,
          border: `2px solid ${color}`,
        }}
      >
        <span
          className="home-glow"
          style={{ boxShadow: `0 0 20px ${color}70, inset 0 0 14px ${color}38` }}
        />
        <span className="home-hero__ring home-ambient" style={{ borderColor: color }} />
        <span className="home-hero__core home-ambient" style={{ color }}>
          ◎
        </span>
      </div>

      {/*
        Ray dock merkezinden hedef merkezine uzanır; runner tam bu genişlikte
        olduğu için `translateX(100%)` tam hedefe oturur.
      */}
      <div className="home-hero__rail" aria-hidden="true">
        {/* İz rayın içinde, runner'ın DIŞINDA: runner kayarken iz yerinde kalmalı. */}
        <div className="home-hero__trail" />

        <div
          className="home-hero__runner"
          onAnimationEnd={(e) => {
            if (e.animationName.startsWith('homeSlide')) onSlideEnd();
          }}
        >
          <div className="home-hero__player">
            <div className="home-hero__player-inner">
              <div
                className="home-hero__player-float"
                data-anim={phase !== 'idle' ? phase : animMode}
              >
                <div
                  className="home-hero__player-spin"
                  data-anim={phase !== 'idle' ? phase : animMode}
                >
                  <PlayerGraphic entity={playerEntity} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hedefe varış patlaması — hedef hücresinin merkezinde. */}
      {phase === 'won' && (
        <PuzzleWinBurst top="50%" left="calc(100% - var(--home-cell) / 2)" />
      )}
    </div>
  );
}

export const HeroPlayCell = memo(HeroPlayCellBase);
