'use client';

import { useEffect, useState } from 'react';
import { COMPACT_BREAKPOINT } from '../components/play-screen/constants';

/**
 * PlayScreen kompakt (dar ekran) modu: window resize dinler.
 * İlk render'da false; mount effect'inde gerçek genişlikle güncellenir (SSR güvenli,
 * önceki inline davranışla aynı).
 */
export function useCompactLayout(): boolean {
    const [isCompact, setIsCompact] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsCompact(window.innerWidth < COMPACT_BREAKPOINT);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isCompact;
}
