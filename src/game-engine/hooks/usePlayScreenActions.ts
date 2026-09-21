'use client';

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { solveFromState } from '@/game-engine/solver/solver';
import type { ActionIntent, Direction, UIButtonType } from '../logic/types';
import { processActionRequest } from '../logic/actions/registry';
import type { GameActionButton } from '../logic/actions/types';
import type { useGameEngine } from './useGameEngine';
import type { SoundId } from '@/services/audio';
import {
    OPPOSITE_DIRECTION,
    STEP_SOLVER_MAX_DEPTH,
    STEP_SOLVER_MAX_NODES,
} from '../components/play-screen/constants';

type GameEngine = ReturnType<typeof useGameEngine>;

interface UsePlayScreenActionsArgs {
    engine: GameEngine;
    controlMode: 'all_rooms' | 'selected_room';
    trailCollision: boolean | undefined;
    play: (name: SoundId) => void;
    setMoveCount: Dispatch<SetStateAction<number>>;
    onMoveExecuted?: (direction: Direction | 'switch_room') => void;
    onUndoExecuted?: () => void;
    onButtonPressed?: (buttonType: UIButtonType, details?: { isDeath?: boolean }) => void;
}

/**
 * PlayScreen'in oyuncu komutları (girdi kaynağından bağımsız): hamle, geri al,
 * adım ileri (çözücü ipucu), oda değiştir, aksiyon butonu, UI butonu.
 * Klavye/gamepad/touch/HUD hepsi bu callback'leri çağırır.
 *
 * Tüm useCallback deps listeleri önceki inline sürümle aynı anlamda tutuldu.
 * Not: engine.setControlledRoomIds her render'da yeni bir fonksiyon (useGameEngine
 * öyle döndürüyor), bu yüzden ona bağlı callback'ler (cycleControlledRoom →
 * handleStepForward → klavye handler'ı) her render'da yenilenir — önceki
 * davranış da buydu (keydown listener her render'da yeniden bağlanıyordu).
 */
export function usePlayScreenActions({
    engine,
    controlMode,
    trailCollision,
    play,
    setMoveCount,
    onMoveExecuted,
    onUndoExecuted,
    onButtonPressed,
}: UsePlayScreenActionsArgs) {
    const {
        rooms,
        controlledRoomIds,
        setControlledRoomIds,
        isAnimating,
        isGameOver,
        uiEvents,
        executeTurn,
        cancelAnimation,
        clearUiEvents,
        getEntities,
        undo,
    } = engine;

    // ── UI Button Handler ───────────────────────────────────────────────────
    const handleButtonPress = useCallback((buttonType: UIButtonType) => {
        const isDeath = uiEvents.some(e => e.kind === 'text' && e.textType === 'error');
        clearUiEvents();
        if (buttonType === 'restart') {
            setMoveCount(0);
        }
        onButtonPressed?.(buttonType, { isDeath });
    }, [uiEvents, clearUiEvents, onButtonPressed, setMoveCount]);

    const handleExecuteAction = useCallback((action: GameActionButton) => {
        if (isAnimating || isGameOver) return;

        clearUiEvents();
        const actionIntents = processActionRequest({
            actionType: action.actionType,
            target: action.target,
            payload: action.payload
        }, rooms, getEntities());

        if (actionIntents.length > 0) {
            executeTurn(actionIntents);
            setMoveCount(c => c + 1);
            play('game.toggle');
        }
    }, [isAnimating, isGameOver, rooms, getEntities, executeTurn, clearUiEvents, play, setMoveCount]);

    const triggerMove = useCallback((rawDirection: Direction) => {
        if (isAnimating) {
            cancelAnimation();
        }

        const intents: ActionIntent[] = getEntities()
            .filter(ent => ent.type === 'player' && !ent.customData.isLocked)
            .filter(ent => {
                const entRoomId = ent.position.roomId ?? 'main';
                // Seçili oda modu aktifse sadece aktif odalardaki oyuncuları hareket ettir
                if (controlMode === 'selected_room') {
                    return controlledRoomIds.includes(entRoomId);
                }
                return true;
            })
            .map(ent => {
                const mode = (ent.customData.mode as string) ?? 'normal';
                let direction = mode === 'reversed'
                    ? OPPOSITE_DIRECTION[rawDirection]
                    : rawDirection;

                if (ent.customData.controlMapping) {
                    const mapping = ent.customData.controlMapping as Record<Direction, Direction>;
                    direction = mapping[direction] ?? direction;
                }

                return {
                    entityId:     ent.id,
                    type:         'mutate_entity' as const,
                    newDirection: direction,
                    newForce:     1,
                };
            });

        if (intents.length > 0) {
            executeTurn(intents);
            onMoveExecuted?.(rawDirection);
            setMoveCount(c => c + 1);
        }
    }, [getEntities, executeTurn, onMoveExecuted, isAnimating, cancelAnimation, controlMode, controlledRoomIds, setMoveCount]);

    /**
     * Seçili oda modunda kontrolü sıradaki odaya geçirir (Tab/Boşluk ve adım-ileri
     * 'switch_room' adımı). Önceden bu blok iki yerde birebir kopyaydı.
     */
    const cycleControlledRoom = useCallback(() => {
        if (controlMode === 'selected_room') {
            const roomKeys = Object.keys(rooms);
            if (roomKeys.length > 1) {
                const currentIdx = roomKeys.indexOf(controlledRoomIds[0] ?? '');
                const nextIdx = (currentIdx + 1) % roomKeys.length;
                setControlledRoomIds([roomKeys[nextIdx]]);
                play('game.toggle');
                onMoveExecuted?.('switch_room');
            }
        }
    }, [controlMode, rooms, controlledRoomIds, setControlledRoomIds, play, onMoveExecuted]);

    /** HUD oda çipine tıklama: aradaki her oda geçişi ayrı 'switch_room' hamlesi sayılır. */
    const selectRoom = (rId: string) => {
        if (controlMode === 'selected_room') {
            const roomKeys = Object.keys(rooms);
            const currentIdx = roomKeys.indexOf(controlledRoomIds[0] ?? '');
            const targetIdx = roomKeys.indexOf(rId);
            if (currentIdx !== -1 && targetIdx !== -1 && currentIdx !== targetIdx) {
                const steps = (targetIdx - currentIdx + roomKeys.length) % roomKeys.length;
                for (let i = 0; i < steps; i++) {
                    onMoveExecuted?.('switch_room');
                }
            }
        }
        setControlledRoomIds([rId]);
        play('game.toggle');
    };

    const handleUndo = useCallback(() => {
        if (isAnimating) return;
        const undone = undo();
        if (undone) {
            setMoveCount(c => Math.max(0, c - 1));
            onUndoExecuted?.();
            play('game.toggle');
        }
    }, [isAnimating, undo, onUndoExecuted, play, setMoveCount]);

    const handleStepForward = useCallback(() => {
        if (isAnimating || isGameOver) return;

        const result = solveFromState(
            getEntities(),
            rooms,
            controlledRoomIds,
            controlMode,
            !!trailCollision,
            STEP_SOLVER_MAX_DEPTH,
            STEP_SOLVER_MAX_NODES
        );

        if (result.solvable && result.solution && result.solution.length > 0) {
            const nextStep = result.solution[0];
            if (nextStep === 'switch_room') {
                cycleControlledRoom();
            } else {
                triggerMove(nextStep);
            }
        } else {
            play('game.lose');
        }
    }, [isAnimating, isGameOver, getEntities, rooms, controlledRoomIds, controlMode, trailCollision, triggerMove, play, cycleControlledRoom]);

    return {
        handleButtonPress,
        handleExecuteAction,
        triggerMove,
        cycleControlledRoom,
        selectRoom,
        handleUndo,
        handleStepForward,
    };
}
