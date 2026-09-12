/**
 * DOSYA AMACI: Portal build'lerinin tek kompozisyon kökü. `src/app/page.tsx`,
 * `capabilities.inMemoryRouting` true olduğunda bunu render eder. Aktif ekranı
 * bellek içi router'ın (`src/lib/navigation`) pathname'ine göre seçer — URL hiç
 * değişmez, sayfa yeniden yüklenmez.
 */
'use client';

import { useAppPathname } from '@/lib/navigation';
import { PORTAL_ROUTES } from './portalRoutes';
import { HomePage } from '@/features/home';

export function PortalShell() {
  const pathname = useAppPathname();
  const Screen = PORTAL_ROUTES[pathname];

  // Tabloda olmayan bir yol (ör. /admin, /editor, /donate) ana menüye düşer —
  // bu ekranlar portal build'inde hiç bulunmaz (bkz. portalRoutes.tsx).
  if (!Screen) return <HomePage />;

  return <Screen />;
}
