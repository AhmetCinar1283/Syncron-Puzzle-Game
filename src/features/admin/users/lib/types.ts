// Types shared by the admin users list + detail workspace views.

export type UserProfileData = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  tag?: string | null;
  role: string;
  authProvider: string;
  totalScore: number;
  completedCount: number;
  createdAt?: string | null;
  acceptedTermsAt?: string | null;
};

export type AuditLogCategory = 'game' | 'support' | 'account' | 'payment' | 'admin';

export type AuditLogStat = {
  category: AuditLogCategory;
  count: number;
};

export type AuditLogEntry = {
  id: string;
  uid: string;
  action: string;
  category: AuditLogCategory;
  metadata: any;
  created_at: string;
};

export type PlayedLevelEntry = {
  levelId: string;
  stars: number;
  moveCount: number | null;
  timeSpent: number | null;
  completedAt: string | null;
  updatedAt: string | null;
};

export type PlayedLevelSort = 'date' | 'stars' | 'time';

export type CategoryDetails = {
  label: { tr: string; en: string };
  color: string;
  glow: string;
};

export const CATEGORY_DETAILS: Record<AuditLogCategory, CategoryDetails> = {
  game: { label: { tr: 'Oyun', en: 'Game' }, color: '#00ff88', glow: '0 0 10px #00ff88' },
  support: { label: { tr: 'Destek', en: 'Support' }, color: '#ffd700', glow: '0 0 10px #ffd700' },
  account: { label: { tr: 'Hesap', en: 'Account' }, color: '#00c4ff', glow: '0 0 10px #00c4ff' },
  payment: { label: { tr: 'Ödeme', en: 'Payment' }, color: '#fb923c', glow: '0 0 10px #fb923c' },
  admin: { label: { tr: 'Admin', en: 'Admin' }, color: '#ec4899', glow: '0 0 10px #ec4899' },
};
