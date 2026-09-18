'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { getEditorBackRoute } from '@/components/common/BackButtonManager';
import { getRouteLabelKey } from '@/lib/routeLabels';
import { useT } from '@/contexts/LanguageContext';

/**
 * Editörün geri hedefi: editöre gerçekte hangi sayfadan gelindiyse orası.
 * Kayıt yoksa ana menüye düşer. Etiket de hedefe göre değişir ("Menü" yerine
 * "Bölümler", "Leveller" vb.).
 *
 * Hedef yalnızca istemcide (sessionStorage) bilindiği için sunucu anlık görüntüsü
 * güvenli varsayılan '/' döner; istemcide gerçek değer okunur.
 */

/** Abonelik gerekmez: hedef, sayfa açıldıktan sonra değişmeyen bir oturum verisidir. */
const subscribeNoop = () => () => {};

export function useEditorBackTarget() {
  const router = useRouter();
  const t = useT();
  const target = useSyncExternalStore(subscribeNoop, getEditorBackRoute, () => '/');

  const goBack = useCallback(() => {
    router.replace(target);
  }, [router, target]);

  return { target, label: t(getRouteLabelKey(target)), goBack };
}
