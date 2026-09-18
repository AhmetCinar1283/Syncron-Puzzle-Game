'use client';

import { Suspense } from 'react';
import { DailyPlayContent } from '@/features/daily';
import { LoadingScreen } from '@/features/play';

export default function DailyPlayPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DailyPlayContent />
    </Suspense>
  );
}
