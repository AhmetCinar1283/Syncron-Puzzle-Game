'use client';

/**
 * DOSYA AMACI: `/play` level atlama onay kartı (05) — ortak `RewardedActionDialog`'u
 * atlama metinleri ve "skor/yıldız verilmez" notuyla doldurur.
 */

import { useT } from '@/contexts/LanguageContext';
import { RewardedActionDialog } from '@/features/rewarded-actions';
import type { PlaySkip } from '../hooks/usePlaySkip';

/** Genel ret mesajlarının atlamaya özgü karşılıkları. */
const SKIP_MESSAGE_OVERRIDES: Record<string, string> = {
    'rewarded.decline_limit': 'skip.decline_limit',
    'rewarded.decline_not_allowed': 'skip.decline_not_allowed',
};

export function SkipLevelDialog({ dialog }: { dialog: PlaySkip['dialog'] }) {
    const t = useT();
    if (!dialog.open) return null;
    const errorKey = dialog.errorKey ? SKIP_MESSAGE_OVERRIDES[dialog.errorKey] ?? dialog.errorKey : null;

    return (
        <RewardedActionDialog
            title={t('skip.dialog_title')}
            description={t('skip.dialog_body')}
            notice={t('skip.score_notice')}
            availability={dialog.availability}
            busy={dialog.busy}
            busyLabel={t('skip.busy')}
            errorKey={errorKey}
            onConfirm={dialog.confirm}
            onClose={dialog.dismiss}
            accentColor="#a78bfa"
        />
    );
}
