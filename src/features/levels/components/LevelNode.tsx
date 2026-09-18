'use client';

import { forwardRef } from 'react';
import { SkipForward } from 'lucide-react';
import { GameIcon } from '@/components/icons';
import { SKIPPED_COLOR } from './SkippedBadge';

export interface LevelNodeProps {
  index: number;
  label: string;
  x: number; // yüzde (0-100)
  y: number; // yüzde (0-100)
  isLocked: boolean;
  isCompleted: boolean;
  /** Ödüllü reklamla atlandı, henüz çözülmedi (05): kesik çizgili çerçeve + atla simgesi. */
  isSkipped?: boolean;
  isCurrent: boolean;
  isSelected: boolean;
  stars?: 1 | 2 | 3;
  activeColor: string;
  isMobile: boolean;
  onSelect: () => void;
  onActivate: () => void;
}

/**
 * Tek bir kampanya haritası düğümü. Artık fizik simülasyonuna bağlı değil — konumu doğrudan
 * verilen yüzde koordinatlarından (`left`/`top`) gelir. Sadece "current" (sıradaki oynanabilir
 * seviye) düğümü CSS ile hafifçe yüzer; diğerleri statik durur (mobilde 60fps için önemli).
 */
export const LevelNode = forwardRef<HTMLButtonElement, LevelNodeProps>(function LevelNode(
  { index, label, x, y, isLocked, isCompleted, isSkipped = false, isCurrent, isSelected, stars, activeColor, isMobile, onSelect, onActivate },
  ref,
) {
  const size = isMobile ? 38 : 32;

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        onSelect();
      }}
      onDoubleClick={() => {
        if (!isLocked) onActivate();
      }}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center outline-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        zIndex: isSelected ? 20 : 10,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        color: activeColor,
        animation: isCurrent ? 'levelNodeFloat 3s ease-in-out infinite' : undefined,
      }}
      title={label}
      aria-label={label}
      aria-current={isSelected}
    >
      {/* Seçim halkası (klavye/gamepad odağı) */}
      {isSelected && (
        <span
          className="absolute rounded-full"
          style={{
            width: size + 20,
            height: size + 20,
            border: '2.5px solid #ffd700',
            boxShadow: '0 0 12px #ffd700',
            animation: 'levelNodePulse 1.2s ease-in-out infinite',
          }}
        />
      )}

      {/* Aktif (sıradaki) seviye halesi */}
      {isCurrent && !isSelected && (
        <span
          className="absolute rounded-full"
          style={{ width: size + 14, height: size + 14, border: `2px solid ${activeColor}`, opacity: 0.6 }}
        />
      )}

      {/* Çekirdek düğüm */}
      <span
        className="relative flex items-center justify-center rounded-full border-2 font-extrabold"
        style={{
          width: size,
          height: size,
          fontSize: isMobile ? 14 : 12,
          background: isLocked ? '#090d16' : isCompleted ? `${activeColor}1a` : '#060b13',
          borderColor: isLocked ? '#1e293b' : isCurrent ? '#ffd700' : isSkipped ? SKIPPED_COLOR : activeColor,
          borderStyle: isSkipped ? 'dashed' : 'solid',
          color: isLocked ? '#475569' : '#fff',
          boxShadow: isLocked ? 'none' : `0 0 10px ${isCurrent ? 'rgba(255,215,0,0.45)' : `${activeColor}40`}`,
        }}
      >
        {isLocked ? <GameIcon name="lock" size={13} color="#475569" /> : index + 1}
        {isSkipped && (
          <span
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: -4, right: -4, width: 14, height: 14, background: '#030712', border: `1px solid ${SKIPPED_COLOR}`, color: SKIPPED_COLOR }}
          >
            <SkipForward size={8} strokeWidth={3} />
          </span>
        )}
      </span>

      {/* İsim etiketi */}
      <span
        className="pointer-events-none mt-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide"
        style={{
          background: 'rgba(3,7,18,0.92)',
          borderColor: 'rgba(255,255,255,0.08)',
          color: isLocked ? '#475569' : '#cbd5e1',
        }}
      >
        {label}
        {isCompleted && stars ? (
          <span className="ml-1 inline-flex items-center gap-0.5" style={{ verticalAlign: 'middle' }}>
            {Array.from({ length: stars }).map((_, i) => (
              <GameIcon key={i} name="star" size={8} color="#ffd700" />
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
});
