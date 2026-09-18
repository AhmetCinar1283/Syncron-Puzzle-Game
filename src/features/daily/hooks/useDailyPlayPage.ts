'use client';

/**
 * DOSYA AMACI: `/daily/play?date=` akışı: bulmacayı yükle → oyun izleme (hamle
 * geçmişi, süre) → ödüllü ipucu (`daily:<id>` level kimliğiyle) → kazanınca
 * sunucu doğrulaması → sonuç kartı. Level atlama bu modda YOKTUR. Telemetri
 * oturumu açılmaz (kampanya level analitiğini kirletmemek için).
 */
import { useCallback, useEffect, useState } from 'react';
import { useAppRouter, useAppSearchParams } from '@/lib/navigation';
import type { Direction, UIButtonType } from '@/game-engine/logic/types';
import { DIRECTION_TO_MOVE, SWITCH_ROOM_MOVE, usePlayAds, usePlayHint, usePlaySession } from '@/features/play';
import { useDailyPuzzleLoader } from './useDailyPuzzleLoader';
import { useDailyCompletion } from './useDailyCompletion';

export function useDailyPlayPage() {
  const router = useAppRouter();
  const date = useAppSearchParams().get('date');

  const loader = useDailyPuzzleLoader(date);
  const puzzle = loader.view?.puzzle ?? null;
  const session = usePlaySession();
  const completion = useDailyCompletion(session);
  const [showResult, setShowResult] = useState(false);

  const { resetTracking, beginSession, recordRestart, recordHintUsed, handleMoveExecuted, handleUndoExecuted, moveHistoryRef } = session;

  // Yeni tahta (ilk yükleme): sayaçlar sıfırlanır. firestoreId verilmez → telemetri yok.
  const puzzleId = puzzle?.id;
  const puzzleVersion = puzzle?.version ?? 1;
  useEffect(() => {
    if (!puzzleId) return;
    beginSession(undefined, puzzleVersion);
    resetTracking();
  }, [puzzleId, puzzleVersion, beginSession, resetTracking]);

  const getMoves = useCallback(() => moveHistoryRef.current, [moveHistoryRef]);
  const hint = usePlayHint({
    firestoreId: puzzleId ? `daily:${puzzleId}` : undefined,
    levelVersion: puzzleVersion,
    getMoves,
    onHintShown: recordHintUsed,
  });
  const { onMoveExecuted: hintOnMove, onUndoExecuted: hintOnUndo, onRestart: hintOnRestart, reset: resetHint } = hint;

  const levelReady = !loader.loading && !loader.error && !!loader.game;
  const ads = usePlayAds(levelReady);
  const { notifyLevelCompleted, beforeRestart, beforeLeavingWinScreen } = ads;

  const onMoveExecuted = useCallback((direction: Direction | 'switch_room') => {
    handleMoveExecuted(direction);
    hintOnMove(direction === 'switch_room' ? SWITCH_ROOM_MOVE : DIRECTION_TO_MOVE[direction]);
  }, [handleMoveExecuted, hintOnMove]);

  const onUndoExecuted = useCallback(() => {
    handleUndoExecuted();
    hintOnUndo();
  }, [handleUndoExecuted, hintOnUndo]);

  const { submit, reset: resetCompletion } = completion;
  const { reload } = loader;
  const resolvedDate = loader.view?.date ?? null;

  const handleButtonPressed = useCallback(async (buttonType: UIButtonType, details?: { isDeath?: boolean }) => {
    if (buttonType === 'next_level') {
      resetHint();
      setShowResult(true);
      if (resolvedDate) submit(resolvedDate);
      notifyLevelCompleted();
    } else if (buttonType === 'restart') {
      recordRestart(details?.isDeath);
      hintOnRestart();
      setShowResult(false);
      resetCompletion();
      await beforeRestart();
      reload();
    } else if (buttonType === 'menu') {
      router.push('/daily');
    }
  }, [resetHint, resolvedDate, submit, notifyLevelCompleted, recordRestart, hintOnRestart, resetCompletion, beforeRestart, reload, router]);

  /** Sonuç kartından hub'a dönüş — level bitti, bölüm arası reklam kontrolünden geçer. */
  const leaveToHub = useCallback(async () => {
    await beforeLeavingWinScreen();
    router.push('/daily');
  }, [beforeLeavingWinScreen, router]);

  const goToHub = useCallback(() => router.push('/daily'), [router]);

  return {
    loader,
    puzzle,
    completion: completion.state,
    showResult,
    hint,
    handleButtonPressed,
    onMoveExecuted,
    onUndoExecuted,
    leaveToHub,
    goToHub,
    retrySubmit: resolvedDate ? () => submit(resolvedDate) : undefined,
    restart: () => handleButtonPressed('restart'),
  };
}
