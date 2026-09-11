'use client';

import { Suspense } from 'react';
import { EditorScreen, EditorLoadingFallback } from '@/features/editor';

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorLoadingFallback />}>
      <EditorScreen />
    </Suspense>
  );
}
