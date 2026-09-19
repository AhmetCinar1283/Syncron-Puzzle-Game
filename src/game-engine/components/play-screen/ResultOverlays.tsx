'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { useT } from '@/contexts/LanguageContext';
import type { UIButtonType } from '../../logic/types';
import { REASON_KEYS, TEXT_COLORS } from './constants';
import type { LostReason } from './constants';
import { GameIcon } from '@/components/icons';

type ButtonHandler = (buttonType: UIButtonType) => void;

/** Ortak tam ekran backdrop + yay animasyonlu kart (kırmızı=kayıp, yeşil=test başarısı). */
function OverlayCard({ accent, children }: { accent: 'red' | 'green'; children: ReactNode }) {
    const border = accent === 'red' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(0, 255, 136, 0.4)';
    const boxShadow = accent === 'red'
        ? '0 0 40px rgba(239, 68, 68, 0.15), 0 20px 50px rgba(0,0,0,0.8)'
        : '0 0 40px rgba(0, 255, 136, 0.15), 0 20px 50px rgba(0,0,0,0.8)';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'absolute',
                inset: 0,
                // backdrop-filter yok: kaybetme overlay'i tam da ölüm
                // animasyonunun üstüne biniyor; WebView'de tam ekran blur
                // geçişi orada birkaç kare düşürüyordu.
                backgroundColor: 'rgba(3, 7, 18, 0.93)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: 16,
            }}
        >
            <motion.div
                initial={{ scale: 0.85, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                style={{
                    backgroundColor: '#0a0f1a',
                    border,
                    borderRadius: 20,
                    padding: 'clamp(20px, 5vw, 32px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow,
                    maxWidth: 380,
                    width: '100%',
                }}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

export function LostOverlay({ reason, message, onButtonPress }: { reason: LostReason; message: string; onButtonPress: ButtonHandler }) {
    const t = useT();
    const cfg = REASON_KEYS[reason];

    return (
        <OverlayCard accent="red">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GameIcon name={cfg.icon} size={38} color="#ef4444" style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.7))' }} />
            </div>
            <h2 style={{ fontSize: 'clamp(14px, 4.5vw, 20px)', fontWeight: 800, color: '#ef4444', textShadow: '0 0 16px rgba(239,68,68,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
                {t(cfg.titleKey)}
            </h2>
            <p style={{ color: '#64748b', fontSize: 'clamp(11px, 3vw, 13px)', margin: 0, textAlign: 'center' }}>
                {message || t(cfg.msgKey)}
            </p>
            <button
                onClick={() => onButtonPress('restart')}
                style={{
                    fontSize: 'clamp(11px, 3vw, 13px)',
                    padding: 'clamp(8px, 2vw, 10px) clamp(20px, 6vw, 28px)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.45)',
                    color: '#ef4444',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    marginTop: 4,
                    boxShadow: '0 0 12px rgba(239,68,68,0.12)',
                    transition: 'all 0.15s',
                    touchAction: 'manipulation',
                }}
            >
                {t('lost.try_again')}
            </button>
        </OverlayCard>
    );
}

export function TestSuccessOverlay({ onButtonPress }: { onButtonPress: ButtonHandler }) {
    const t = useT();

    return (
        <OverlayCard accent="green">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GameIcon name="sparkles" size={38} color="#00ff88" style={{ filter: 'drop-shadow(0 0 12px rgba(0,255,136,0.7))' }} />
            </div>
            <h2 style={{ fontSize: 'clamp(14px, 4.5vw, 20px)', fontWeight: 800, color: '#00ff88', textShadow: '0 0 16px rgba(0,255,136,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
                {t('win.title')}
            </h2>
            <p style={{ color: '#64748b', fontSize: 'clamp(11px, 3vw, 13px)', margin: 0, textAlign: 'center' }}>
                {t('win.test_success')}
            </p>

            <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center', marginTop: 4 }}>
                <button
                    onClick={() => onButtonPress('restart')}
                    style={{
                        fontSize: 'clamp(11px, 3vw, 12px)',
                        padding: 'clamp(8px, 2vw, 10px) clamp(16px, 4vw, 22px)',
                        background: 'rgba(148, 163, 184, 0.06)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        color: '#94a3b8',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        transition: 'all 0.15s',
                        touchAction: 'manipulation',
                    }}
                >
                    {t('lost.try_again')}
                </button>
                <button
                    onClick={() => onButtonPress('menu')}
                    style={{
                        fontSize: 'clamp(11px, 3vw, 12px)',
                        padding: 'clamp(8px, 2vw, 10px) clamp(16px, 4vw, 22px)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.45)',
                        color: '#ef4444',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        boxShadow: '0 0 12px rgba(239,68,68,0.12)',
                        transition: 'all 0.15s',
                        touchAction: 'manipulation',
                    }}
                >
                    {t('win.end_test')}
                </button>
            </div>
        </OverlayCard>
    );
}

/** Oyun motorunun bilgi/uyarı metni (kart değil, board üstü yarı saydam katman). */
export function TextOverlay({ message, textType }: { message: string; textType: string }) {
    const color = TEXT_COLORS[textType] ?? '#ffffff';
    return (
        <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(3,7,18,0.78)',
            zIndex: 100,
        }}>
            <span style={{
                color,
                fontSize: 20,
                fontWeight: 'bold',
                textShadow: `0 0 18px ${color}`,
                letterSpacing: '0.04em',
                textAlign: 'center',
                padding: '0 16px',
            }}>
                {message}
            </span>
        </div>
    );
}
