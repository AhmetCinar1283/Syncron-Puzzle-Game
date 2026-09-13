'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GameIcon } from '@/components/icons';

interface WinStarProps {
    n: 1 | 2 | 3;
    /** true → worker yanıtı bekleniyor (gri yıldız). */
    loading: boolean;
    stars: number;
}

export function WinStar({ n, loading, stars }: WinStarProps) {
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
                    style={{ fontSize: 'clamp(28px, 8vw, 40px)', color: '#1e3a5f', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >
                    <GameIcon name="star" size="1em" />
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
                    style={{ fontSize: 'clamp(28px, 8vw, 40px)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >
                    <GameIcon name="star" size="1em" />
                </motion.span>
            )}
        </AnimatePresence>
    );
}
