/**
 * DOSYA AMACI: Navigasyon adaptörünün kompozisyon kökü. `inMemoryRouting`
 * yeteneğine göre `nextNavigation` veya `memoryNavigation` uygulamasını build
 * zamanında bir kez seçer (bkz. 00-mimari-ilkeler.md §3). Uygulamanın geri kalanı
 * yalnızca bu dosyadan import eder, hiçbir yerde `next/navigation` doğrudan
 * kullanılmaz (portal-reachable ekranlar için).
 */
import { getCapabilities } from '@/services/monetization/capabilities';
import * as nextImpl from './nextNavigation';
import * as memoryImpl from './memoryNavigation';

const impl = getCapabilities().inMemoryRouting ? memoryImpl : nextImpl;

export const useAppRouter = impl.useAppRouter;
export const useAppSearchParams = impl.useAppSearchParams;
export const useAppPathname = impl.useAppPathname;
export const AppLink = impl.AppLink;
export type { AppRouter } from './types';
