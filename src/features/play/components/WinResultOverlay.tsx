'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/contexts/LanguageContext';
import { useGamepad } from '@/hooks/useGamepad';
import AuthModal from '@/components/common/AuthModal';
import type { WorkerResult } from '../lib/types';
import { getWinBadgeInfo } from '../lib/winBadge';
import { useWinAuthPrompt } from '../hooks/useWinAuthPrompt';
import { useWinFeedback } from '../hooks/useWinFeedback';
import { WinStar } from './win/WinStar';
import { WinFeedbackWidget } from './win/WinFeedbackWidget';
import { WinActions } from './win/WinActions';
import { GameIcon } from '@/components/icons';

interface WinResultOverlayProps {
    result: WorkerResult | null; // null = yükleniyor
    moveCount: number;
    levelId?: string;
    version?: number;
    onRestart: () => void;
    onNextLevel: (() => void) | undefined;
    onMenu: () => void;
}

/**
 * Kazanma sonucu overlay'i. Effect sırası önceki tek-dosya sürümle aynı tutuldu:
 * auth kontrolü → feedback (mevcut mu / gönder) → Enter tuşu → gamepad.
 */
export function WinResultOverlay({ result, moveCount, levelId, version, onRestart, onNextLevel, onMenu }: WinResultOverlayProps) {
    const t = useT();
    const loading = result === null;
    const stars = result?.stars ?? 0;

    const auth = useWinAuthPrompt();
    const feedback = useWinFeedback(levelId, version);

    const badgeInfo = getWinBadgeInfo(result, t);

    const handlePrimaryAction = () => {
        if (onNextLevel) {
            onNextLevel();
        } else {
            onMenu();
        }
    };

    // Handle keyboard Enter key
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handlePrimaryAction();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- deps birebir korunuyor
    }, [onNextLevel, onMenu]);

    // Handle Gamepad Confirm / Restart / Menu buttons
    useGamepad({
        onConfirm: handlePrimaryAction,
        onRestart: onRestart,
        onMenu: onMenu,
    });

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // backdrop-filter yok: WebView'de kare başına tüm ekranı
                    // yeniden bulanıklaştırır ve kazanma anında — animasyonun
                    // en yoğun anında — belirgin takılma yaratır. Aynı görsel
                    // ayrışmayı biraz daha opak düz bir zemin ücretsiz veriyor.
                    background: 'rgba(2, 5, 14, 0.92)',
                    zIndex: 200,
                    // Güvenli alan (notch, home indicator)
                    padding: 'env(safe-area-inset-top, 16px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 16px) env(safe-area-inset-left, 16px)',
                    boxSizing: 'border-box',
                }}
            >
                <motion.div
                    initial={{ scale: 0.88, opacity: 0, y: 16 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.88, opacity: 0, y: 16 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28, delay: 0.04 }}
                    style={{
                        background: 'rgba(4, 9, 20, 0.96)',
                        border: '1px solid rgba(0, 255, 136, 0.35)',
                        boxShadow: '0 0 35px rgba(0, 255, 136, 0.12), 0 20px 40px rgba(0, 0, 0, 0.7)',
                        borderRadius: 20,
                        padding: 'clamp(20px, 4vw, 26px) clamp(16px, 4vw, 22px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 12,
                        width: 'min(90vw, 340px)',
                        maxWidth: 340,
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Stars Container */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <div style={{ display: 'flex', gap: 'clamp(4px, 2vw, 8px)', alignItems: 'center', justifyContent: 'center' }}>
                            <WinStar n={1} loading={loading} stars={stars} />
                            <WinStar n={2} loading={loading} stars={stars} />
                            <WinStar n={3} loading={loading} stars={stars} />
                        </div>

                        {/* Loading dots */}
                        <AnimatePresence>
                            {loading && (
                                <motion.div
                                    key="dots"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, scale: 0.7 }}
                                    transition={{ duration: 0.18 }}
                                    style={{ display: 'flex', gap: 5, alignItems: 'center', height: 12 }}
                                >
                                    {[0, 1, 2].map((i) => (
                                        <motion.span
                                            key={i}
                                            animate={{ y: [0, -4, 0], opacity: [0.25, 1, 0.25] }}
                                            transition={{ repeat: Infinity, duration: 0.85, delay: i * 0.17, ease: 'easeInOut' }}
                                            style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#00c4ff' }}
                                        />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Level Completed Title */}
                    <motion.h2
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.14 }}
                        style={{
                            fontSize: 'clamp(17px, 4.5vw, 21px)',
                            fontWeight: 800,
                            color: '#00ff88',
                            textShadow: '0 0 16px rgba(0,255,136,0.5)',
                            letterSpacing: '0.04em',
                            margin: 0,
                            textAlign: 'center',
                        }}
                    >
                        {t('win.title')}
                    </motion.h2>

                    {/* Solved in Moves & Points & Badges in one clean row */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.22 }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                            margin: 0,
                        }}
                    >
                        <span style={{ color: '#94a3b8', fontSize: 'clamp(11px, 3vw, 13px)', fontWeight: 500 }}>
                            {t('win.solved_in', { n: moveCount })}
                        </span>
                        {!loading && result?.scoreDelta !== undefined && result.scoreDelta > 0 && (
                            <motion.span
                                key="pts"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 450, damping: 14 }}
                                style={{
                                    color: '#ffd700',
                                    background: 'rgba(255, 215, 0, 0.12)',
                                    border: '1px solid rgba(255, 215, 0, 0.35)',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    borderRadius: 999,
                                    letterSpacing: '0.04em',
                                }}
                            >
                                +{result.scoreDelta} PTS
                            </motion.span>
                        )}
                        {!loading && result?.hintUsed && (
                            <motion.span
                                key="hint-badge"
                                initial={{ opacity: 0, y: 3 }}
                                animate={{ opacity: 1, y: 0 }}
                                title={t('hint.win_notice_detail')}
                                style={{
                                    color: '#facc15',
                                    background: 'rgba(250, 204, 21, 0.1)',
                                    border: '1px solid rgba(250, 204, 21, 0.35)',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    borderRadius: 999,
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {t('hint.win_notice')}
                            </motion.span>
                        )}
                        {!loading && result?.success === false && result.reason === 'offline' && (
                            <motion.span
                                key="offline-badge"
                                initial={{ opacity: 0, y: 3 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    color: '#f59e0b',
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    borderRadius: 999,
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {t('play.offline_score_not_saved')}
                            </motion.span>
                        )}
                        {!loading && result?.success === false && result.reason === 'rate_limited' && (
                            <motion.span
                                key="rate-limited-badge"
                                initial={{ opacity: 0, y: 3 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    color: '#f59e0b',
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    borderRadius: 999,
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {t('play.rate_limited')}
                            </motion.span>
                        )}
                        {badgeInfo && (
                            <motion.span
                                key="best-badge"
                                initial={{ opacity: 0, y: 3 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    color: badgeInfo.color,
                                    background: badgeInfo.bg,
                                    border: `1px solid ${badgeInfo.border}`,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '1px 7px',
                                    borderRadius: 999,
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {badgeInfo.text}
                            </motion.span>
                        )}
                    </motion.div>

                    {/* Optional Feedback Widget */}
                    {!feedback.alreadyFeedback && !feedback.submitted && levelId && version && (
                        <WinFeedbackWidget
                            selectedLike={feedback.selectedLike}
                            onSelectLike={feedback.setSelectedLike}
                            selectedDiff={feedback.selectedDiff}
                            onSelectDiff={feedback.setSelectedDiff}
                        />
                    )}

                    {/* Thank you feedback notice */}
                    {feedback.submitted && (
                        <motion.p
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{
                                color: '#00ff88',
                                fontSize: 11,
                                fontWeight: 600,
                                margin: '2px 0',
                                textAlign: 'center',
                                letterSpacing: '0.02em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                            }}
                        >
                            <GameIcon name="check" size={12} /> {t('feedback.thank_you')}
                        </motion.p>
                    )}

                    <WinActions
                        isUserAnonymous={auth.isUserAnonymous}
                        loginFailed={auth.loginFailed}
                        onOpenAuth={auth.handleOpenAuth}
                        onRestart={onRestart}
                        onNextLevel={onNextLevel}
                        onMenu={onMenu}
                    />
                </motion.div>

                {auth.showAuthModal && (
                    <AuthModal onClose={auth.closeAuthModal} />
                )}
            </motion.div>
        </AnimatePresence>
    );
}
