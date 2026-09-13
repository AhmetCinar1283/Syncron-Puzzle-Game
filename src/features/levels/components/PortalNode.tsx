'use client';
import { GameIcon } from '@/components/icons';

export interface PortalNodeProps {
  x: number;
  y: number;
  kind: 'start' | 'end';
  isUnlocked: boolean;
  title: string;
  onActivate: () => void;
}

/** Bölüm (chapter) giriş/çıkış portalı. Statik konum, sadece kendi ikonu döner (ucuz animasyon). */
export function PortalNode({ x, y, kind, isUnlocked, title, onActivate }: PortalNodeProps) {
  const size = kind === 'start' ? 48 : 50;
  const color = kind === 'start' ? '#00f5d4' : isUnlocked ? '#fbbf24' : '#475569';

  return (
    <button
      onClick={onActivate}
      title={title}
      className="absolute flex items-center justify-center rounded-full transition-transform active:scale-95"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
        color,
        background:
          kind === 'start'
            ? 'radial-gradient(circle, #0d9488 0%, #115e59 100%)'
            : isUnlocked
              ? 'radial-gradient(circle, #f59e0b 0%, #78350f 100%)'
              : 'radial-gradient(circle, #334155 0%, #0f172a 100%)',
        border: `2.5px solid ${color}`,
        boxShadow: kind === 'start' || isUnlocked ? `0 0 16px ${color}90` : 'none',
      }}
    >
      <span
        className="flex h-full w-full items-center justify-center"
        style={{ animation: kind === 'start' || isUnlocked ? 'portalSpin 4s linear infinite' : undefined }}
      >
        <GameIcon name="portal" size={kind === 'start' ? 24 : 26} color={color} />
      </span>
    </button>
  );
}
