'use client';

import React, { useMemo } from 'react';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { ThemeSelectorModal } from '@/game-engine/components/play-screen/ThemeSelectorModal';
import { GameIcon } from '@/components/icons';
import { HomeTopBar } from './HomeTopBar';
import { HeroPlayCell } from './HeroPlayCell';
import { MenuTileGrid } from './MenuTileGrid';
import { MoreMenuSheet } from './MoreMenuSheet';
import { HomeInfoSection } from './HomeInfoSection';
import { useHomePage } from '../hooks/useHomePage';

/** Vurgu renginin CSS'te kullanılan alfa varyantları (yüzde → hex alfa soneki). */
const ACCENT_ALPHA: [name: string, suffix: string][] = [
  ['09', '17'],
  ['12', '1f'],
  ['18', '2e'],
  ['26', '42'],
  ['35', '59'],
  ['45', '73'],
  ['50', '80'],
  ['66', 'a8'],
  ['70', 'b3'],
];

/**
 * Ana menü. Tasarım ilkesi: "tek ekran, tek karar".
 *
 * - Birincil bölge (üst bar + tahta) tek görüntü alanına sığar ve dikeyde
 *   ortalanır; içindeki tek kahraman hücre PLAY'dir.
 * - İkincil eylemler tahtanın altındaki en fazla 4 kare hücrede; fazlası
 *   "Daha fazla" sayfasına iner, böylece yerleşim platform yeteneklerine göre
 *   uzayıp kısalmaz.
 * - Rehber/SEO/hukuk içeriği fold'un altında (bkz. HomeInfoSection).
 *
 * Ölçüler clamp() ile mobil→masaüstü sürekli ölçeklenir; JS'te `isMobile`
 * state'i ve ona bağlı resize render'ı yok (bkz. src/app/home.css).
 */
export function HomePage() {
  const { theme, themeConfig } = useGameTheme();
  const {
    t,
    motionTier,
    playItem,
    tiles,
    overflowItems,
    activeIndex,
    selectIndex,
    slidePhase,
    isSliding,
    triggerPlay,
    onSlideEnd,
    activateIndex,
    resetSlidePhase,
    inputMode,
    isConnected,
    isThemeModalOpen,
    setIsThemeModalOpen,
    isSheetOpen,
    setIsSheetOpen,
  } = useHomePage();

  /*
   * Tema, ağacı yeniden render etmek yerine CSS değişkenleri üzerinden yayılır:
   * tema değiştiğinde yalnızca repaint olur, bileşenler aynı kalır.
   */
  const themeVars = useMemo(() => {
    const accent = themeConfig.accentColor;
    const vars: Record<string, string> = {
      '--home-accent': accent,
      '--home-accent-glow': themeConfig.accentGlow,
      '--home-radius': theme === 'arcade' ? '0px' : '14px',
    };
    ACCENT_ALPHA.forEach(([name, suffix]) => {
      vars[`--home-accent-${name}`] = `${accent}${suffix}`;
    });
    return vars as React.CSSProperties;
  }, [theme, themeConfig.accentColor, themeConfig.accentGlow]);

  const hintText =
    inputMode === 'controller'
      ? isConnected
        ? t('home.hint_pad')
        : t('home.hint_keys')
      : t('home.hint_touch');

  return (
    <div className="home-root" data-motion={motionTier} style={themeVars}>
      <main className="home-main">
        <div className="home-primary">
          <HomeTopBar onOpenThemeModal={() => setIsThemeModalOpen(true)} />

          <div
            className="home-board"
            style={{ background: themeConfig.board.background || '#070e1c' }}
          >
            <div
              className="home-board__scan"
              style={{ opacity: theme === 'arcade' ? 0.4 : 0.12 }}
            />

            <HeroPlayCell
              item={playItem}
              phase={slidePhase}
              isActive={activeIndex === 0}
              onSelect={() => selectIndex(0)}
              onTrigger={triggerPlay}
              onSlideEnd={onSlideEnd}
            />

            <MenuTileGrid
              tiles={tiles}
              activeIndex={activeIndex}
              disabled={isSliding}
              onSelect={selectIndex}
              onActivate={activateIndex}
            />
          </div>

          {!isConnected && (
            <p
              style={{
                margin: 0,
                textAlign: 'center',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#475569',
              }}
            >
              {hintText}
            </p>
          )}
        </div>

        <HomeInfoSection />

        {isConnected && (
          <div className="home-gamepad-hint">
            <GameIcon name="gamepad" size={14} color={themeConfig.accentColor} />
            <span>{t('home.hint_pad')}</span>
          </div>
        )}
      </main>

      {isSheetOpen && (
        <MoreMenuSheet items={overflowItems} onClose={() => setIsSheetOpen(false)} />
      )}

      {isThemeModalOpen && (
        <ThemeSelectorModal
          onClose={() => {
            setIsThemeModalOpen(false);
            resetSlidePhase();
          }}
        />
      )}
    </div>
  );
}
