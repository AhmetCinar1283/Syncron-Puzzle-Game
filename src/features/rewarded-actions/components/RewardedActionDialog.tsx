'use client';

/**
 * DOSYA AMACI: Ödüllü aksiyon onay kartı (aksiyondan bağımsız). Başlık/açıklama
 * çağırandan gelir; butonun "reklam izle" mi "ücretsiz kullan" mı olduğunu ve
 * engel/hata mesajını erişim durumuna göre bu bileşen seçer.
 */

import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Clapperboard, Gift, Loader2 } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import type { RewardedAvailability } from '@/services/monetization';
import { declineMessageKey } from '../lib/declineMessages';

interface RewardedActionDialogProps {
    title: string;
    description: string;
    /** Ödülün bedelini anlatan ek not (ör. "en fazla 2 yıldız"). */
    notice?: string;
    availability: RewardedAvailability;
    busy: boolean;
    /** Akış sürerken gösterilecek metin. */
    busyLabel?: string;
    errorKey: string | null;
    onConfirm: () => void;
    onClose: () => void;
    /** Vurgu rengi — aksiyonun görsel diline uysun diye. */
    accentColor?: string;
}

export function RewardedActionDialog({
    title,
    description,
    notice,
    availability,
    busy,
    busyLabel,
    errorKey,
    onConfirm,
    onClose,
    accentColor = '#00c4ff',
}: RewardedActionDialogProps) {
    const t = useT();
    const blockedKey = availability.kind === 'blocked' ? declineMessageKey(availability.reason) : null;
    const message = errorKey ?? blockedKey;

    return (
        <motion.div
            className="ad-banner-inset"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
            onClick={busy ? undefined : onClose}
            style={OVERLAY_STYLE}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                initial={{ scale: 0.92, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...CARD_STYLE,
                    border: `1px solid ${accentColor}59`,
                    boxShadow: `0 0 35px ${accentColor}1f, 0 20px 40px rgba(0, 0, 0, 0.7)`,
                }}
            >
                <h2 style={{ ...TITLE_STYLE, color: accentColor, textShadow: `0 0 16px ${accentColor}73` }}>{title}</h2>
                <p style={BODY_STYLE}>{description}</p>
                {notice && <p style={NOTICE_STYLE}>{notice}</p>}

                {availability.kind === 'free' && availability.remaining !== null && !message && (
                    <p style={BODY_STYLE}>{t('rewarded.free_remaining', { n: availability.remaining })}</p>
                )}

                {message && <p role="alert" style={ERROR_STYLE}>{t(message)}</p>}

                <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 2 }}>
                    <button type="button" onClick={onClose} disabled={busy} style={SECONDARY_BUTTON_STYLE}>
                        {availability.kind === 'blocked' ? t('rewarded.close') : t('rewarded.cancel')}
                    </button>
                    {availability.kind !== 'blocked' && (
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={busy}
                            style={{
                                ...PRIMARY_BUTTON_STYLE,
                                background: `${accentColor}24`,
                                border: `1px solid ${accentColor}80`,
                                color: accentColor,
                                cursor: busy ? 'wait' : 'pointer',
                            }}
                        >
                            {busy ? (
                                <>
                                    <Loader2 size={14} style={{ animation: 'rewarded-spin 1s linear infinite' }} />
                                    {busyLabel ?? t('rewarded.busy')}
                                </>
                            ) : availability.kind === 'ad' ? (
                                <><Clapperboard size={14} />{t('rewarded.watch_ad')}</>
                            ) : (
                                <><Gift size={14} />{t('rewarded.use_free')}</>
                            )}
                        </button>
                    )}
                </div>
                <style>{`@keyframes rewarded-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </motion.div>
        </motion.div>
    );
}

const OVERLAY_STYLE: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(2, 5, 14, 0.8)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    // HUD (50) ve kazanma overlay'inin (200) üstünde, reklam sonrası teşvik kartıyla (300) aynı katman.
    zIndex: 300,
    padding: 'env(safe-area-inset-top, 16px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 16px) env(safe-area-inset-left, 16px)',
    boxSizing: 'border-box',
    touchAction: 'manipulation',
};

const CARD_STYLE: CSSProperties = {
    background: 'rgba(4, 9, 20, 0.97)',
    borderRadius: 20,
    padding: 'clamp(20px, 4vw, 26px) clamp(16px, 4vw, 22px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    width: 'min(90vw, 340px)',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    textAlign: 'center',
};

const TITLE_STYLE: CSSProperties = {
    fontSize: 'clamp(16px, 4.2vw, 19px)',
    fontWeight: 800,
    letterSpacing: '0.04em',
    margin: 0,
};

const BODY_STYLE: CSSProperties = {
    color: '#94a3b8',
    fontSize: 'clamp(11px, 3vw, 13px)',
    margin: 0,
    lineHeight: 1.5,
};

const NOTICE_STYLE: CSSProperties = {
    ...BODY_STYLE,
    color: '#fbbf24',
    fontWeight: 600,
};

const ERROR_STYLE: CSSProperties = {
    ...BODY_STYLE,
    color: '#f87171',
    fontWeight: 600,
};

const BUTTON_BASE: CSSProperties = {
    fontSize: 'clamp(11px, 3vw, 13px)',
    padding: '9px 12px',
    borderRadius: 10,
    letterSpacing: '0.03em',
    touchAction: 'manipulation',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
};

const SECONDARY_BUTTON_STYLE: CSSProperties = {
    ...BUTTON_BASE,
    flex: 1,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontWeight: 600,
};

const PRIMARY_BUTTON_STYLE: CSSProperties = {
    ...BUTTON_BASE,
    flex: 1.4,
    fontWeight: 700,
};
