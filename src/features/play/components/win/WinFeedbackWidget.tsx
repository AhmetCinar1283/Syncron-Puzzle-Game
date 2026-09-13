'use client';

import { motion } from 'framer-motion';
import { useT } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import type { FeedbackDifficulty } from '../../lib/types';

interface WinFeedbackWidgetProps {
    selectedLike: boolean | null;
    onSelectLike: (liked: boolean) => void;
    selectedDiff: FeedbackDifficulty | null;
    onSelectDiff: (diff: FeedbackDifficulty) => void;
}

const DIFFICULTIES: readonly FeedbackDifficulty[] = ['easy', 'normal', 'hard'] as const;

/** Beğeni (👍/👎) + zorluk seçimi kartı. Görünürlük kararı çağıranda. */
export function WinFeedbackWidget({ selectedLike, onSelectLike, selectedDiff, onSelectDiff }: WinFeedbackWidgetProps) {
    const t = useT();

    const getDiffLabel = (diff: FeedbackDifficulty) => {
        const val = t(`feedback.${diff}`);
        if (val && val !== `feedback.${diff}`) return val;
        return diff === 'easy' ? 'Kolay' : diff === 'normal' ? 'Normal' : 'Zor';
    };

    return (
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
                        onClick={() => onSelectLike(true)}
                        style={{
                            background: selectedLike === true ? 'rgba(0, 255, 136, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                            border: selectedLike === true ? '1px solid rgba(0, 255, 136, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: selectedLike === true ? '#00ff88' : '#94a3b8',
                            borderRadius: 7,
                            padding: '4px 10px',
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <GameIcon name="thumbs-up" size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelectLike(false)}
                        style={{
                            background: selectedLike === false ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                            border: selectedLike === false ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                            color: selectedLike === false ? '#ef4444' : '#94a3b8',
                            borderRadius: 7,
                            padding: '4px 10px',
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <GameIcon name="thumbs-down" size={14} />
                    </button>
                </div>
            </div>

            {/* Difficulty buttons */}
            <div style={{ display: 'flex', width: '100%', gap: 6 }}>
                {DIFFICULTIES.map((diff) => {
                    const label = getDiffLabel(diff);
                    const isSelected = selectedDiff === diff;
                    return (
                        <button
                            key={diff}
                            type="button"
                            onClick={() => onSelectDiff(diff)}
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
    );
}
