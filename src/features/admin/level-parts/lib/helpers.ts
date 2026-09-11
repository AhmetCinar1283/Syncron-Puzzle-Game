import type { LevelOrderEntry } from '@/services/firebase/admin';

/** Returns entries sorted by position ascending, with index fallback for legacy data. */
export function sortedEntries(order: Record<string, LevelOrderEntry>): LevelOrderEntry[] {
  return Object.values(order).sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
}

export const INPUT_STYLE: React.CSSProperties = {
  background: '#060d1a',
  border: '1px solid rgba(30,58,95,0.6)',
  color: '#e2e8f0',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
};
