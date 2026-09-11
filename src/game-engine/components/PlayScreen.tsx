'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { PlayHud } from './play-screen/PlayHud';
import { HudControls } from './play-screen/HudControls';
import { SolutionSteps, CompactSolutionBar } from './play-screen/SolutionSteps';
import { LevelInfoBar } from './play-screen/LevelInfoBar';
import { BoardArea } from './play-screen/BoardArea';
import { ActionPanel } from './play-screen/ActionPanel';
import { UIOverlay } from './play-screen/UIOverlay';
import { LevelNotesModal } from './play-screen/LevelNotesModal';

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

    // ── Girdi: klavye + gamepad + swipe ─────────────────────────────────────
    const { handleTouchStart, handleTouchMove, handleTouchEnd } = usePlayInput({
        isGameOverRef,
        triggerMove,
        handleButtonPress,
        cycleControlledRoom,
        handleUndo,
        handleStepForward,
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
                        onStepForward={handleStepForward}
                        onRestart={() => handleButtonPress('restart')}
                    />
                }
            />

            {/* Mobile / Compact Solution steps bar (below HUD) */}
            {isCompact && hasSolutionSteps && (
                <CompactSolutionBar steps={solutionSteps!} moveCount={moveCount} activeStepRef={activeStepRef} />
            )}

            {/* ── Seviye Özellikleri Göstergesi ──────────────── */}
            <LevelInfoBar controlMode={controlMode} trailCollision={trailCollision} />

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
            />

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
