'use client';

import { useEffect, type RefObject } from 'react';
import type { MascotHandle } from '@/game-engine/components/entities/MascotView';
import type { EmoteName } from '@/game-engine/mascot/emotes';
import { pickShow, type MascotScene } from '@/game-engine/mascot/scenes';

export interface MascotShowOptions {
  /** Kapalıyken hiçbir şey planlanmaz (ör. `lite` hareket kademesi, sayfa arka planda). */
  enabled: boolean;
  /** İlk gösteriye kadar bekleme (ms). */
  firstDelay?: number;
  /** Gösteriler arası ek bekleme [min, max] ms — spam olmasın diye sahne süresine EKLENİR. */
  gap?: [number, number];
  /** Verilmezse ortak katalog (`game-engine/mascot/scenes.ts`). */
  scenes?: MascotScene[];
  singles?: EmoteName[];
}

const DEFAULT_GAP: [number, number] = [3500, 7500];

/**
 * Bir maskota ara sıra mini senaryolar/tek ifadeler oynatır. Sahneler arasında bekleme
 * vardır; `enabled` kapanınca zamanlayıcılar temizlenir ve ifade kesilir.
 * Ana sayfa PLAY hücresi ve seviyeler sayfası aynı mantığı paylaşır.
 */
export function useMascotShow(
  ref: RefObject<MascotHandle | null>,
  { enabled, firstDelay = 2400, gap = DEFAULT_GAP, scenes, singles }: MascotShowOptions,
) {
  const [gapMin, gapMax] = gap;
  useEffect(() => {
    if (!enabled) return;
    const handle = ref.current;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let alive = true;
    let lastId: string | null = null;
    const later = (ms: number, fn: () => void) => {
      const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms);
      timers.add(t);
    };
    const pause = () => gapMin + Math.random() * (gapMax - gapMin);
    const nextShow = (delay: number) => later(delay, () => {
      const pick = pickShow(Math.random, lastId, scenes, singles);
      if (pick.kind === 'single') {
        ref.current?.emote(pick.emote);
        nextShow(pick.duration + pause());
        return;
      }
      lastId = pick.scene.id;
      for (const step of pick.scene.steps) {
        later(step.at, () => {
          if (step.stop) ref.current?.stop(step.stop);
          if (step.emote) ref.current?.emote(step.emote, { force: true });
        });
      }
      nextShow(pick.scene.duration + pause());
    });
    nextShow(firstDelay);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      handle?.stop();
    };
  }, [enabled, ref, firstDelay, gapMin, gapMax, scenes, singles]);
}
