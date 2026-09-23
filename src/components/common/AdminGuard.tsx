'use client';
/**
 * DOSYA AMACI: Bu dosya, /admin/* altındaki yönetim yollarına erişimi
 * kısıtlayan ve kullanıcının rolünü (admin veya moderator) doğrulayan güvenlik sarmalayıcısını barındırır.
 */

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * AdminGuard - Yetkisiz kullanıcıların yönetim sayfalarına girmesini engeller.
 * Eğer kullanıcı 'admin' veya 'moderator' rolüne sahip değilse /403 sayfasına yönlendirilir.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  // Doğrulama bir STATE değil, mevcut oturumun TÜREVİ: ayrı state'te tutulup
  // efektte set edilmesi fazladan bir render turu ve yetkinin bir kare gecikmeli
  // görünmesi demekti. Yönlendirme (gerçek yan etki) efektte kalır.
  const isValidated = !loading && !!user && (role === 'admin' || role === 'moderator');

  // Rol kontrolü ve yetkilendirme doğrulama süreci
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/');
      return;
    }

    const isAdmin = role === 'admin';
    const isMod = role === 'moderator';

    // Rol yetersizse 403 hata sayfasına yönlendirilir
    if (!isAdmin && !isMod) {
      console.warn('[AdminGuard] Access Denied: Role invalid.', { uid: user.uid, role });
      router.replace('/403');
    }
  }, [user, role, loading, router]);

  // Yükleme veya doğrulama durumunda bekleme ekranı gösterilir
  if (loading || (!isValidated && user)) {
    return (
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          background: '#030712',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <span
          style={{
            color: '#00ff88',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            textShadow: '0 0 10px rgba(0, 255, 136, 0.4)',
          }}
        >
          Securing Access Sector...
        </span>
      </main>
    );
  }

  if (!isValidated) {
    return null;
  }

  return <>{children}</>;
}

