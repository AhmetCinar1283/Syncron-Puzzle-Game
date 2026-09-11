'use client';

/**
 * DOSYA AMACI: Bu dosya, web tarayıcıları (popstate geçmiş yakalama) ve
 * Capacitor mobil platformlar (fiziksel geri tuşu dinleyicisi) için
 * özel hiyerarşik geri tuşu yönlendirme kurallarını yönetir.
 */

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

export default function BackButtonManager() {
  const router = useRouter();
  const pathname = usePathname();
  const lastPathnameRef = useRef(pathname);

  // Eş zamanlı olmayan olay dinleyicileri için pathname referansını güncel tutar
  useEffect(() => {
    lastPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    /**
     * Özel hiyerarşik geri yönlendirme kuralları.
     * Yönlendirme yapıldıysa true, yapılmadıysa false döner.
     */
    const handleBackNavigation = (currentPath: string): boolean => {
      if (currentPath === '/play') {
        router.replace('/levels');
        return true;
      }
      if (
        currentPath === '/levels' ||
        currentPath === '/profile' ||
        currentPath === '/editor' ||
        currentPath === '/friends' ||
        currentPath === '/controls' ||
        currentPath === '/admin'
      ) {
        router.replace('/');
        return true;
      }
      if (currentPath.startsWith('/admin/')) {
        router.replace('/admin');
        return true;
      }
      return false;
    };

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
            const currentPath = lastPathnameRef.current;
            const handled = handleBackNavigation(currentPath);
            
            if (!handled) {
              if (currentPath === '/') {
                // Ana sayfadaysak uygulamadan çıkış yap
                await App.exitApp();
              } else {
                // Varsayılan geri mantığı: Tarayıcı geçmişi varsa geri git, yoksa ana sayfaya dön
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.replace('/');
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
    const currentPath = pathname;
    const shouldIntercept =
      currentPath === '/play' ||
      currentPath === '/levels' ||
      currentPath === '/profile' ||
      currentPath === '/editor' ||
      currentPath === '/friends' ||
      currentPath === '/controls' ||
      currentPath === '/admin' ||
      currentPath.startsWith('/admin/');

    if (!shouldIntercept) return;

    // Tarayıcı geçmişine sanal bir durum ekler.
    // Kullanıcı geri tuşuna bastığında popstate olayı tetiklenir ama sayfa değişmez.
    window.history.pushState({ intercepted: true }, '');

    const handlePopState = (event: PopStateEvent) => {
      // Özel yönlendirme kurallarını çalıştırır
      handleBackNavigation(currentPath);
      
      // Sonraki geri tıklamaları için sanal durumu tekrar ekler
      window.history.pushState({ intercepted: true }, '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pathname, router]);

  return null;
}
