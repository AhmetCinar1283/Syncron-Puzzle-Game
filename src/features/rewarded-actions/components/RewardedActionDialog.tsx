'use client';

/**
 * DOSYA AMACI: Ödüllü aksiyon onay kartı (aksiyondan bağımsız). Başlık/açıklama
 * çağırandan gelir; butonun "reklam izle" mi "ücretsiz kullan" mı olduğunu ve
 * engel/hata mesajını erişim durumuna göre bu bileşen seçer.
 * Ortak Modal.tsx sistemi üzerine inşa edilmiştir.
 */

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { Clapperboard, Gift, Loader2 } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { useMountedModalSound, soundEngine } from '@/services/audio';
import type { RewardedAvailability } from '@/services/monetization';
import { Modal } from '@/components/ui';
import { useGamepad } from '@/hooks/useGamepad';
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
    useMountedModalSound();
    const blockedKey = availability.kind === 'blocked' ? declineMessageKey(availability.reason) : null;
    const message = errorKey ?? blockedKey;

    // 0: Cancel / Close, 1: Confirm / Watch Ad
    const hasPrimary = availability.kind !== 'blocked';
    const [focusedBtn, setFocusedBtn] = useState<0 | 1>(hasPrimary ? 1 : 0);

    const toggleFocus = useCallback(() => {
        if (!hasPrimary) return;
        setFocusedBtn((prev) => {
            soundEngine.play('ui.tick');
            return prev === 0 ? 1 : 0;
        });
    }, [hasPrimary]);

    const handleConfirm = useCallback(() => {
        if (!busy && hasPrimary) {
            soundEngine.play('ui.confirm');
            onConfirm();
        }
    }, [busy, hasPrimary, onConfirm]);

    const handleClose = useCallback(() => {
        if (!busy) {
            onClose();
        }
    }, [busy, onClose]);

    // Gamepad desteği - priority: 'modal'
    useGamepad({
        enabled: !busy,
        priority: 'modal',
        onMove: () => {
            toggleFocus();
        },
        onConfirm: () => {
            if (focusedBtn === 1) {
                handleConfirm();
            } else {
                handleClose();
            }
        },
        onCancel: handleClose,
    });

    // Klavye desteği
    useEffect(() => {
        if (busy) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Tab') {
                e.preventDefault();
                toggleFocus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (focusedBtn === 1) handleConfirm();
                else handleClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [busy, focusedBtn, toggleFocus, handleConfirm, handleClose]);

    return (
        <Modal
            open={true}
            onClose={handleClose}
            title={title}
            accentColor={accentColor}
            maxWidth={380}
            showCloseButton={false}
            zIndex={300}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', padding: '4px 2px' }}>
                <p style={BODY_STYLE}>{description}</p>
                {notice && <p style={NOTICE_STYLE}>{notice}</p>}

                {availability.kind === 'free' && availability.remaining !== null && !message && (
                    <p style={BODY_STYLE}>{t('rewarded.free_remaining', { n: availability.remaining })}</p>
                )}

                {message && <p role="alert" style={ERROR_STYLE}>{t(message)}</p>}

                <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 6 }}>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={busy}
                        onPointerEnter={() => setFocusedBtn(0)}
                        style={{
                            ...SECONDARY_BUTTON_STYLE,
                            border: focusedBtn === 0 ? `1.5px solid ${accentColor}` : '1px solid rgba(255, 255, 255, 0.15)',
                            background: focusedBtn === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            color: focusedBtn === 0 ? '#ffffff' : '#cbd5e1',
                            transform: focusedBtn === 0 ? 'scale(1.02)' : 'scale(1)',
                            boxShadow: focusedBtn === 0 ? `0 0 12px ${accentColor}40` : 'none',
                        }}
                    >
                        {availability.kind === 'blocked' ? t('rewarded.close') : t('rewarded.cancel')}
                    </button>

                    {hasPrimary && (
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={busy}
                            onPointerEnter={() => setFocusedBtn(1)}
                            style={{
                                ...PRIMARY_BUTTON_STYLE,
                                background: focusedBtn === 1 ? `${accentColor}38` : `${accentColor}20`,
                                border: focusedBtn === 1 ? `2px solid ${accentColor}` : `1px solid ${accentColor}80`,
                                color: accentColor,
                                cursor: busy ? 'wait' : 'pointer',
                                transform: focusedBtn === 1 ? 'scale(1.02)' : 'scale(1)',
                                boxShadow: focusedBtn === 1 ? `0 0 18px ${accentColor}60` : 'none',
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
            </div>
            <style>{`@keyframes rewarded-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </Modal>
    );
}

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
    padding: '10px 14px',
    borderRadius: 10,
    letterSpacing: '0.03em',
    touchAction: 'manipulation',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 160ms ease',
    outline: 'none',
};

const SECONDARY_BUTTON_STYLE: CSSProperties = {
    ...BUTTON_BASE,
    flex: 1,
    cursor: 'pointer',
    fontWeight: 600,
};

const PRIMARY_BUTTON_STYLE: CSSProperties = {
    ...BUTTON_BASE,
    flex: 1.4,
    fontWeight: 700,
};
