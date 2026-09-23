/**
 * DOSYA AMACI: Bu dosya, e-posta doğrulama bağlantısının açıldığı Firebase
 * barındırmalı işleyiciden (`/__/auth/action`) sonra kullanıcının yönlendirildiği
 * "doğrulandı" sayfasını içerir.
 *
 * Bu sayfanın hiçbir işi yoktur: `oobCode` zaten Firebase'in işleyicisinde
 * sunucu tarafında uygulanmıştır (bkz. services/auth/verification.ts →
 * handleCodeInApp: false). Sayfa yalnızca kullanıcıya işlemin bittiğini
 * söyler ve uygulamaya dönmesini ister — APK'da bu bağlantı sistem
 * tarayıcısında açıldığı için uygulamaya dönüş kullanıcının işidir.
 */

'use client';

import { useT } from '@/contexts/LanguageContext';

export default function EmailVerifiedPage() {
  const t = useT();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#030712',
        color: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        fontFamily: 'var(--font-geist-sans), sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 44,
          lineHeight: 1,
          color: '#00ff88',
          textShadow: '0 0 28px rgba(0,255,136,0.45)',
          marginBottom: 18,
        }}
        aria-hidden="true"
      >
        &#10003;
      </div>
      <h1
        style={{
          color: '#00ff88',
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: '0.05em',
          margin: '0 0 10px',
          textShadow: '0 0 20px rgba(0,255,136,0.4)',
        }}
      >
        {t('auth.verified_page_title')}
      </h1>
      <p style={{ color: '#9ca3af', fontSize: 14, margin: 0, maxWidth: 380, lineHeight: 1.7 }}>
        {t('auth.verified_page_body')}
      </p>
    </div>
  );
}
