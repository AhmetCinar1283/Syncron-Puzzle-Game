'use client';

import { PlayScreen } from '@/game-engine/components/PlayScreen';
import { usePlayPage } from '../hooks/usePlayPage';
import { LoadingScreen } from './LoadingScreen';
import { ErrorScreen } from './ErrorScreen';
import { WinResultOverlay } from './WinResultOverlay';

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
        goToLevels,
    } = usePlayPage();

    // ── Render ───────────────────────────────────────────────
    if (level.loading) return <LoadingScreen />;
    if (level.error || !level.game2State) return <ErrorScreen onBack={goToLevels} />;

    const { game2State } = level;

    return (
        <main style={{
            // Tam ekran — scroll yok, native'de de bounce yok
            position: 'fixed',
            inset: 0,
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
                onMoveExecuted={session.handleMoveExecuted}
                onUndoExecuted={session.handleUndoExecuted}
                onButtonPressed={handleButtonPressed}
            />

            {/* Kazanma result overlay — position:fixed olduğu için scale wrapper dışına çıkar */}
            {showWin && (
                <WinResultOverlay
                    result={workerResult}
                    moveCount={session.moveHistoryRef.current.length}
                    levelId={level.firestoreId}
                    version={level.levelVersion}
                    onRestart={() => handleButtonPressed('restart')}
                    onNextLevel={level.nextLevelId !== null ? handleNextLevel : undefined}
                    onMenu={goToLevels}
                />
            )}
        </main>
    );
}
