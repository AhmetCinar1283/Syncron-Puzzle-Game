'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { Entity } from '../logic/entityTypes';
import { Cell } from '../logic/cellTypes';
import { Direction, UIButtonType, RoomState } from '../logic/types';
import { LevelEdges } from '../logic/engine/getNextTopologyPosition';
import { useSoundManager } from '../hooks/useSoundManager';
import { useGameTheme } from '../contexts/GameThemeContext';
import { useCompactLayout } from '../hooks/useCompactLayout';
import { useGameOverSound } from '../hooks/useGameOverSound';
import { useBoardScale } from '../hooks/useBoardScale';
import { usePlayScreenActions } from '../hooks/usePlayScreenActions';
import { usePlayInput } from '../hooks/usePlayInput';
import { usePlayScreenHint, type PlayScreenHint } from '../hooks/usePlayScreenHint';
import { PlayHud } from './play-screen/PlayHud';
import { HudControls } from './play-screen/HudControls';
import { SolutionSteps, CompactSolutionBar } from './play-screen/SolutionSteps';
import { BoardArea } from './play-screen/BoardArea';
import { ActionPanel } from './play-screen/ActionPanel';
import { UIOverlay } from './play-screen/UIOverlay';
import { LevelNotesModal } from './play-screen/LevelNotesModal';
import { HintButton } from './play-screen/hint/HintButton';
import { HintBoardMarker } from './play-screen/hint/HintBoardMarker';
import { HintBanner } from './play-screen/hint/HintBanner';
import { HINT_KEYFRAMES } from './play-screen/hint/hintStyles';

export type { PlayScreenHint } from '../hooks/usePlayScreenHint';

/**
 * Props API'si KİLİTLİ: `/play` (features/play) ve `/editor` test modu aynı
 * bileşeni kullanır. Yeni prop eklenebilir ama mevcutlar değiştirilmemeli.
 */
interface PlayScreenProps {
    levelName?: string;
    initialEntities: Entity[];
    initialGrid?: Cell[][];
    initialRooms?: Record<string, RoomState>;
    controlMode?: 'all_rooms' | 'selected_room';
    initialControlledRooms?: string[];
    levelEdges?: LevelEdges;
    trailCollision?: boolean;
    onMoveExecuted?: (direction: Direction | 'switch_room') => void;
    onUndoExecuted?: () => void;
    onButtonPressed?: (buttonType: UIButtonType, details?: { isDeath?: boolean }) => void;
    isTestMode?: boolean;
    gameNotes?: string;
    solutionSteps?: string[] | null;
    /**
     * İpucu desteği (yalnızca `/play`). Verilirse HUD'da ipucu butonu ve aktif
     * ipucunun board işareti çizilir. Test modunda yok sayılır ("adım ileri" var).
     */
    hint?: PlayScreenHint;
    /** Dışarıdan açılan bir kart (ör. ödüllü aksiyon onayı) oyun girdisini kilitler. */
    inputLocked?: boolean;
    /** Board alanının altında, ölçeklenmeden çizilen ek katman (ör. `/play`'in "level'ı atla" butonu). */
    areaAccessory?: ReactNode;
}

/**
 * Oyun ekranı kompozisyonu. Sorumluluklar hook'lara bölündü; hook ÇAĞRI SIRASI
 * önceki tek-dosya sürümle aynı tutuldu çünkü effect'ler bu sırayla çalışır:
 *   1 resize (useCompactLayout) → 2 aktif adım scroll → 3 useGameEngine →
 *   4 bitiş sesi → 5 board ResizeObserver → 6 keydown + 7 gamepad (usePlayInput) →
 *   8 next_level otomatik ilerleme.
 * Bu sırayı değiştirme; oynanış hissi (listener yaşam döngüleri) buna bağlı.
 */
export function PlayScreen({
    levelName,
    initialEntities,
    initialGrid,
    initialRooms,
    controlMode = 'all_rooms',
    initialControlledRooms,
    levelEdges,
    trailCollision,
    onMoveExecuted,
    onUndoExecuted,
    onButtonPressed,
    isTestMode,
    gameNotes,
    solutionSteps,
    hint,
    inputLocked: externalInputLocked = false,
    areaAccessory,
}: PlayScreenProps) {
    const { theme, toggleTheme } = useGameTheme();
    const { play, muted, toggleMute } = useSoundManager();
    const [moveCount, setMoveCount] = useState(0);
    const [showNotes, setShowNotes] = useState(false);
    const isCompact = useCompactLayout();
    const activeStepRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (activeStepRef.current) {
            activeStepRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }, [moveCount]);

    // ── Oyun motoru ─────────────────────────────────────────────────────────
    const engine = useGameEngine({
        initialEntities,
        initialGrid,
        initialRooms,
        controlMode,
        initialControlledRooms,
        levelEdges,
        trailCollision
    });
    const {
        snapshots,
        rooms,
        controlledRoomIds,
        isAnimating,
        isGameOver,
        uiEvents,
        onAnimationEnd,
        getEntities,
        canUndo,
    } = engine;

    const isGameOverRef  = useRef(isGameOver);
    isGameOverRef.current  = isGameOver;

    // ── Ses tetikleyicileri ─────────────────────────────────────────────────
    useGameOverSound(isGameOver, isAnimating, uiEvents, play);

    // ── Responsive board scale hesabı ───────────────────────────────────────
    const { boardAreaRef, boardPixelW, boardPixelH, boardScale } = useBoardScale(rooms);

    // ── Komutlar ────────────────────────────────────────────────────────────
    const {
        handleButtonPress,
        handleExecuteAction,
        triggerMove,
        cycleControlledRoom,
        selectRoom,
        handleUndo,
        handleStepForward,
    } = usePlayScreenActions({
        engine,
        controlMode,
        trailCollision,
        play,
        setMoveCount,
        onMoveExecuted,
        onUndoExecuted,
        onButtonPressed,
    });

    const handleAnimationEnd = useCallback(() => {
        onAnimationEnd();
    }, [onAnimationEnd]);

    // ── İpucu (yalnızca oyuncu modu) ────────────────────────────────────────
    const playerHint = isTestMode ? undefined : hint;
    const { requestHint, visibleHint, hudHighlight } = usePlayScreenHint({
        hint: playerHint,
        isAnimating,
        isGameOver,
    });
    // İpucu kartı açıkken oyun girdisi kilitli (ipucu tam o durum için hazırlanır).
    const inputLocked = !!playerHint?.inputLocked || externalInputLocked;
    const inputLockedRef = useRef(inputLocked);
    useEffect(() => {
        inputLockedRef.current = inputLocked;
    }, [inputLocked]);

    // ── Girdi: klavye + gamepad + swipe ─────────────────────────────────────
    // "Adım ileri" çözücüyü ücretsiz çalıştırdığı için yalnızca editör test modunda açık.
    const { handleTouchStart, handleTouchMove, handleTouchEnd } = usePlayInput({
        isGameOverRef,
        inputLockedRef,
        triggerMove,
        handleButtonPress,
        cycleControlledRoom,
        handleUndo,
        handleStepForward: isTestMode ? handleStepForward : undefined,
        handleHint: playerHint ? requestHint : undefined,
    });

    const pendingUi = uiEvents.length > 0 ? uiEvents[uiEvents.length - 1] : null;

    useEffect(() => {
        if (isTestMode) return;
        if (pendingUi?.kind === 'button' && pendingUi.buttonType === 'next_level') {
            handleButtonPress('next_level');
        }
    }, [pendingUi, handleButtonPress, isTestMode]);

    const hasSolutionSteps = !!(isTestMode && solutionSteps && solutionSteps.length > 0);
    const lastSnapshot = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                background: '#030712',
                overflow: 'hidden',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            {/* ── Premium HUD ──────────────────────────────────────────────── */}
            <PlayHud
                levelName={levelName}
                isTestMode={isTestMode}
                isCompact={isCompact}
                gameNotes={gameNotes}
                onMenu={() => handleButtonPress('menu')}
                onShowNotes={() => setShowNotes(true)}
                solutionSteps={!isCompact && hasSolutionSteps ? (
                    <SolutionSteps steps={solutionSteps!} moveCount={moveCount} isCompactView={false} activeStepRef={activeStepRef} />
                ) : null}
                controlMode={controlMode}
                rooms={rooms}
                controlledRoomIds={controlledRoomIds}
                onSelectRoom={selectRoom}
                getEntities={getEntities}
                moveCount={moveCount}
                controls={
                    <HudControls
                        theme={theme}
                        onToggleTheme={toggleTheme}
                        muted={muted}
                        onToggleMute={toggleMute}
                        isCompact={isCompact}
                        undoDisabled={isAnimating || !canUndo}
                        onUndo={handleUndo}
                        stepDisabled={isAnimating || isGameOver}
                        onStepForward={isTestMode ? handleStepForward : undefined}
                        onRestart={() => handleButtonPress('restart')}
                        highlight={hudHighlight}
                        hintButton={playerHint ? (
                            <HintButton
                                isCompact={isCompact}
                                disabled={!!playerHint.disabled || isAnimating || isGameOver}
                                busy={playerHint.busy}
                                badge={playerHint.badge}
                                onClick={requestHint}
                            />
                        ) : null}
                    />
                }
            />

            {/* Mobile / Compact Solution steps bar (below HUD) */}
            {isCompact && hasSolutionSteps && (
                <CompactSolutionBar steps={solutionSteps!} moveCount={moveCount} activeStepRef={activeStepRef} />
            )}


            {/* ── Board alanı ───────────── */}
            <BoardArea
                areaRef={boardAreaRef}
                boardPixelW={boardPixelW}
                boardPixelH={boardPixelH}
                boardScale={boardScale}
                snapshots={snapshots}
                controlledRoomIds={controlledRoomIds}
                levelEdges={levelEdges}
                isAnimating={isAnimating}
                onAnimationEnd={handleAnimationEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                boardOverlay={visibleHint ? (
                    <HintBoardMarker
                        hint={visibleHint}
                        entities={getEntities()}
                        rooms={rooms}
                        controlMode={controlMode}
                        controlledRoomIds={controlledRoomIds}
                    />
                ) : null}
                areaOverlay={visibleHint || areaAccessory ? (
                    <>
                        {visibleHint && <HintBanner hint={visibleHint} />}
                        {areaAccessory}
                    </>
                ) : null}
            />

            {visibleHint && <style>{HINT_KEYFRAMES}</style>}

            {/* ── Action Panel ──────────────── */}
            <ActionPanel
                actions={lastSnapshot?.availableActions}
                disabled={isAnimating || isGameOver}
                onExecute={handleExecuteAction}
            />

            {/* Overlay'ler */}
            {!isAnimating && pendingUi && (
                (pendingUi.kind === 'button' && pendingUi.buttonType === 'restart') ||
                (pendingUi.kind === 'text') ||
                (isTestMode && pendingUi.kind === 'button' && pendingUi.buttonType === 'next_level')
            ) && (
                <UIOverlay
                    event={pendingUi}
                    uiEvents={uiEvents}
                    onButtonPress={handleButtonPress}
                    isTestMode={isTestMode}
                />
            )}

            {showNotes && (
                <LevelNotesModal notes={gameNotes} onClose={() => setShowNotes(false)} />
            )}
        </div>
    );
}
