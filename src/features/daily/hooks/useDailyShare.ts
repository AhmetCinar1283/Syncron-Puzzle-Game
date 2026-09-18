'use client';

/**
 * DOSYA AMACI: Günlük sonucu paylaşma aksiyonu: metni üretir (link yalnızca dış
 * link açılabilen platformlarda), paylaşım/pano servisini çağırır ve sonucu toast'la bildirir.
 */
import { useCallback, useState } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useToast } from '@/contexts/ToastContext';
import { shareText } from '@/services/share/shareText';
import { buildShareText, type ShareResultInput } from '../lib/shareText';
import { DAILY_SHARE_URL } from '../lib/dailyConfig';

export function useDailyShare() {
  const t = useT();
  const { externalLinks } = useCapabilities();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const share = useCallback(async (result: Omit<ShareResultInput, 'url'>) => {
    if (busy) return;
    setBusy(true);
    const url = externalLinks ? DAILY_SHARE_URL : undefined;
    const text = buildShareText({ ...result, url }, { moves: t('daily.share_moves'), hinted: t('daily.share_hinted') });
    const outcome = await shareText({ text, url, title: t('daily.title') });
    setBusy(false);
    if (outcome === 'copied') showToast(t('daily.share_copied'), 'success');
    else if (outcome === 'failed') showToast(t('daily.share_failed'), 'error');
  }, [busy, externalLinks, t, showToast]);

  return { share, busy };
}
