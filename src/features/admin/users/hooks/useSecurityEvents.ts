'use client';

/**
 * DOSYA AMACI: Bir kullanıcının güvenlik olaylarını yükleyen ince hook.
 * `useAdminUserProfile` büyümesin diye ayrı durur; yalnızca `role === 'admin'`
 * olduğunda istek atar.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.4
 */

import { useEffect, useState } from 'react';
import { getUserSecurityEvents, type SecurityEventRecord } from '@/services/api/adminClient';

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
  const [events, setEvents] = useState<SecurityEventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let active = true;

    if (!uid || role !== 'admin') {
      setEvents([]);
      setForbidden(role !== 'admin');
      return;
    }

    setLoading(true);
    setForbidden(false);

    getUserSecurityEvents(uid)
      .then((res) => {
        if (!active) return;
        setEvents(res.success ? res.events : []);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[AdminSecurityEvents] load failed:', err);
        setEvents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [uid, role]);

  return { events, loading, forbidden };
}
