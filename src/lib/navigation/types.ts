/**
 * DOSYA AMACI: Navigasyon adaptörünün platformdan bağımsız ortak tiplerini
 * tanımlar. `nextNavigation` (gerçek Next router) ve `memoryNavigation` (portal
 * build'lerinde bellek içi router) bu arayüze uyar; uygulamanın geri kalanı
 * hangisinin aktif olduğunu bilmez (bkz. 00-mimari-ilkeler.md §3).
 */
export interface AppRouter {
  push(href: string): void;
  replace(href: string): void;
  back(): void;
}
