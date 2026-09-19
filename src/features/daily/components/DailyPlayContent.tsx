'use client';

/**
 * DOSYA AMACI: `/daily/play` görünümü — tüm akış `useDailyPlayPage` içinde. Oyun
 * ekranı motorun PlayScreen'idir; atlama butonu yoktur, ipucu ortak akıştan gelir.
 * useSearchParams nedeniyle Suspense altında render edilmelidir.
 */
import { PlayScreen } from '@/game-engine/components/PlayScreen';
import { useT } from '@/contexts/LanguageContext';
import { ErrorScreen, HintDialog, LoadingScreen } from '@/features/play';
import { useDailyPlayPage } from '../hooks/useDailyPlayPage';
import { DailyResultOverlay } from './DailyResultOverlay';

export function DailyPlayContent() {
  const t = useT();
  const page = useDailyPlayPage();
  const { loader, puzzle } = page;

  if (loader.loading) return <LoadingScreen />;
  if (loader.error || !loader.game || !puzzle || !loader.view) {
    return <ErrorScreen onBack={page.goToHub} message={t('daily.no_puzzle')} />;
  }

  const { game, view } = loader;
  const title = `${t('daily.title')} #${view.number} · ${t('daily.par', { n: puzzle.par })}`;

  return (
    <main
      className="ad-banner-inset"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#030712', display: 'flex', flexDirection: 'column', overflow: 'hidden', touchAction: 'none' }}
    >
      <PlayScreen
        key={`${puzzle.id}-${puzzle.version}-${loader.restartKey}`}
        levelName={title}
        gameNotes={game.gameNotes}
        initialEntities={game.state.entities}
        initialRooms={game.state.rooms}
        controlMode={game.state.controlMode}
        initialControlledRooms={game.state.initialControlledRooms}
        levelEdges={game.edges}
        trailCollision={game.trailCollision}
        onMoveExecuted={page.onMoveExecuted}
        onUndoExecuted={page.onUndoExecuted}
        onButtonPressed={page.handleButtonPressed}
        onWinDetected={page.onWinDetected}
        hint={page.hint.screenHint}
      />

      <HintDialog dialog={page.hint.dialog} />

      {page.showResult && (
        <DailyResultOverlay
          completion={page.completion}
          onRestart={page.restart}
          onHub={page.leaveToHub}
          onRetry={page.retrySubmit}
        />
      )}
    </main>
  );
}
