'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';

interface LevelNotesModalProps {
    notes?: string;
    onClose: () => void;
}

/** Seviye notları modalı (backdrop tıklaması / ✕ / kapat butonu ile kapanır). */
export function LevelNotesModal({ notes, onClose }: LevelNotesModalProps) {
    const t = useT();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || typeof document === 'undefined') return null;

    return createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(2, 5, 14, 0.85)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                boxSizing: 'border-box',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'rgba(6, 13, 26, 0.98)',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    borderRadius: 14,
                    padding: '22px 24px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(251, 191, 36, 0.15)',
                    width: '100%',
                    maxWidth: 420,
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    gap: 16,
                    margin: 'auto',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: '#fbbf24',
                            textShadow: '0 0 10px rgba(251,191,36,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <GameIcon name="lightbulb" size={16} /> {t('hud.level_notes')}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#475569',
                            fontSize: 16,
                            cursor: 'pointer',
                            transition: 'color 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 4,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                    >
                        <GameIcon name="close" size={14} />
                    </button>
                </div>
                <div
                    style={{
                        color: '#94a3b8',
                        fontSize: 12,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        overflowY: 'auto',
                        maxHeight: '40vh',
                        paddingRight: 6,
                    }}
                >
                    {notes}
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '8px 0',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        background: 'rgba(251,191,36,0.1)',
                        border: '1px solid rgba(251,191,36,0.3)',
                        color: '#fbbf24',
                        borderRadius: 6,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                    }}
                >
                    {t('hud.level_notes_close')}
                </button>
            </div>
        </div>,
        document.body
    );
}
