import type { AlertCondition } from '@/services/firebase/adminLevelAnalytics';

// Types for data models
export interface LevelStats {
  level_id: string;
  version: number;
  total_attempts: number;
  wins: number;
  quits: number;
  total_restarts: number;
  total_deaths: number;
  /** Oturumlarda kullanılan toplam ipucu (0011 migration öncesi worker'da yok). */
  total_hints?: number;
  /** En az bir ipucu kullanılan oturum sayısı. */
  hinted_attempts?: number;
  avg_time_win: number;
  likes: number;
  dislikes: number;
  votes_easy: number;
  votes_normal: number;
  votes_hard: number;
}

export interface StoredLevelInfo {
  firestoreId: string;
  name: string;
  part: string;
  position: number;
  version?: number;
  difficulty?: number;
  width?: number;
  height?: number;
  creatorName?: string;
  gameNotes?: string;
  creatorNotes?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type MetricKey = AlertCondition['metric'] | 'totalAttempts';

export const METRIC_LABELS: Record<AlertCondition['metric'], string> = {
  dropOff: 'Drop-off Oranı (%)',
  avgDeaths: 'Ortalama Ölüm Sayısı',
  avgRestarts: 'Ortalama Restart Sayısı',
  avgTime: 'Ortalama Süre (sn)',
  likeRatio: 'Beğeni Oranı (%)',
};

export const TREND_METRICS: { key: MetricKey; label: string; color: string; glow: string }[] = [
  { key: 'dropOff', label: 'Drop-off Oranı (%)', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { key: 'likeRatio', label: 'Beğeni Oranı (%)', color: '#ffd700', glow: 'rgba(255, 215, 0, 0.4)' },
  { key: 'avgDeaths', label: 'Ort. Ölüm Sayısı', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
  { key: 'avgRestarts', label: 'Ort. Restart Sayısı', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)' },
  { key: 'avgTime', label: 'Ort. Süre (sn)', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
  { key: 'totalAttempts', label: 'Toplam Girişim', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
];

export const OPERATORS = ['>', '<', '>=', '<=', '=='] as const;
