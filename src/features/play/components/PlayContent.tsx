'use client';

import { PlayScreen } from '@/game-engine/components/PlayScreen';
import { usePlayPage } from '../hooks/usePlayPage';
import { LoadingScreen } from './LoadingScreen';
import { ErrorScreen } from './ErrorScreen';
import { WinResultOverlay } from './WinResultOverlay';
import { AfterAdPrompt } from './AfterAdPrompt';
import { HintDialog } from './HintDialog';
import { SkipLevelButton } from './SkipLevelButton';
import { SkipLevelDialog } from './SkipLevelDialog';

/** `/play` view'i — tüm akış `usePlayPage` içinde. useSearchParams nedeniyle Suspense altında render edilmeli. */
export function PlayContent() {
    const {
        levelId,
        level,
        session,
        showWin,
        workerResult,
        handleButtonPressed,
        handleNextLevel,
        handleMenuFromWin,
        goToLevels,
        isRegisteredUser,
        showAfterAdPrompt,
        dismissAfterAdPrompt,
        hint,
        skip,
        onMoveExecuted,
        onUndoExecuted,
    } = usePlayPage();

    // ── Render ───────────────────────────────────────────────
    if (level.loading) return <LoadingScreen />;
    if (level.error || !level.game2State) return <ErrorScreen onBack={goToLevels} />;

    const { game2State } = level;

    return (
        <main className="ad-banner-inset" style={{
            // Tam ekran — scroll yok, native'de de bounce yok.
            // Alt kenar, varsa reklam banner'ı kadar yukarıda kalır
            // (.ad-banner-inset → bottom: var(--ad-banner-height)); board ölçeği
            // ResizeObserver ile kendini yeniden hesaplar (useBoardScale).
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: '#030712',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            touchAction: 'none',
        }}>
            {/* PlayScreen kendi HUD'unu içeriyor: level adı, restart, ses */}
            <PlayScreen
                key={`${levelId}-${level.restartKey}`}
                levelName={level.levelName}
                gameNotes={level.gameNotes}
                initialEntities={game2State.entities}
                initialRooms={game2State.rooms}
                controlMode={game2State.controlMode}
                initialControlledRooms={game2State.initialControlledRooms}
                levelEdges={level.levelEdges}
                trailCollision={level.trailCollision}
                onMoveExecuted={onMoveExecuted}
                onUndoExecuted={onUndoExecuted}
                onButtonPressed={handleButtonPressed}
                hint={hint.screenHint}
                inputLocked={skip.inputLocked}
                areaAccessory={skip.buttonVisible ? (
                    <SkipLevelButton busy={skip.busy} onClick={skip.onRequest} />
                ) : null}
            />

            {/* Ödüllü ipucu onay kartı */}
            <HintDialog dialog={hint.dialog} />

            {/* Ödüllü level atlama onay kartı */}
            <SkipLevelDialog dialog={skip.dialog} />

            {/* Kazanma result overlay — position:fixed olduğu için scale wrapper dışına çıkar */}
            {showWin && (
                <WinResultOverlay
                    result={workerResult}
                    moveCount={session.moveHistoryRef.current.length}
                    levelId={level.firestoreId}
                    version={level.levelVersion}
                    onRestart={() => handleButtonPressed('restart')}
                    onNextLevel={level.nextLevelId !== null ? handleNextLevel : undefined}
                    onMenu={handleMenuFromWin}
                />
            )}

            {/* Reklam kapandıktan sonraki teşvik kartı — win overlay'in de üstünde. */}
            {showAfterAdPrompt && (
                <AfterAdPrompt
                    isRegisteredUser={isRegisteredUser}
                    onDismiss={dismissAfterAdPrompt}
                />
            )}
        </main>
    );
}
