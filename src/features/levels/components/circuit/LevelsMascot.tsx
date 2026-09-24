'use client';

import { useEffect, useRef, useState } from 'react';
import { MascotCompanion, type MascotReaction } from '@/components/ui';
import type { CircuitPoint } from '../../lib/circuitCalculations';
import {
  MOOD_CHANCE, MOOD_COOLDOWN_MS, MOOD_SETTLE_MS, companionAnchor, pickLevelMood,
  type LevelMoodState,
} from '../../lib/levelMascot';

/** `ConstellationNode` düğüm çapı (px). */
const NODE_SIZE = 50;

export interface LevelsMascotProps {
  /** Maskotun yanında duracağı düğüm; seviye yoksa maskot görünmez. */
  point: CircuitPoint | undefined;
  /** Düğümün durumu — tepkiler buna göre seçilir. */
  mood: LevelMoodState;
  isMobile: boolean;
}

/**
 * Seviyeler haritasında seçili seviyeyi takip eden maskot. Seçim değiştikçe yeni düğümün
 * yanına zıplayarak süzülür; seçim yerleşince (bazen) o seviyeye uygun bir ifade yapar,
 * arada mini senaryolar oynar. Süzülme/zıplama mantığı `MascotCompanion`'da.
 */
export function LevelsMascot({ point, mood, isMobile }: LevelsMascotProps) {
  const size = isMobile ? 40 : 46;
  const [reaction, setReaction] = useState<MascotReaction | null>(null);
  const lastReactionAt = useRef(0);

  // Seçim bırakılınca, soğuma süresi geçmişse ve zar tutarsa tek bir ifade.
  const posKey = point ? `${point.xPercent}|${point.yPx}` : '';
  const { isLocked, isCompleted, isSkipped, isCurrent, stars } = mood;
  useEffect(() => {
    if (!posKey) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      if (now - lastReactionAt.current < MOOD_COOLDOWN_MS || Math.random() > MOOD_CHANCE) return;
      lastReactionAt.current = now;
      const emote = pickLevelMood({ isLocked, isCompleted, isSkipped, isCurrent, stars }, Math.random);
      setReaction({ emote, key: now });
    }, MOOD_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [posKey, isLocked, isCompleted, isSkipped, isCurrent, stars]);

  if (!point) return null;
  const { x, y } = companionAnchor(point.xPercent, point.yPx, NODE_SIZE, size);
  return <MascotCompanion x={x} y={y} size={size} playerIndex={0} reaction={reaction} />;
}
