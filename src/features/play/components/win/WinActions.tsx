'use client';

import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useT } from '@/contexts/LanguageContext';

interface WinActionsProps {
    isUserAnonymous: boolean;
    loginFailed: boolean;
    onOpenAuth: () => void;
    onRestart: () => void;
    /** undefined → "sonraki seviye" yok, yerine menü butonu gösterilir. */
    onNextLevel: (() => void) | undefined;
    onMenu: () => void;
}

// Sonraki seviye / menü butonları birebir aynı stile sahipti (iki kopya).
const PRIMARY_BUTTON_STYLE: CSSProperties = {
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
};

/** Kazanma ekranının alt butonları: (anonimse) giriş yap + tekrar / sonraki-menü. */
export function WinActions({ isUserAnonymous, loginFailed, onOpenAuth, onRestart, onNextLevel, onMenu }: WinActionsProps) {
    const t = useT();

    return (
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
                        onClick={onOpenAuth}
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
                    <button type="button" onClick={onNextLevel} style={PRIMARY_BUTTON_STYLE}>
                        {t('win.next_level')}
                    </button>
                ) : (
                    <button type="button" onClick={onMenu} style={PRIMARY_BUTTON_STYLE}>
                        {t('win.menu')}
                    </button>
                )}
            </div>
        </motion.div>
    );
}
