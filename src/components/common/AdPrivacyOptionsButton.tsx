'use client';

/**
 * DOSYA AMACI: Kullanıcının reklam rıza tercihini sonradan değiştirebilmesi için
 * Google UMP "gizlilik seçenekleri" formunu açan buton. YALNIZCA reklam
 * sağlayıcısı böyle bir giriş noktası gerektiriyorsa (GDPR/KVKK kapsamındaki
 * kullanıcılar) render edilir; diğer platform ve bölgelerde hiç görünmez.
 */

import { useEffect, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { adService } from '@/services/monetization';

export default function AdPrivacyOptionsButton() {
  const t = useT();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adService.isAdPrivacyOptionsRequired().then((required) => {
      if (!cancelled) setAvailable(required);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!available) return null;

  const handleClick = async () => {
    setBusy(true);
    await adService.openAdPrivacyOptions();
    setBusy(false);
    // Form kapandıktan sonra giriş noktası hâlâ gerekli mi, yeniden sor.
    setAvailable(await adService.isAdPrivacyOptionsRequired());
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      style={{
        alignSelf: 'flex-start',
        background: 'rgba(0, 196, 255, 0.06)',
        border: '1px solid rgba(0, 196, 255, 0.25)',
        color: '#67e8f9',
        borderRadius: '8px',
        padding: '10px 16px',
        fontSize: '13px',
        letterSpacing: '0.04em',
        opacity: busy ? 0.6 : 1,
      }}
    >
      {t('ads.privacy_options')}
    </button>
  );
}
