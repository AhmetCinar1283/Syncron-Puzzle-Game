'use client';

/**
 * DOSYA AMACI: `/play` ipucu onay kartı — ortak `RewardedActionDialog`'u ipucu
 * metinleri ve skor bedeli notuyla doldurur.
 */

import { useT } from '@/contexts/LanguageContext';
import { RewardedActionDialog } from '@/features/rewarded-actions';
import type { PlayHint } from '../hooks/usePlayHint';

export function HintDialog({ dialog }: { dialog: PlayHint['dialog'] }) {
    const t = useT();
    if (!dialog.open) return null;

    return (
        <RewardedActionDialog
            title={t('hint.dialog_title')}
            description={t('hint.dialog_body')}
            notice={t('hint.score_notice')}
            availability={dialog.availability}
            busy={dialog.busy}
            busyLabel={t('hint.computing')}
            errorKey={dialog.errorKey}
            onConfirm={dialog.confirm}
            onClose={dialog.dismiss}
            accentColor="#facc15"
        />
    );
}
