'use client';

/**
 * DOSYA AMACI: 1–3 yıldızın dolu/boş gösterimi (günlük sonuç kartı, arşiv, liderlik).
 */
import { GameIcon } from '@/components/icons';

export function StarRow({ stars, size = 16 }: { stars: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${stars}/3`}>
      {[1, 2, 3].map((n) => (
        <span key={n} style={{ color: n <= stars ? '#ffd700' : '#1e293b', display: 'inline-flex' }}>
          <GameIcon name="star" size={size} />
        </span>
      ))}
    </span>
  );
}
