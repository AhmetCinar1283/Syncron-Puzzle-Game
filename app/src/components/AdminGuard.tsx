'use client';
/**
 * DOSYA AMACI: Bu dosya, /admin/* altındaki yönetim yollarına erişimi
 * kısıtlayan ve kullanıcının rolünü (admin veya moderator) doğrulayan güvenlik sarmalayıcısını barındırır.
 */

import { useAuth } from '@/app/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

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
  const [isValidated, setIsValidated] = useState<boolean>(false);

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
    } else {
      setIsValidated(true);
    }
  }, [user, role, loading, router]);

  // Yükleme veya doğrulama durumunda bekleme ekranı gösterilir
  if (loading || (!isValidated && user)) {
    return (
      <main
        style={{
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

