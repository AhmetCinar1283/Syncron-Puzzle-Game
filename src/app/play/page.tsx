'use client';

import { Suspense } from 'react';
import { PlayContent, LoadingScreen } from '@/features/play';

export default function PlayPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <PlayContent />
        </Suspense>
    );
}
