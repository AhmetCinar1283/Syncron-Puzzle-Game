'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/contexts/LanguageContext';
import { useGamepad } from '@/hooks/useGamepad';
import { useAuthContext } from '@/contexts/AuthContext';
import AuthModal from '@/components/common/AuthModal';
import { sendFeedback } from '@/services/api/gameClient';

interface WorkerResult {
    success: boolean;
    stars?: 1 | 2 | 3;
    scoreDelta?: number;
    isFirstCompletion?: boolean;
    isNewBestSolution?: boolean;
    isBestSolution?: boolean;
    isGoodSolution?: boolean;
}

interface WinResultOverlayProps {
    result: WorkerResult | null; // null = yükleniyor
    moveCount: number;
    levelId?: string;
    version?: number;
    onRestart: () => void;
    onNextLevel: (() => void) | undefined;
    onMenu: () => void;
}

function Star({ n, loading, stars }: { n: 1 | 2 | 3; loading: boolean; stars: number }) {
    const isLit = !loading && n <= stars;

    return (
        <AnimatePresence mode="wait">
            {loading ? (
                <motion.span
                    key="grey"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.25 }}
                    exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ delay: (n - 1) * 0.07, duration: 0.25, type: 'spring', stiffness: 300, damping: 20 }}
                    style={{ fontSize: 'clamp(28px, 8vw, 40px)', color: '#1e3a5f', display: 'inline-block', lineHeight: 1 }}
                >
                    ★
                </motion.span>
            ) : (
                <motion.span
                    key={isLit ? 'gold' : 'dim'}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={isLit
                        ? {
                            scale: [0.3, 2.1, 0.9, 1.05, 1],
                            opacity: 1,
                            color: ['#1e3a5f', '#ffe066', '#ffd700', '#ffd700'],
                            filter: [
                                'drop-shadow(0 0 0px #ffd700)',
                                'drop-shadow(0 0 32px #ffd700) drop-shadow(0 0 64px #ff9900)',
                                'drop-shadow(0 0 14px #ffd700) drop-shadow(0 0 28px rgba(255,160,0,0.6))',
                                'drop-shadow(0 0 10px #ffd700) drop-shadow(0 0 22px rgba(255,160,0,0.45))',
                            ],
                        }
                        : {
                            scale: 0.85,
                            opacity: 0.18,
                            color: '#1e3a5f',
                            filter: 'drop-shadow(0 0 0px transparent)',
                        }
                    }
                    exit={{ scale: 0.4, opacity: 0, transition: { duration: 0.12 } }}
                    transition={isLit
                        ? { delay: (n - 1) * 0.22, duration: 0.7, ease: [0.22, 1, 0.36, 1] }
                        : { delay: (n - 1) * 0.05, duration: 0.2 }
                    }
                    style={{ fontSize: 'clamp(28px, 8vw, 40px)', display: 'inline-block', lineHeight: 1 }}
                >
                    ★
                </motion.span>
            )}
        </AnimatePresence>
    );
}

export function WinResultOverlay({ result, moveCount, levelId, version, onRestart, onNextLevel, onMenu }: WinResultOverlayProps) {
    const t = useT();
    const { user, isAnonymous } = useAuthContext();
    const loading = result === null;
    const stars = result?.stars ?? 0;

    const [selectedLike, setSelectedLike] = useState<boolean | null>(null);
    const [selectedDiff, setSelectedDiff] = useState<'easy' | 'normal' | 'hard' | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [alreadyFeedback, setAlreadyFeedback] = useState(false);

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authAttempted, setAuthAttempted] = useState(false);
    const [loginFailed, setLoginFailed] = useState(false);

    const isUserAnonymous = !user || isAnonymous;

    const getDiffLabel = (diff: 'easy' | 'normal' | 'hard') => {
        const val = t(`feedback.${diff}`);
        if (val && val !== `feedback.${diff}`) return val;
        return diff === 'easy' ? 'Kolay' : diff === 'normal' ? 'Normal' : 'Zor';
    };

    const getBadgeInfo = () => {
        if (!result) return null;
        if (result.isNewBestSolution) {
            return {
                text: t('win.new_record'),
                color: '#00ff88',
                bg: 'rgba(0, 255, 136, 0.12)',
                border: 'rgba(0, 255, 136, 0.35)',
            };
        }
        if (result.isBestSolution) {
            return {
                text: t('win.record'),
                color: '#00c4ff',
                bg: 'rgba(0, 196, 255, 0.12)',
                border: 'rgba(0, 196, 255, 0.35)',
            };
        }
        if (result.isGoodSolution) {
            return {
                text: t('win.good_solution'),
                color: '#c084fc',
                bg: 'rgba(147, 51, 234, 0.12)',
                border: 'rgba(147, 51, 234, 0.35)',
            };
        }
        return null;
    };
    const badgeInfo = getBadgeInfo();

    // Check auth status after AuthModal is closed
    useEffect(() => {
        if (authAttempted && !showAuthModal) {
            if (!user || isAnonymous) {
                setLoginFailed(true);
            } else {
                setLoginFailed(false);
                setAuthAttempted(false);
            }
        }
    }, [showAuthModal, user, isAnonymous, authAttempted]);

    const handleOpenAuth = () => {
        setAuthAttempted(true);
        setLoginFailed(false);
        setShowAuthModal(true);
    };

    // Check if user has already submitted feedback for this level version locally
    useEffect(() => {
        if (levelId && version) {
            const hasFeedback = localStorage.getItem(`feedback_submitted_${levelId}_${version}`);
            if (hasFeedback) {
                setAlreadyFeedback(true);
            }
        }
    }, [levelId, version]);

    // Submit feedback when both thumbs and difficulty are chosen
    useEffect(() => {
        if (levelId && version && selectedLike !== null && selectedDiff !== null && !submitted) {
            setSubmitted(true);
            localStorage.setItem(`feedback_submitted_${levelId}_${version}`, 'true');
            
            sendFeedback({
                levelId,
                version,
                difficulty: selectedDiff,
                liked: selectedLike ? 1 : 0,
            });
        }
    }, [selectedLike, selectedDiff, levelId, version, submitted]);

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
                    background: 'rgba(2, 5, 14, 0.82)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
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
                            <Star n={1} loading={loading} stars={stars} />
                            <Star n={2} loading={loading} stars={stars} />
                            <Star n={3} loading={loading} stars={stars} />
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
                    {!alreadyFeedback && !submitted && levelId && version && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.25 }}
                            style={{
                                width: '100%',
                                background: 'rgba(255, 255, 255, 0.025)',
                                border: '1px solid rgba(255, 255, 255, 0.07)',
                                borderRadius: 12,
                                padding: '10px 12px',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                margin: '2px 0',
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 8,
                                width: '100%',
                            }}>
                                <span style={{
                                    color: '#94a3b8',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    letterSpacing: '0.02em',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {t('feedback.rate_title')}
                                </span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedLike(true)}
                                        style={{
                                            background: selectedLike === true ? 'rgba(0, 255, 136, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                            border: selectedLike === true ? '1px solid rgba(0, 255, 136, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                                            color: selectedLike === true ? '#00ff88' : '#94a3b8',
                                            borderRadius: 7,
                                            padding: '4px 10px',
                                            fontSize: 13,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            lineHeight: 1,
                                        }}
                                    >
                                        👍
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedLike(false)}
                                        style={{
                                            background: selectedLike === false ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                            border: selectedLike === false ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                                            color: selectedLike === false ? '#ef4444' : '#94a3b8',
                                            borderRadius: 7,
                                            padding: '4px 10px',
                                            fontSize: 13,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                            lineHeight: 1,
                                        }}
                                    >
                                        👎
                                    </button>
                                </div>
                            </div>

                            {/* Difficulty buttons */}
                            <div style={{ display: 'flex', width: '100%', gap: 6 }}>
                                {(['easy', 'normal', 'hard'] as const).map((diff) => {
                                    const label = getDiffLabel(diff);
                                    const isSelected = selectedDiff === diff;
                                    return (
                                        <button
                                            key={diff}
                                            type="button"
                                            onClick={() => setSelectedDiff(diff)}
                                            style={{
                                                flex: 1,
                                                minWidth: 0,
                                                background: isSelected ? 'rgba(0, 196, 255, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                                border: isSelected ? '1px solid rgba(0, 196, 255, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                color: isSelected ? '#00c4ff' : '#94a3b8',
                                                borderRadius: 7,
                                                padding: '6px 2px',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* Thank you feedback notice */}
                    {submitted && (
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
                            }}
                        >
                            ✓ {t('feedback.thank_you')}
                        </motion.p>
                    )}

                    {/* Action buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.28 }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8,
                            width: '100%',
                            marginTop: 2,
                        }}
                    >
                        {isUserAnonymous && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <button
                                    type="button"
                                    onClick={handleOpenAuth}
                                    style={{
                                        width: '100%',
                                        fontSize: 'clamp(11px, 2.8vw, 12px)',
                                        padding: '8px 14px',
                                        background: 'rgba(0, 196, 255, 0.1)',
                                        border: '1px solid rgba(0, 196, 255, 0.4)',
                                        color: '#00c4ff',
                                        borderRadius: 10,
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        letterSpacing: '0.03em',
                                        transition: 'all 0.15s',
                                        touchAction: 'manipulation',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                    }}
                                >
                                    🔑 {t('win.login_to_save')}
                                </button>
                                {loginFailed && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            color: '#ef4444',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            margin: 0,
                                            textAlign: 'center',
                                        }}
                                    >
                                        ⚠️ {t('win.login_failed')}
                                    </motion.p>
                                )}
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            gap: 8,
                            width: '100%',
                            justifyContent: 'center',
                        }}>
                            <button
                                type="button"
                                onClick={onRestart}
                                style={{
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
                                    transition: 'all 0.15s',
                                    touchAction: 'manipulation',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {t('win.restart')}
                            </button>
                            {onNextLevel ? (
                                <button
                                    type="button"
                                    onClick={onNextLevel}
                                    style={{
                                        flex: 1.4,
                                        fontSize: 'clamp(11px, 3vw, 13px)',
                                        padding: '9px 12px',
                                        background: 'rgba(0, 255, 136, 0.14)',
                                        border: '1px solid rgba(0, 255, 136, 0.5)',
                                        color: '#00ff88',
                                        borderRadius: 10,
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        letterSpacing: '0.03em',
                                        boxShadow: '0 0 14px rgba(0, 255, 136, 0.18)',
                                        transition: 'all 0.15s',
                                        touchAction: 'manipulation',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {t('win.next_level')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onMenu}
                                    style={{
                                        flex: 1.4,
                                        fontSize: 'clamp(11px, 3vw, 13px)',
                                        padding: '9px 12px',
                                        background: 'rgba(0, 255, 136, 0.14)',
                                        border: '1px solid rgba(0, 255, 136, 0.5)',
                                        color: '#00ff88',
                                        borderRadius: 10,
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        letterSpacing: '0.03em',
                                        boxShadow: '0 0 14px rgba(0, 255, 136, 0.18)',
                                        transition: 'all 0.15s',
                                        touchAction: 'manipulation',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {t('win.menu')}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>

                {showAuthModal && (
                    <AuthModal onClose={() => setShowAuthModal(false)} />
                )}
            </motion.div>
        </AnimatePresence>
    );
}
