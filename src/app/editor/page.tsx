'use client';

import { Suspense } from 'react';
import { GameThemeProvider } from '@/game-engine/contexts/GameThemeContext';
import { EditorScreen, EditorLoadingFallback } from '@/features/editor';

export default function EditorPage() {
  return (
    <GameThemeProvider>
      <Suspense fallback={<EditorLoadingFallback />}>
        <EditorScreen />
      </Suspense>
    </GameThemeProvider>
  );
}
