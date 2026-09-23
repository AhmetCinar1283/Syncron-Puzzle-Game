'use client';

/**
 * DOSYA AMACI: Bir kullanıcının güvenlik olaylarını yükleyen ince hook.
 * `useAdminUserProfile` büyümesin diye ayrı durur; yalnızca `role === 'admin'`
 * olduğunda istek atar.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.4
 */

import { useEffect, useState } from 'react';
import { getUserSecurityEvents, type SecurityEventRecord } from '@/services/api/adminClient';

/** Boş liste için sabit kimlik — her render'da yeni dizi üretip tüketicileri boşuna tetiklemeyelim. */
const NO_EVENTS: SecurityEventRecord[] = [];

export interface SecurityEventsState {
  events: SecurityEventRecord[];
  loading: boolean;
  /** Rol yetersiz (moderatör) veya istek başarısız — panel bunu ayırt eder. */
  forbidden: boolean;
}

/**
 * Alternatifi neydi ve neden reddettim? Olayları `useAdminUserProfile`'ın
 *   mevcut `loadWorkspaceData` toplu isteğine eklemek. Reddedildi: o hook
 *   moderatör için de çalışıyor ve 403 tüm çalışma alanını kırmızıya
 *   düşürürdü; ayrıca dosya zaten 300+ satır.
 * Yeni bir olay tipi eklenince bu dosya değişmek zorunda mı? HAYIR — olaylar
 *   sunucudan serbest string olarak gelir, burada hiçbir olay adı geçmez.
 * Değer eksik/null gelirse? `uid` yoksa veya rol admin değilse istek hiç
 *   atılmaz; hata durumunda liste boş kalır ve sayfanın kalanı çalışmaya devam eder.
 */
export function useSecurityEvents(uid: string | null | undefined, role: string | null | undefined): SecurityEventsState {
  // Tek state: "hangi kullanıcı için hangi sonuç geldi". `loading` ve `forbidden`
  // bundan TÜREVdir — efektin gövdesinde senkron state yazmak gerekmez, dolayısıyla
  // fazladan render turu ve "eski kullanıcının olayları bir kare görünür" yarışı da
  // olmaz. Sonuç yalnızca istek döndüğünde (asenkron) yazılır.
  const [loaded, setLoaded] = useState<{ key: string; events: SecurityEventRecord[] } | null>(null);

  const requestKey = uid && role === 'admin' ? uid : null;
  const loadedEvents = loaded !== null && requestKey !== null && loaded.key === requestKey ? loaded.events : null;

  const events = loadedEvents ?? NO_EVENTS;
  const loading = requestKey !== null && loadedEvents === null;
  const forbidden = role !== 'admin';

  useEffect(() => {
    if (!requestKey) return;
    let active = true;

    getUserSecurityEvents(requestKey)
      .then((res) => {
        if (!active) return;
        setLoaded({ key: requestKey, events: res.success ? res.events : [] });
      })
      .catch((err) => {
        if (!active) return;
        console.error('[AdminSecurityEvents] load failed:', err);
        setLoaded({ key: requestKey, events: [] });
      });

    return () => {
      active = false;
    };
  }, [requestKey]);

  return { events, loading, forbidden };
}
