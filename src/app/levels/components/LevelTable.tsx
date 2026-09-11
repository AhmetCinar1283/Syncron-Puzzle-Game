'use client';

import type { ReactNode } from 'react';

export function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-3">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.22em]" style={{ color, textShadow: `0 0 12px ${color}70` }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${color}30, transparent)` }} />
    </div>
  );
}

// `cols` ve `headers` API uyumluluğu için kabul edilir ama artık bir başlık satırı olarak render edilmez.
export function LevelTable({ children }: { children: ReactNode; cols?: string; headers?: string[] }) {
  return <div className="grid w-full gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>{children}</div>;
}
