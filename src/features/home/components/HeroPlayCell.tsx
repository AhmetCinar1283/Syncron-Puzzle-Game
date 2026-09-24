'use client';

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { PlayerGraphic } from '@/game-engine/components/entities/PlayerGraphic';
import type { MascotHandle } from '@/game-engine/components/entities/MascotView';
import { useMotionTier } from '@/lib/motionTier';
import { useMascotShow } from '@/components/ui/useMascotShow';
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
  // Mod değişimi `isActive` prop'unun DEĞİŞİMİNE bağlıdır; bunu efektte değil,
  // değişimi fark ettiğimiz render'da yapıyoruz (React'in "prop değişince state'i
  // ayarla" örüntüsü). Efektte yalnızca 'exiting' -> 'idle' zamanlayıcısı kalıyor.
  const [animMode, setAnimMode] = useState<'idle' | 'active' | 'exiting'>(isActive ? 'active' : 'idle');
  const [wasActive, setWasActive] = useState(isActive);

  if (isActive !== wasActive) {
    setWasActive(isActive);
    setAnimMode(isActive ? 'active' : 'exiting');
  }

  useEffect(() => {
    if (animMode !== 'exiting') return;
    const timer = setTimeout(() => {
      setAnimMode('idle');
    }, 360);
    return () => clearTimeout(timer);
  }, [animMode]);

  // Seçiliyken maskot kendi etrafında dönmez; mini senaryolar (bkz. lib/heroScenes.ts)
  // ve ara sıra tek ifadeler oynar. Sahneler arasında bekleme var, spam yok.
  const mascotRef = useRef<MascotHandle>(null);
  const lively = useMotionTier() === 'full';
  const showing = isActive && phase === 'idle' && lively;

  // firstDelay: açılış "happy" ifadesi (aşağıdaki efekt) bitsin.
  useMascotShow(mascotRef, { enabled: showing, firstDelay: 2400 });

  // Play seçili değilken maskot uyur (sleepy döngüsel); seçilince happy ile uyanır.
  // Bildirim sırası önemli: yukarıdaki efektin temizliği `stop()` çağırır, bu efekt ondan sonra çalışır.
  useEffect(() => {
    const handle = mascotRef.current;
    if (!handle) return;
    if (isActive) {
      handle.stop('sleepy');
      handle.emote('happy', { force: true });
    } else {
      handle.emote('sleepy', { force: true });
    }
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
                  <PlayerGraphic ref={mascotRef} entity={playerEntity} />
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
