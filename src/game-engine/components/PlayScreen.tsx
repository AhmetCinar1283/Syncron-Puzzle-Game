'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import { Entity } from '../logic/entityTypes';
import { Cell } from '../logic/cellTypes';
import { Direction, UIButtonType, RoomState } from '../logic/types';
import { LevelEdges } from '../logic/engine/getNextTopologyPosition';
import { useSoundManager } from '@/services/audio';
import { warmUpHaptics } from '@/lib/haptics';
import { useGameTheme } from '../contexts/GameThemeContext';
import { useCompactLayout } from '../hooks/useCompactLayout';
import { useGameOverSound } from '../hooks/useGameOverSound';
import { useBoardScale } from '../hooks/useBoardScale';
import { usePlayScreenActions } from '../hooks/usePlayScreenActions';
import { usePlayInput } from '../hooks/usePlayInput';
import { usePlayScreenHint, type PlayScreenHint } from '../hooks/usePlayScreenHint';
import { useSettings } from '@/features/settings';
import { useTouchCapable } from '@/features/settings/hooks/useTouchCapable';
import { TouchControlsLayout } from './play-screen/touch/TouchControls';
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
    /** Zafer algılandığı anda (animasyon oynarken) erken arka plan işlemleri (worker vs.) için çağrılır. */
    onWinDetected?: () => void;
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
    onWinDetected,
    isTestMode,
    gameNotes,
    solutionSteps,
    hint,
    inputLocked: externalInputLocked = false,
    areaAccessory,
}: PlayScreenProps) {
    const { theme } = useGameTheme();
    const { play, muted } = useSoundManager();
    const { isSettingsOpen, settings } = useSettings();
    const touchCapable = useTouchCapable();
    const { scheme, padSide, swipeSensitivity } = settings.controls;
    const showTouchControls = touchCapable && scheme !== 'swipe';
    // Dokunmatik cihazda "yalnızca tuşlar" seçiliyse board kaydırması kapanır.
    const swipeEnabled = !(touchCapable && scheme === 'buttons');

    // Haptik eklentisini önceden yükle: ilk swipe'ın dinamik import'u
    // beklemesini engeller.
    useEffect(() => { warmUpHaptics(); }, []);
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
    // İpucu kartı veya ayarlar modalı açıkken oyun girdisi kilitli.
    const inputLocked = !!playerHint?.inputLocked || externalInputLocked || isSettingsOpen;
    const inputLockedRef = useRef(inputLocked);
    useEffect(() => {
        inputLockedRef.current = inputLocked;
    }, [inputLocked]);

    // ── Girdi: klavye + gamepad + swipe ─────────────────────────────────────
    // "Adım ileri" çözücüyü ücretsiz çalıştırdığı için yalnızca editör test modunda açık.
    const { handleTouchStart, handleTouchMove, handleTouchEnd, handleDirectionPress } = usePlayInput({
        isGameOverRef,
        inputLockedRef,
        triggerMove,
        handleButtonPress,
        cycleControlledRoom,
        handleUndo,
        handleStepForward: isTestMode ? handleStepForward : undefined,
        handleHint: playerHint ? requestHint : undefined,
        swipeEnabled,
        swipeSensitivity,
    });

    const pendingUi = uiEvents.length > 0 ? uiEvents[uiEvents.length - 1] : null;
    const hasNextLevel = uiEvents.some(e => e.kind === 'button' && e.buttonType === 'next_level');
    const winDetectedRef = useRef(false);

    // Zafer algılandığı anda (kutlama animasyonu oynarken) arka planda worker isteğini başlat
    useEffect(() => {
        if (!hasNextLevel) {
            winDetectedRef.current = false;
        } else if (!isTestMode && !winDetectedRef.current) {
            winDetectedRef.current = true;
            onWinDetected?.();
        }
    }, [hasNextLevel, isTestMode, onWinDetected]);

    // Animasyon tamamlandığında modalı aç
    useEffect(() => {
        if (isTestMode) return;
        if (!isAnimating && hasNextLevel) {
            handleButtonPress('next_level');
        }
    }, [hasNextLevel, handleButtonPress, isTestMode, isAnimating]);

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
                // viewport-fit=cover ile tam ekran çiziyoruz; HUD'un çentiğin
                // ve alt gezinme çubuğunun altında kalmaması için güvenli alan
                // payları burada veriliyor (cover kapalıyken env() 0'dır).
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                paddingLeft: 'env(safe-area-inset-left, 0px)',
                paddingRight: 'env(safe-area-inset-right, 0px)',
                boxSizing: 'border-box',
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
            <TouchControlsLayout
                enabled={showTouchControls}
                padSide={padSide}
                onDirection={handleDirectionPress}
                onUndo={handleUndo}
                undoDisabled={isAnimating || !canUndo}
                onSwitchRoom={
                    controlMode === 'selected_room' && Object.keys(rooms).length > 1
                        ? cycleControlledRoom
                        : undefined
                }
            >
            <BoardArea
                areaRef={boardAreaRef}
                boardPixelW={boardPixelW}
                boardPixelH={boardPixelH}
                boardScale={boardScale}
                snapshots={snapshots}
                controlledRoomIds={controlledRoomIds}
                levelEdges={levelEdges}
                levelName={levelName}
                isAnimating={isAnimating}
                onAnimationEnd={handleAnimationEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onPlaySound={play}
                muted={muted}
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
            </TouchControlsLayout>

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
