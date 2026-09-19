'use client';

/**
 * DOSYA AMACI: Bölüm arası reklam kapandıktan HEMEN SONRA açılan teşvik kartı.
 * Misafir oyuncuya "hesap açarsan reklamlar yarıya iner", hesabı olan oyuncuya
 * "şu fiyata reklamları kaldır" teklifini gösterir. Yalnızca reklam GERÇEKTEN
 * gösterildiyse açılır; kararı `usePlayPage` verir.
 */

import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useT } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import AuthModal from '@/components/common/AuthModal';
import { REMOVE_ADS_OFFER } from '@/services/monetization/offer';

interface AfterAdPromptProps {
    /** Oyuncu hesap oluşturmuş mu — kartın hangi teklifi göstereceğini belirler. */
    isRegisteredUser: boolean;
    onDismiss: () => void;
}

export function AfterAdPrompt({ isRegisteredUser, onDismiss }: AfterAdPromptProps) {
    const t = useT();
    const { showToast } = useToast();
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Hesabı olan oyuncuya reklamsız paket, misafire hesap oluşturma önerilir.
    const handleAccept = () => {
        if (!isRegisteredUser) {
            setShowAuthModal(true);
            return;
        }
        // 07 tamamlanana kadar gerçek satın alma akışı yok.
        if (!REMOVE_ADS_OFFER.purchasable) {
            showToast(t('ads.cta_premium_soon'), 'info');
        }
        onDismiss();
    };

    return (
        <>
            <motion.div
                className="ad-banner-inset"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // backdrop-filter yok (bkz. WinResultOverlay).
                    background: 'rgba(2, 5, 14, 0.94)',
                    // Kazanma overlay'inin (200) üstünde kalmalı: reklam ondan sonra çıkar.
                    zIndex: 300,
                    padding: 'env(safe-area-inset-top, 16px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 16px) env(safe-area-inset-left, 16px)',
                    boxSizing: 'border-box',
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    style={{
                        background: 'rgba(4, 9, 20, 0.97)',
                        border: '1px solid rgba(0, 196, 255, 0.35)',
                        boxShadow: '0 0 35px rgba(0, 196, 255, 0.12), 0 20px 40px rgba(0, 0, 0, 0.7)',
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
                    }}
                >
                    <h2
                        style={{
                            fontSize: 'clamp(16px, 4.2vw, 19px)',
                            fontWeight: 800,
                            color: '#00c4ff',
                            textShadow: '0 0 16px rgba(0, 196, 255, 0.45)',
                            letterSpacing: '0.04em',
                            margin: 0,
                        }}
                    >
                        {isRegisteredUser ? t('ads.cta_premium_title') : t('ads.cta_guest_title')}
                    </h2>

                    <p style={{ color: '#94a3b8', fontSize: 'clamp(11px, 3vw, 13px)', margin: 0, lineHeight: 1.5 }}>
                        {isRegisteredUser
                            ? t('ads.cta_premium_body', { price: REMOVE_ADS_OFFER.price })
                            : t('ads.cta_guest_body')}
                    </p>

                    <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 2 }}>
                        <button type="button" onClick={onDismiss} style={LATER_BUTTON_STYLE}>
                            {t('ads.cta_later')}
                        </button>
                        <button type="button" onClick={handleAccept} style={ACCEPT_BUTTON_STYLE}>
                            {isRegisteredUser ? t('ads.cta_premium_accept') : t('ads.cta_guest_accept')}
                        </button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Giriş/kayıt tamamlanınca kart da kapanır. */}
            {showAuthModal && (
                <AuthModal
                    onClose={() => {
                        setShowAuthModal(false);
                        onDismiss();
                    }}
                />
            )}
        </>
    );
}

const LATER_BUTTON_STYLE: CSSProperties = {
    flex: 1,
    fontSize: 'clamp(11px, 3vw, 13px)',
    padding: '9px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#cbd5e1',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    letterSpacing: '0.03em',
    touchAction: 'manipulation',
    whiteSpace: 'nowrap',
};

const ACCEPT_BUTTON_STYLE: CSSProperties = {
    flex: 1.4,
    fontSize: 'clamp(11px, 3vw, 13px)',
    padding: '9px 12px',
    background: 'rgba(0, 196, 255, 0.14)',
    border: '1px solid rgba(0, 196, 255, 0.5)',
    color: '#00c4ff',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
    letterSpacing: '0.03em',
    boxShadow: '0 0 14px rgba(0, 196, 255, 0.18)',
    touchAction: 'manipulation',
    whiteSpace: 'nowrap',
};
