/**
 * DOSYA AMACI: Bir rota yolunu, geri tuşunda gösterilecek okunabilir sayfa
 * adının i18n anahtarına çevirir. `routeHistory` ile birlikte kullanılır.
 */

import { normalizePath } from './routeHistory';

const ROUTE_LABEL_KEYS: Record<string, string> = {
  '/': 'common.back_menu',
  '/levels': 'nav.levels',
  '/play': 'nav.play',
  '/daily': 'nav.daily',
  '/profile': 'nav.profile',
  '/friends': 'nav.friends',
  '/leaderboard': 'nav.leaderboard',
  '/controls': 'nav.controls',
  '/admin': 'nav.admin',
  '/admin/level-parts': 'nav.level_parts',
  '/admin/daily-calendar': 'nav.daily_calendar',
  '/admin/pending-request-levels': 'nav.pending_levels',
  '/admin/level-analytics': 'nav.level_analytics',
  '/admin/reports': 'nav.reports',
  '/admin/support': 'nav.support',
  '/admin/users': 'nav.users',
};

/** Verilen yol için i18n etiket anahtarını döndürür; bilinmeyen yollarda `common.back_menu`. */
export function getRouteLabelKey(path: string | null | undefined): string {
  const norm = normalizePath(path);
  if (ROUTE_LABEL_KEYS[norm]) return ROUTE_LABEL_KEYS[norm];
  if (norm.startsWith('/admin/')) return 'nav.admin';
  return 'common.back_menu';
}

/** Geri tuşunun hedefi olarak kullanılabilecek bilinen bir uygulama sayfası mı? */
export function isKnownAppRoute(path: string | null | undefined): boolean {
  const norm = normalizePath(path);
  return norm in ROUTE_LABEL_KEYS || norm.startsWith('/admin/');
}
