'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { MascotView, type MascotHandle } from '@/game-engine/components/entities/MascotView';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import type { EmoteName } from '@/game-engine/mascot/emotes';
import { useMotionTier } from '@/lib/motionTier';

/** Yerleşim kutusu: MascotView'in yerel jeton kenarı. */
const NATIVE = 64;

/** Menü sayfalarında serpiştirilen sevimli, sakin ifadeler. */
const CUTE: EmoteName[] = ['happy', 'wink', 'love', 'surprised'];

const EVERY: [number, number] = [6000, 13000];

const BOB_CSS = `
@keyframes mascotBuddyBob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@media (prefers-reduced-motion: reduce) {
  [data-mascot-buddy] { animation: none !important; }
}`;

export interface MascotBuddyProps {
  /** 0 = yeşil, 1 = mavi. */
  playerIndex?: number;
  /** Piksel cinsinden kenar uzunluğu (varsayılan 56). */
  size?: number;
  /** Açılışta yapılan ifade; verilmezse yalnızca boşta kırpar. */
  greet?: EmoteName;
  /** Ara sıra rastgele seçilecek ifadeler. Boş dizi = sessiz. */
  moods?: EmoteName[];
  /** Rastgele ifade arası [min, max] ms. */
  every?: [number, number];
  /** Süzülme animasyonu. */
  bob?: boolean;
  /** Tıklanınca `happy` yapar. */
  tappable?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Menü/liste sayfalarına serpiştirilen küçük maskot: hafifçe süzülür, ara sıra
 * kendiliğinden gülümser/göz kırpar, dokununca sevinir. Oyun dışı sayfalar için.
 * `lite` hareket kademesinde süzülme ve rastgele ifadeler kapanır (yalnızca kırpma kalır).
 */
export function MascotBuddy({
  playerIndex = 0, size = 56, greet, moods = CUTE, every = EVERY,
  bob = true, tappable = true, className, style,
}: MascotBuddyProps) {
  const { themeConfig } = useGameTheme();
  const tier = useMotionTier();
  const ref = useRef<MascotHandle>(null);
  const lively = tier === 'full';

  useEffect(() => {
    if (!lively) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = (first: boolean) => {
      const [min, max] = every;
      const wait = first && greet ? 500 : min + Math.random() * (max - min);
      timer = setTimeout(() => {
        const pool = moods;
        const name = first && greet ? greet : pool[Math.floor(Math.random() * pool.length)];
        if (name) ref.current?.emote(name);
        if (pool.length > 0) next(false);
      }, wait);
    };
    if (greet || moods.length > 0) next(true);
    return () => clearTimeout(timer);
  }, [lively, greet, moods, every]);

  const scale = size / NATIVE;

  return (
    <div
      className={className}
      data-mascot-buddy
      onClick={tappable ? () => ref.current?.emote('happy') : undefined}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        cursor: tappable ? 'pointer' : undefined,
        animation: bob && lively ? 'mascotBuddyBob 3.2s ease-in-out infinite' : undefined,
        ...style,
      }}
    >
      <style>{BOB_CSS}</style>
      <div
        style={{
          width: NATIVE,
          height: NATIVE,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <MascotView ref={ref} theme={themeConfig.id} playerIndex={playerIndex} zoom={Math.max(1, scale)} />
      </div>
    </div>
  );
}
