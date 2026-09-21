/**
 * DOSYA AMACI: Kullanıcı tercihlerinin (ses açma/kapama, ses seviyesi, dil ve tema)
 * yönetildiği müstakil ayarlar sayfası kabuğudur. Ortak `SettingsView` bileşenini
 * sayfa varyantında (`variant="page"`) render eder.
 */

'use client';

import React, { useCallback } from 'react';
import { useAppRouter } from '@/lib/navigation';
import { useT } from '@/contexts/LanguageContext';
import { SettingsView } from './SettingsView';

export function SettingsPage() {
  const t = useT();
  const router = useAppRouter();

  const handleBack = useCallback(() => {
    router.push('/');
  }, [router]);

  return (
    <>
      <title>{`${t('settings.title')} | Syncron`}</title>
      <meta name="description" content="Syncron game settings and preferences." />

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'transparent',
          padding: '32px 16px 64px 16px',
          boxSizing: 'border-box',
          color: '#ffffff',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          overflowY: 'auto',
        }}
      >
        <SettingsView variant="page" onBack={handleBack} />
      </main>
    </>
  );
}
