import type { T } from '@/contexts/LanguageContext';

export function timeAgo(ms: number, t: T): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('time.just_now');
  if (m < 60) return t('time.minutes_ago', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.hours_ago', { n: h });
  return t('time.days_ago', { n: Math.floor(h / 24) });
}

export const DIFFICULTY_COLORS: Record<number, string> = { 1: '#00ff88', 2: '#fbbf24', 3: '#f97316', 4: '#ef4444' };

export const CELL_FILTER_KEYS = [
  { key: 'admin.cell_ice', types: ['ice'] },
  { key: 'admin.cell_teleporter', types: ['teleporter_in_A', 'teleporter_out_A', 'teleporter_in_B', 'teleporter_out_B', 'teleporter_in_C', 'teleporter_out_C'] },
  { key: 'admin.cell_power', types: ['power_node'] },
  { key: 'admin.cell_conveyor', types: ['conveyor_up', 'conveyor_down', 'conveyor_left', 'conveyor_right'] },
  { key: 'admin.cell_toggle', types: ['direction_toggle'] },
  { key: 'admin.cell_forbidden', types: ['forbidden'] },
] as const;
