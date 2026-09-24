'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { MascotView, type MascotHandle } from '@/game-engine/components/entities/MascotView';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import type { EmoteName } from '@/game-engine/mascot/emotes';
import type { MascotScene } from '@/game-engine/mascot/scenes';
import { useMotionTier } from '@/lib/motionTier';
import { useMascotShow } from './useMascotShow';

/** Yerleşim kutusu: MascotView'in yerel jeton kenarı. */
const NATIVE = 64;

/** Süzülme süresi (ms); zıplama bu sürenin ardından durur. */
const GLIDE_MS = 480;

const CSS = `
@keyframes mascotCompanionHop {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  35% { transform: translateY(-9px) scale(0.96, 1.05); }
  70% { transform: translateY(0) scale(1.06, 0.94); }
}
@keyframes mascotCompanionBreath {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@media (prefers-reduced-motion: reduce) {
  [data-mascot-companion] { transition: none !important; }
  [data-mascot-companion] > div { animation: none !important; }
}`;

export interface MascotReaction {
  emote: EmoteName;
  /** Anahtar değişince ifade yeniden oynar (aynı ifade art arda da olabilir). */
  key: string | number;
}

export interface MascotCompanionProps {
  /** Maskotun merkezi: `left` CSS uzunluğu (ör. `'42%'`), `top` piksel. Bir kapsayıcı içinde `absolute` konumlanır. */
  x: string;
  y: number;
  /** Piksel cinsinden kenar uzunluğu (varsayılan 44). */
  size?: number;
  /** 0 = yeşil, 1 = mavi. */
  playerIndex?: number;
  /** Tepki isteği; `key` her değiştiğinde `emote` oynar. */
  reaction?: MascotReaction | null;
  /** Ara sıra mini senaryolar (yalnızca `full` hareket kademesinde). Varsayılan açık. */
  show?: boolean;
  scenes?: MascotScene[];
  singles?: EmoteName[];
  /** Senaryolar arası ek bekleme [min, max] ms. */
  gap?: [number, number];
  className?: string;
  style?: CSSProperties;
}

/**
 * Bir noktayı takip eden yardımcı maskot. Sayfalar yalnızca "nerede duracağını"
 * (`x`, `y`) ve isteğe bağlı `reaction` verir; süzülme, zıplama, nefes alma ve
 * ara sıra oynayan mini senaryolar burada. Tıklamayı engellemez (pointer-events: none).
 *
 * `lite` hareket kademesinde (zayıf Android cihazlar, "hareketi azalt") süzülme,
 * zıplama ve senaryolar kapanır: maskot yerine oturur, yalnızca kırpar ve tepki verir.
 */
export function MascotCompanion({
  x, y, size = 44, playerIndex = 1, reaction, show = true, scenes, singles, gap,
  className, style,
}: MascotCompanionProps) {
  const { themeConfig } = useGameTheme();
  const lively = useMotionTier() === 'full';
  const ref = useRef<MascotHandle>(null);

  // Konum değişince GLIDE_MS boyunca "koşuyor" say; değişimi render'da fark etmek
  // (efekt yerine) React'in "prop değişince state ayarla" örüntüsüdür.
  const posKey = `${x}|${y}`;
  const [prevPos, setPrevPos] = useState(posKey);
  const [moving, setMoving] = useState(false);
  if (posKey !== prevPos) {
    setPrevPos(posKey);
    setMoving(true);
  }
  useEffect(() => {
    if (!moving) return;
    const timer = setTimeout(() => setMoving(false), GLIDE_MS);
    return () => clearTimeout(timer);
  }, [moving, posKey]);

  useMascotShow(ref, { enabled: show && lively && !moving, firstDelay: 3500, gap: gap ?? [6000, 12000], scenes, singles });

  const reactionKey = reaction ? reaction.key : null;
  const reactionEmote = reaction?.emote;
  useEffect(() => {
    if (reactionKey === null || !reactionEmote) return;
    ref.current?.emote(reactionEmote, { force: true });
  }, [reactionKey, reactionEmote]);

  const scale = size / NATIVE;

  return (
    <div
      className={className}
      data-mascot-companion
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        pointerEvents: 'none',
        zIndex: 30,
        transition: lively ? `left ${GLIDE_MS}ms cubic-bezier(0.34, 1.4, 0.5, 1), top ${GLIDE_MS}ms cubic-bezier(0.34, 1.4, 0.5, 1)` : undefined,
        ...style,
      }}
    >
      <style>{CSS}</style>
      <div
        style={{
          width: size,
          height: size,
          animation: !lively
            ? undefined
            : moving
              ? 'mascotCompanionHop 0.32s ease-in-out infinite'
              : 'mascotCompanionBreath 3.4s ease-in-out infinite',
        }}
      >
        <div style={{ width: NATIVE, height: NATIVE, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <MascotView ref={ref} theme={themeConfig.id} playerIndex={playerIndex} zoom={Math.max(1, scale)} />
        </div>
      </div>
    </div>
  );
}
