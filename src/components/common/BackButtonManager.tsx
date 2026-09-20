'use client';

/**
 * DOSYA AMACI: Bu dosya, web tarayıcıları (popstate geçmiş yakalama) ve
 * Capacitor mobil platformlar (fiziksel geri tuşu dinleyicisi) için
 * özel hiyerarşik geri tuşu yönlendirme kurallarını yönetir.
 */

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { adService } from '@/services/monetization';
import { getPreviousRoute, normalizePath, recordRouteVisit } from '@/lib/routeHistory';
import { isKnownAppRoute } from '@/lib/routeLabels';

// Yol normalizasyonu artık `lib/routeHistory` içinde yaşıyor; mevcut içe aktarımlar
// bozulmasın diye buradan yeniden dışa aktarılır.
export { normalizePath };

/**
 * Editör birden çok sayfadan açılabildiği için geri tuşu sabit bir hedefe değil,
 * gerçekten gelinen sayfaya dönmelidir. Kayıt yoksa ana menüye düşer.
 */
export function getEditorBackRoute(previousPath?: string | null): string {
  const prev = previousPath ?? getPreviousRoute('/editor');
  if (prev && prev !== '/editor' && isKnownAppRoute(prev)) return prev;
  return '/';
}

/**
 * Verilen mevcut sayfadan geri tuşuna basıldığında gidilmesi gereken hiyerarşik üst sayfayı belirler.
 * Yönlendirme gerektirmeyen (varsayılan geçmiş veya çıkış) durumlar için null döner.
 */
export function getHierarchicalBackRoute(
  currentPath: string | null | undefined,
  previousPath?: string | null,
): string | null {
  const norm = normalizePath(currentPath);
  if (norm === '/play') {
    return '/levels';
  }
  if (norm === '/editor') {
    return getEditorBackRoute(previousPath);
  }
  if (
    norm === '/levels' ||
    norm === '/profile' ||
    norm === '/friends' ||
    norm === '/controls' ||
    norm === '/settings' ||
    norm === '/admin' ||
    norm === '/leaderboard' ||
    norm === '/donate' ||
    norm === '/great-supporter'
  ) {
    return '/';
  }
  if (norm.startsWith('/admin/')) {
    return '/admin';
  }
  return null;
}

export default function BackButtonManager() {
  const router = useRouter();
  const pathname = usePathname();
  const lastPathnameRef = useRef(pathname);
  const routerRef = useRef(router);

  // Eş zamanlı olmayan olay dinleyicileri için referansları güncel tutar
  useEffect(() => {
    lastPathnameRef.current = pathname;
    routerRef.current = router;
  }, [pathname, router]);

  // Ziyaret geçmişini kaydeder: editör gibi çok girişli sayfalar geri tuşunda
  // gerçekten gelinen sayfaya dönebilsin diye.
  useEffect(() => {
    recordRouteVisit(pathname);
  }, [pathname]);

  useEffect(() => {
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    // --- 1. Capacitor Yerel Mobil Platformu ---
    if (isNative) {
      let active = true;
      let appListener: any = null;

      const setupCapacitor = async () => {
        try {
          const { App } = await import('@capacitor/app');
          if (!active) return;

          // Donanım geri tuşuna basıldığında tetiklenir
          appListener = await App.addListener('backButton', async () => {
            // Tam ekran bir reklam açıkken geri tuşu reklamın kendisine aittir;
            // oyun bu sırada gezinme yapmaz ve kesinlikle uygulamadan çıkmaz.
            if (adService.isFullscreenAdOpen()) return;

            const currentPath = normalizePath(
              (typeof window !== 'undefined' ? window.location.pathname : null) || lastPathnameRef.current
            );
            const targetRoute = getHierarchicalBackRoute(currentPath);

            if (targetRoute) {
              routerRef.current.replace(targetRoute);
            } else {
              if (currentPath === '/') {
                // Ana sayfadaysak uygulamadan çıkış yap
                await App.exitApp();
              } else {
                // Varsayılan geri mantığı: Tarayıcı geçmişi varsa geri git, yoksa ana sayfaya dön
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  routerRef.current.back();
                } else {
                  routerRef.current.replace('/');
                }
              }
            }
          });
        } catch (err) {
          console.warn('[BackButtonManager] Capacitor App listener error:', err);
        }
      };

      setupCapacitor();

      return () => {
        active = false;
        if (appListener) {
          appListener.remove();
        }
      };
    }

    // --- 2. Web Tarayıcı Platformu ---
    // Web üzerinde tarayıcının geri/ileri butonuna basıldığında tetiklenir
    const handlePopState = () => {
      const prevPath = normalizePath(lastPathnameRef.current);
      const destination = normalizePath(
        typeof window !== 'undefined' ? window.location.pathname : null
      );

      // Play sayfasındayken geri tuşuna basıldıysa ve varış noktası levels değilse:
      // (Örneğin: önceki bir oyuna veya ana sayfaya pop ettiyse) -> doğrudan /levels'e yönlendir.
      if (prevPath === '/play' && destination !== '/levels') {
        routerRef.current.replace('/levels');
        return;
      }

      // Levels veya üst menülerden geri gelindiğinde geriye kalan bir oyun sayfasına pop edilmesini engelle
      const expectedBack = getHierarchicalBackRoute(prevPath);
      if (expectedBack && destination !== expectedBack) {
        if (destination === '/play' || destination.startsWith('/admin/')) {
          routerRef.current.replace(expectedBack);
          return;
        }
      }

      if (prevPath.startsWith('/admin/') && destination !== '/admin') {
        routerRef.current.replace('/admin');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // Mount anında bir kez kurulur; pathname ve router güncel ref'lerden okunur

  return null;
}
