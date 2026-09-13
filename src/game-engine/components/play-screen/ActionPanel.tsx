'use client';

import { motion } from 'framer-motion';
import { useT } from '@/contexts/LanguageContext';
import type { GameActionButton } from '../../logic/actions/types';
import { GameIcon } from '@/components/icons';

interface ActionPanelProps {
    /** Son snapshot'ın availableActions'ı; undefined/boş → "aksiyon yok" yazısı. */
    actions: GameActionButton[] | undefined;
    disabled: boolean;
    onExecute: (action: GameActionButton) => void;
}

/** Board altındaki aksiyon butonları paneli (kilit aksiyonları kırmızı, diğerleri mavi). */
export function ActionPanel({ actions, disabled, onExecute }: ActionPanelProps) {
    const t = useT();

    return (
        <div
            style={{
                flexShrink: 0,
                height: 64,
                background: 'rgba(3, 7, 18, 0.95)',
                borderTop: '1px solid rgba(0, 196, 255, 0.08)',
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 16px',
                boxSizing: 'border-box',
                zIndex: 80,
            }}
        >
            {actions && actions.length > 0 ? (
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        width: '100%',
                        maxWidth: 600,
                    }}
                >
                    {actions.map((action) => {
                        const isLockAction = action.actionType.includes('lock');
                        const borderGlow = isLockAction ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 196, 255, 0.35)';
                        const textColor = isLockAction ? '#ef4444' : '#00c4ff';
                        const hoverBg = isLockAction ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 196, 255, 0.1)';

                        return (
                            <motion.button
                                key={action.id}
                                onClick={() => onExecute(action)}
                                disabled={disabled}
                                whileHover={{
                                    scale: 1.04,
                                    backgroundColor: hoverBg,
                                    borderColor: textColor,
                                    boxShadow: `0 0 12px ${textColor}`,
                                }}
                                whileTap={{ scale: 0.96 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 14px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: `1px solid ${borderGlow}`,
                                    color: textColor,
                                    borderRadius: 8,
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    opacity: disabled ? 0.5 : 1,
                                    transition: 'color 0.2s, border-color 0.2s',
                                    boxShadow: `0 2px 8px rgba(0, 0, 0, 0.2)`,
                                    textShadow: `0 0 6px ${textColor}`,
                                }}
                            >
                                <GameIcon name={action.icon || 'lightning'} size={14} color={textColor} />
                                <span>{action.label}</span>
                            </motion.button>
                        );
                    })}
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        {t('hud.no_actions') || 'No actions available'}
                    </span>
                </div>
            )}
        </div>
    );
}
