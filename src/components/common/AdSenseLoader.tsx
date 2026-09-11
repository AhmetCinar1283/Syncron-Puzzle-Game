'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function AdSenseLoader() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Capacitor yerel mobil platformlarında (Android/iOS) çalışıp çalışmadığını kontrol edin
    const isCapacitor = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
    if (!isCapacitor) {
      setShouldLoad(true);
    }
  }, []);

  if (!shouldLoad) {
    return null;
  }

  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3798429741438186"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
