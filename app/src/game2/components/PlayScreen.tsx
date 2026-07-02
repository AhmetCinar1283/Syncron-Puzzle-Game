'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameEngine } from '../hooks/useGameEngine';
import { solveFromState } from '@/app/src/games/logic/solver';
import GameBoard from './GameBoard';
import { Entity } from '../logic/entityTypes';
import { Cell } from '../logic/cellTypes';
import { ActionIntent, Direction, UIEvent, UIButtonType, RoomState } from '../logic/types';
import { LevelEdges } from '../logic/engine/getNextTopologyPosition';
import { useSoundManager } from '../hooks/useSoundManager';
import { useT } from '@/app/src/contexts/LanguageContext';
import { useGamepad } from '@/app/src/hooks/useGamepad';
import { calculateRoomLayoutOffsets } from '../logic/engine/rooms';
import { processActionRequest } from '../logic/actions/registry';
import { GameActionButton } from '../logic/actions/types';

const NATIVE_CELL_SIZE = 64;
const HUD_HEIGHT = 52; // px — HUD'un sabit yüksekliği

const KEY_TO_DIRECTION: Record<string, Direction> = {
    ArrowUp:    'up',
    ArrowDown:  'down',
    ArrowLeft:  'left',
    ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
};

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
    up: 'down', down: 'up', left: 'right', right: 'left',
};

const TEXT_COLORS: Record<string, string> = {
    info:    '#00c4ff',
    warning: '#fbbf24',
    success: '#00ff88',
    error:   '#ef4444',
};

const OBJECT_NEON: Record<number, { color: string; label: string; glow: string }> = {
    1: { color: '#00ff88', label: 'P1', glow: '0 0 6px rgba(0,255,136,0.7)' },
    2: { color: '#00c4ff', label: 'P2', glow: '0 0 6px rgba(0,196,255,0.7)' },
};

const REASON_KEYS = {
    forbidden: { icon: '⚠', titleKey: 'lost.forbidden_title', msgKey: 'lost.forbidden_msg' },
    lava_edge: { icon: '☠', titleKey: 'lost.lava_title',     msgKey: 'lost.lava_msg' },
    trail:     { icon: '✗', titleKey: 'lost.trail_title',    msgKey: 'lost.trail_msg' },
    crushed:   { icon: '💥', titleKey: 'lost.crushed_title', msgKey: 'lost.crushed_msg' },
};

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
    const t = useT();
    const { play, muted, toggleMute } = useSoundManager();
    const [moveCount, setMoveCount] = useState(0);
    const [showNotes, setShowNotes] = useState(false);
    const [isCompact, setIsCompact] = useState(false);
    const activeStepRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleResize = () => {
            setIsCompact(window.innerWidth < 850);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
    const {
        snapshots,
        rooms,
        controlledRoomIds,
        setControlledRoomIds,
        isAnimating,
        isGameOver,
        uiEvents,
        executeTurn,
        onAnimationEnd,
        cancelAnimation,
        clearUiEvents,
        getEntities,
        undo,
        canUndo,
    } = useGameEngine({ 
        initialEntities, 
        initialGrid, 
        initialRooms,
        controlMode,
        initialControlledRooms,
        levelEdges, 
        trailCollision 
    });

    const isGameOverRef  = useRef(isGameOver);
    isGameOverRef.current  = isGameOver;


    // ── Ses tetikleyicileri ─────────────────────────────────────────────────
    const prevIsGameOver = useRef(false);
    useEffect(() => {
        if (isGameOver && !isAnimating && !prevIsGameOver.current) {
            const hasSuccess = uiEvents.some(e => e.kind === 'text' && e.textType === 'success');
            play(hasSuccess ? 'win' : 'lose');
            prevIsGameOver.current = true;
        }
        if (!isGameOver) {
            prevIsGameOver.current = false;
        }
    }, [isGameOver, isAnimating, uiEvents, play]);

    // ── Responsive board scale hesabı ───────────────────────────────────────
    // Grid boyutlarını normalleştirilmiş odalardan hesaplıyoruz
    const { totalWidth: boardPixelW, totalHeight: boardPixelH } = calculateRoomLayoutOffsets(rooms, NATIVE_CELL_SIZE, 40);

    const boardAreaRef = useRef<HTMLDivElement>(null);
    const [boardScale, setBoardScale] = useState(1);

    useEffect(() => {
        function recalc() {
            if (!boardAreaRef.current) return;
            const areaW = boardAreaRef.current.clientWidth;
            const areaH = boardAreaRef.current.clientHeight;
            if (boardPixelW === 0 || boardPixelH === 0) return;
            const scaleW = areaW / boardPixelW;
            const scaleH = areaH / boardPixelH;
            const scale = Math.min(scaleW, scaleH, 1.0);
            setBoardScale(scale);
        }
        recalc();
        const ro = new ResizeObserver(recalc);
        if (boardAreaRef.current) ro.observe(boardAreaRef.current);
        return () => ro.disconnect();
    }, [boardPixelW, boardPixelH]);

    // ── UI Button Handler ───────────────────────────────────────────────────
    const handleButtonPress = useCallback((buttonType: UIButtonType) => {
        const isDeath = uiEvents.some(e => e.kind === 'text' && e.textType === 'error');
        clearUiEvents();
        if (buttonType === 'restart') {
            setMoveCount(0);
        }
        onButtonPressed?.(buttonType, { isDeath });
    }, [uiEvents, clearUiEvents, onButtonPressed]);

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
            play('toggle');
        }
    }, [isAnimating, isGameOver, rooms, getEntities, executeTurn, clearUiEvents, play]);

    // ── Klavye kontrolü ────────────────────────────────────────────────────
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
    }, [getEntities, executeTurn, onMoveExecuted, isAnimating, cancelAnimation, controlMode, controlledRoomIds]);

    const handleUndo = useCallback(() => {
        if (isAnimating) return;
        const undone = undo();
        if (undone) {
            setMoveCount(c => Math.max(0, c - 1));
            onUndoExecuted?.();
            play('toggle');
        }
    }, [isAnimating, undo, onUndoExecuted, play]);

    const handleStepForward = useCallback(() => {
        if (isAnimating || isGameOver) return;

        const result = solveFromState(
            getEntities(),
            rooms,
            controlledRoomIds,
            controlMode,
            !!trailCollision,
            35,
            3000
        );

        if (result.solvable && result.solution && result.solution.length > 0) {
            const nextStep = result.solution[0];
            if (nextStep === 'switch_room') {
                if (controlMode === 'selected_room') {
                    const roomKeys = Object.keys(rooms);
                    if (roomKeys.length > 1) {
                        const currentIdx = roomKeys.indexOf(controlledRoomIds[0] ?? '');
                        const nextIdx = (currentIdx + 1) % roomKeys.length;
                        setControlledRoomIds([roomKeys[nextIdx]]);
                        play('toggle');
                        onMoveExecuted?.('switch_room');
                    }
                }
            } else {
                triggerMove(nextStep);
            }
        } else {
            play('lose');
        }
    }, [isAnimating, isGameOver, getEntities, rooms, controlledRoomIds, controlMode, trailCollision, triggerMove, play, onMoveExecuted, setControlledRoomIds]);

    const handleKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            handleButtonPress('restart');
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            handleButtonPress('menu');
            return;
        }

        // Seçili oda geçiş tuşu (Tab veya Boşluk)
        if (e.key === 'Tab' || e.key === ' ') {
            e.preventDefault();
            if (controlMode === 'selected_room') {
                const roomKeys = Object.keys(rooms);
                if (roomKeys.length > 1) {
                    const currentIdx = roomKeys.indexOf(controlledRoomIds[0] ?? '');
                    const nextIdx = (currentIdx + 1) % roomKeys.length;
                    setControlledRoomIds([roomKeys[nextIdx]]);
                    play('toggle');
                    onMoveExecuted?.('switch_room');
                }
            }
            return;
        }

        if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            handleUndo();
            return;
        }
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            handleStepForward();
            return;
        }

        if (isGameOverRef.current) return;
        const rawDirection = KEY_TO_DIRECTION[e.key];
        if (!rawDirection) return;
        e.preventDefault();
        triggerMove(rawDirection);
    }, [triggerMove, handleButtonPress, controlMode, controlledRoomIds, rooms, play, setControlledRoomIds, handleUndo, handleStepForward]);

    const handleAnimationEnd = useCallback(() => {
        onAnimationEnd();
    }, [onAnimationEnd]);

    useEffect(() => {
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleKey]);

    useGamepad({
        onMove: useCallback((dir: Direction) => {
            if (isGameOverRef.current) return;
            triggerMove(dir);
        }, [triggerMove]),
        onRestart: useCallback(() => {
            handleButtonPress('restart');
        }, [handleButtonPress]),
        onMenu: useCallback(() => {
            handleButtonPress('menu');
        }, [handleButtonPress]),
    });

    // ── Swipe (Touch) Kontrolü ─────────────────────────────────────────────
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const t0 = e.touches[0];
        touchStartRef.current = { x: t0.clientX, y: t0.clientY };
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
    }, []);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current || isGameOverRef.current) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        touchStartRef.current = null;

        if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

        let direction: Direction;
        if (Math.abs(dx) >= Math.abs(dy)) {
            direction = dx > 0 ? 'right' : 'left';
        } else {
            direction = dy > 0 ? 'down' : 'up';
        }

        triggerMove(direction);
    }, [triggerMove]);

    const pendingUi = uiEvents.length > 0 ? uiEvents[uiEvents.length - 1] : null;

    useEffect(() => {
        if (isTestMode) return;
        if (pendingUi?.kind === 'button' && pendingUi.buttonType === 'next_level') {
            handleButtonPress('next_level');
        }
    }, [pendingUi, handleButtonPress, isTestMode]);

    const renderSolutionSteps = (isCompactView: boolean) => {
        if (!isTestMode || !solutionSteps || solutionSteps.length === 0) return null;
        
        const directionColors: Record<string, string> = {
            up: '#38bdf8',
            down: '#f43f5e',
            left: '#fbbf24',
            right: '#34d399',
            switch_room: '#a855f7',
        };
        
        const directionArrows: Record<string, string> = {
            up: '↑',
            down: '↓',
            left: '←',
            right: '→',
            switch_room: '❖',
        };

        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    overflowX: 'auto',
                    padding: isCompactView ? '4px 8px' : '0 8px',
                    width: '100%',
                    maxWidth: isCompactView ? '100%' : '360px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    height: isCompactView ? 36 : '100%',
                    boxSizing: 'border-box',
                }}
            >
                {solutionSteps.map((step, idx) => {
                    const isCompleted = idx < moveCount;
                    const isActive = idx === moveCount;
                    const color = directionColors[step] || '#94a3b8';
                    const arrow = directionArrows[step] || '?';
                    
                    return (
                        <div
                            key={idx}
                            ref={isActive ? activeStepRef : null}
                            title={`Step #${idx + 1}: ${step}`}
                            style={{
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 22,
                                height: 22,
                                borderRadius: '50%',
                                background: isActive 
                                    ? `${color}25` 
                                    : isCompleted 
                                        ? 'rgba(30, 41, 59, 0.15)' 
                                        : 'rgba(30, 41, 59, 0.4)',
                                border: isActive 
                                    ? `2px solid ${color}` 
                                    : isCompleted 
                                        ? '1px solid rgba(71, 85, 105, 0.2)' 
                                        : `1px solid ${color}40`,
                                color: isActive 
                                    ? color 
                                    : isCompleted 
                                        ? '#475569' 
                                        : '#e2e8f0',
                                fontSize: 11,
                                fontWeight: 'bold',
                                boxShadow: isActive ? `0 0 10px ${color}` : 'none',
                                opacity: isActive ? 1 : isCompleted ? 0.4 : 0.8,
                                transform: isActive ? 'scale(1.15)' : 'none',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        >
                            {arrow}
                        </div>
                    );
                })}
            </div>
        );
    };

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
            <div
                style={{
                    flexShrink: 0,
                    height: HUD_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    background: 'rgba(3, 7, 18, 0.97)',
                    borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
                    boxShadow: '0 0 16px rgba(0,255,136,0.04)',
                    gap: 8,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, maxWidth: isCompact ? '35vw' : '25vw', overflow: 'hidden' }}>
                    <button
                        onClick={() => handleButtonPress('menu')}
                        title={isTestMode ? "Close Test" : "Levels"}
                        style={{
                            fontSize: 14,
                            width: 28,
                            height: 28,
                            background: isTestMode ? 'rgba(239, 68, 68, 0.05)' : 'rgba(0,255,136,0.05)',
                            border: isTestMode ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(0,255,136,0.2)',
                            color: isTestMode ? '#ef4444' : '#00ff88',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                            flexShrink: 0,
                            touchAction: 'manipulation',
                            lineHeight: 1,
                            boxShadow: isTestMode ? '0 0 8px rgba(239, 68, 68, 0.15)' : 'none',
                        }}
                    >
                        {isTestMode ? '✕' : '←'}
                    </button>
                    <div
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: isTestMode ? '#ef4444' : '#00ff88',
                            textShadow: isTestMode ? '0 0 8px rgba(239, 68, 68, 0.4)' : '0 0 8px rgba(0,255,136,0.5)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {levelName || 'LEVEL'}
                    </div>
                    {isTestMode && (
                        <span style={{
                            fontSize: 8,
                            padding: '2px 4px',
                            borderRadius: 4,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#ef4444',
                            fontWeight: 900,
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap',
                        }}>
                            TEST
                        </span>
                    )}
                    {gameNotes && !isCompact && (
                        <button
                            onClick={() => setShowNotes(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '2px 6px',
                                background: 'rgba(251,191,36,0.1)',
                                border: '1px solid rgba(251,191,36,0.4)',
                                color: '#fbbf24',
                                borderRadius: 5,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: '0 0 8px rgba(251,191,36,0.15)',
                                touchAction: 'manipulation',
                            }}
                        >
                            💡 {t('hud.level_notes')}
                        </button>
                    )}
                </div>

                {/* Orta: Çözüm yolu (Desktop) veya Oda Çipleri/Modlar */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, justifyContent: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
                    {(!isCompact && isTestMode && solutionSteps && solutionSteps.length > 0) ? (
                        renderSolutionSteps(false)
                    ) : (
                        <>
                            {controlMode === 'selected_room' ? (
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <span style={{ fontSize: 9, color: '#475569', fontWeight: 'bold', letterSpacing: '0.05em' }}>ROOMS:</span>
                                    {Object.keys(rooms).map((rId) => {
                                        const isActive = controlledRoomIds.includes(rId);
                                        return (
                                            <button
                                                key={rId}
                                                onClick={() => {
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
                                                    play('toggle');
                                                }}
                                                style={{
                                                    fontSize: 9,
                                                    padding: '2px 8px',
                                                    borderRadius: 5,
                                                    background: isActive ? 'rgba(0, 255, 136, 0.15)' : 'rgba(31, 41, 55, 0.4)',
                                                    border: `1px solid ${isActive ? '#00ff88' : 'rgba(75, 85, 99, 0.3)'}`,
                                                    color: isActive ? '#00ff88' : '#94a3b8',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {rooms[rId].name}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                getEntities()
                                    .filter(e => e.type === 'player')
                                    .map((obj) => {
                                        const info = OBJECT_NEON[obj.id] ?? { color: '#bf5fff', label: `P${obj.id}`, glow: '' };
                                        const mode = (obj.customData.mode as string) ?? 'normal';
                                        return (
                                            <div key={obj.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <span
                                                    style={{
                                                        display: 'inline-block',
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        backgroundColor: info.color,
                                                        boxShadow: info.glow,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                                    {info.label}:{' '}
                                                    <span style={{ color: info.color }}>
                                                        {mode === 'reversed' ? '⬇' : '⬆'}
                                                    </span>
                                                </span>
                                            </div>
                                        );
                                    })
                            )}
                        </>
                    )}
                    <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap', marginLeft: 8 }}>
                        {t('hud.moves')}{' '}
                        <span style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                            {moveCount}
                        </span>
                    </span>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <button
                        onClick={toggleMute}
                        title={muted ? t('hud.unmute') : t('hud.mute')}
                        style={{
                            fontSize: 14,
                            width: 30,
                            height: 30,
                            background: 'rgba(0,255,136,0.05)',
                            border: '1px solid rgba(0,255,136,0.2)',
                            color: muted ? '#334155' : '#00ff88',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                            flexShrink: 0,
                            touchAction: 'manipulation',
                        }}
                    >
                        {muted ? '🔇' : '🔊'}
                    </button>
                    <button
                        onClick={handleUndo}
                        disabled={isAnimating || !canUndo}
                        title={t('hud.undo')}
                        style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            background: 'rgba(0,255,136,0.05)',
                            border: '1px solid rgba(0,255,136,0.3)',
                            color: '#00ff88',
                            borderRadius: 6,
                            cursor: isAnimating || !canUndo ? 'not-allowed' : 'pointer',
                            opacity: isAnimating || !canUndo ? 0.4 : 1,
                            letterSpacing: '0.04em',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                            touchAction: 'manipulation',
                        }}
                    >
                        ↩ {!isCompact && t('hud.undo')}
                    </button>
                    <button
                        onClick={handleStepForward}
                        disabled={isAnimating || isGameOver}
                        title={t('hud.step_forward')}
                        style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            background: 'rgba(0,255,136,0.05)',
                            border: '1px solid rgba(0,255,136,0.3)',
                            color: '#00ff88',
                            borderRadius: 6,
                            cursor: isAnimating || isGameOver ? 'not-allowed' : 'pointer',
                            opacity: isAnimating || isGameOver ? 0.4 : 1,
                            letterSpacing: '0.04em',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                            touchAction: 'manipulation',
                        }}
                    >
                        ↪ {!isCompact && t('hud.step_forward')}
                    </button>
                    <button
                        onClick={() => handleButtonPress('restart')}
                        style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            background: 'rgba(0,255,136,0.05)',
                            border: '1px solid rgba(0,255,136,0.3)',
                            color: '#00ff88',
                            borderRadius: 6,
                            cursor: 'pointer',
                            letterSpacing: '0.04em',
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                            touchAction: 'manipulation',
                        }}
                    >
                        {t('hud.restart')}
                    </button>
                </div>
            </div>

            {/* Mobile / Compact Solution steps bar (below HUD) */}
            {isCompact && isTestMode && solutionSteps && solutionSteps.length > 0 && (
                <div
                    style={{
                        flexShrink: 0,
                        height: 36,
                        background: 'rgba(3, 7, 18, 0.9)',
                        borderBottom: '1px solid rgba(0, 196, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        boxSizing: 'border-box',
                    }}
                >
                    <span style={{ 
                        fontSize: 9, 
                        color: '#00c4ff', 
                        fontWeight: 800, 
                        paddingLeft: 12, 
                        paddingRight: 10, 
                        borderRight: '1px solid rgba(0, 196, 255, 0.2)', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        flexShrink: 0,
                        letterSpacing: '0.05em'
                    }}>
                        KEY
                    </span>
                    {renderSolutionSteps(true)}
                </div>
            )}

            {/* ── Seviye Özellikleri Göstergesi ──────────────── */}
            <div
                style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    padding: '6px 16px',
                    background: 'rgba(3, 7, 18, 0.6)',
                    borderBottom: '1px solid rgba(0, 255, 136, 0.08)',
                    backdropFilter: 'blur(10px)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Control Mode:</span>
                    <span style={{
                        fontSize: 9,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: controlMode === 'all_rooms' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                        color: controlMode === 'all_rooms' ? '#00ff88' : '#c084fc',
                        border: `1px solid ${controlMode === 'all_rooms' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`,
                    }}>
                        {controlMode === 'all_rooms' ? 'ALL ROOMS' : 'SELECTED ROOM'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trail Collision:</span>
                    <span style={{
                        fontSize: 9,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: trailCollision ? 'rgba(0, 255, 136, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: trailCollision ? '#00ff88' : '#ef4444',
                        border: `1px solid ${trailCollision ? 'rgba(0, 255, 136, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    }}>
                        {trailCollision ? 'ON' : 'OFF'}
                    </span>
                </div>
            </div>

            {/* ── Board alanı ───────────── */}
            <div
                ref={boardAreaRef}
                style={{
                    flex: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 10px 12px',
                    boxSizing: 'border-box',
                    touchAction: 'none',
                    position: 'relative',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    style={{
                        width: boardPixelW,
                        height: boardPixelH,
                        transform: `scale(${boardScale})`,
                        transformOrigin: 'center center',
                        position: 'relative',
                    }}
                >
                    <GameBoard
                        snapshots={snapshots.length > 0 ? snapshots : null}
                        controlledRoomIds={controlledRoomIds}
                        levelEdges={levelEdges}
                        onAnimationEnd={handleAnimationEnd}
                    />

                    {isAnimating && (
                        <div style={{
                            position: 'absolute', bottom: 6, right: 6,
                            width: 6, height: 6,
                            borderRadius: '50%',
                            background: '#fbbf24',
                            boxShadow: '0 0 6px #fbbf24',
                            pointerEvents: 'none',
                        }} />
                    )}
                </div>
            </div>

            {/* ── Action Panel ──────────────── */}
            <div
                style={{
                    flexShrink: 0,
                    height: 64,
                    background: 'rgba(3, 7, 18, 0.95)',
                    borderTop: '1px solid rgba(0, 196, 255, 0.08)',
                    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 16px',
                    boxSizing: 'border-box',
                    zIndex: 80,
                }}
            >
                {snapshots && snapshots.length > 0 && snapshots[snapshots.length - 1].availableActions && snapshots[snapshots.length - 1].availableActions!.length > 0 ? (
                    <div
                        style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            width: '100%',
                            maxWidth: 600,
                        }}
                    >
                        {snapshots[snapshots.length - 1].availableActions!.map((action) => {
                            const isLockAction = action.actionType.includes('lock');
                            const borderGlow = isLockAction ? 'rgba(239, 68, 68, 0.35)' : 'rgba(0, 196, 255, 0.35)';
                            const textColor = isLockAction ? '#ef4444' : '#00c4ff';
                            const hoverBg = isLockAction ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 196, 255, 0.1)';

                            return (
                                <motion.button
                                    key={action.id}
                                    onClick={() => handleExecuteAction(action)}
                                    disabled={isAnimating || isGameOver}
                                    whileHover={{
                                        scale: 1.04,
                                        backgroundColor: hoverBg,
                                        borderColor: textColor,
                                        boxShadow: `0 0 12px ${textColor}`,
                                    }}
                                    whileTap={{ scale: 0.96 }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 14px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        background: 'rgba(15, 23, 42, 0.6)',
                                        border: `1px solid ${borderGlow}`,
                                        color: textColor,
                                        borderRadius: 8,
                                        cursor: isAnimating || isGameOver ? 'not-allowed' : 'pointer',
                                        opacity: isAnimating || isGameOver ? 0.5 : 1,
                                        transition: 'color 0.2s, border-color 0.2s',
                                        boxShadow: `0 2px 8px rgba(0, 0, 0, 0.2)`,
                                        textShadow: `0 0 6px ${textColor}`,
                                    }}
                                >
                                    <span>{action.icon || '⚡'}</span>
                                    <span>{action.label}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            {t('hud.no_actions') || 'No actions available'}
                        </span>
                    </div>
                )}
            </div>

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
                <div
                    onClick={() => setShowNotes(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(2,5,14,0.85)',
                        backdropFilter: 'blur(5px)',
                        zIndex: 110,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'rgba(6, 13, 26, 0.98)',
                            border: '1px solid rgba(251, 191, 36, 0.4)',
                            borderRadius: 14,
                            padding: '20px 24px',
                            boxShadow: '0 0 30px rgba(251, 191, 36, 0.15)',
                            width: '100%',
                            maxWidth: 400,
                            display: 'flex',
                            flexDirection: 'column',
                            boxSizing: 'border-box',
                            gap: 16,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 14,
                                    fontWeight: 800,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    color: '#fbbf24',
                                    textShadow: '0 0 10px rgba(251,191,36,0.3)',
                                }}
                            >
                                💡 {t('hud.level_notes')}
                            </h2>
                            <button
                                onClick={() => setShowNotes(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#475569',
                                    fontSize: 16,
                                    cursor: 'pointer',
                                    transition: 'color 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
                            >
                                ✕
                            </button>
                        </div>
                        <div
                            style={{
                                color: '#94a3b8',
                                fontSize: 12,
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                overflowY: 'auto',
                                maxHeight: '40vh',
                                paddingRight: 6,
                            }}
                        >
                            {gameNotes}
                        </div>
                        <button
                            onClick={() => setShowNotes(false)}
                            style={{
                                width: '100%',
                                padding: '8px 0',
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                                background: 'rgba(251,191,36,0.1)',
                                border: '1px solid rgba(251,191,36,0.3)',
                                color: '#fbbf24',
                                borderRadius: 6,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                        >
                            {t('hud.level_notes_close')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── UIOverlay ───────────────────────────────────────────────────────────────
function UIOverlay({
    event,
    uiEvents,
    onButtonPress,
    isTestMode,
}: {
    event: UIEvent;
    uiEvents: UIEvent[];
    onButtonPress: (buttonType: UIButtonType) => void;
    isTestMode?: boolean;
}) {
    const t = useT();

    const isError = (event.kind === 'button' && event.buttonType === 'restart') || (event.kind === 'text' && event.textType === 'error');
    const isSuccess = isTestMode && event.kind === 'button' && event.buttonType === 'next_level';

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (isError) {
                    onButtonPress('restart');
                } else if (isSuccess) {
                    onButtonPress('menu');
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isError, isSuccess, onButtonPress]);

    useGamepad({
        onConfirm: () => {
            if (isError) {
                onButtonPress('restart');
            } else if (isSuccess) {
                onButtonPress('menu');
            }
        },
        onRestart: () => {
            if (isError || isSuccess) {
                onButtonPress('restart');
            }
        },
        onMenu: () => {
            if (isSuccess) {
                onButtonPress('menu');
            }
        }
    });

    if (isError) {
        const errorTextEvent = [...uiEvents]
            .reverse()
            .find(e => e.kind === 'text' && e.textType === 'error');
        const errMsg = errorTextEvent && errorTextEvent.kind === 'text' ? errorTextEvent.message : (event.kind === 'text' ? event.message : '');

        let reason: 'forbidden' | 'lava_edge' | 'trail' | 'crushed' = 'forbidden';
        if (errMsg.includes('Ezildiniz')) {
            reason = 'crushed';
        } else if (errMsg.includes('düştünüz') || errMsg.includes('Lav')) {
            reason = 'lava_edge';
        } else if (errMsg.includes('izini')) {
            reason = 'trail';
        }

        const cfg = REASON_KEYS[reason];

        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(2, 5, 14, 0.82)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        zIndex: 150,
                        padding: '16px',
                        boxSizing: 'border-box',
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        style={{
                            background: 'rgba(3, 7, 18, 0.97)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            boxShadow: '0 0 40px rgba(239, 68, 68, 0.15), 0 0 80px rgba(239, 68, 68, 0.05)',
                            borderRadius: 20,
                            padding: 'clamp(20px, 5vw, 32px) clamp(24px, 6vw, 40px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 'clamp(10px, 3vw, 14px)',
                            width: 'min(88vw, 300px)',
                            boxSizing: 'border-box',
                        }}
                    >
                        <div style={{ fontSize: 'clamp(28px, 10vw, 40px)', color: '#ef4444', textShadow: '0 0 16px rgba(239,68,68,0.7)', lineHeight: 1 }}>
                            {cfg.icon}
                        </div>
                        <h2 style={{ fontSize: 'clamp(14px, 4.5vw, 20px)', fontWeight: 800, color: '#ef4444', textShadow: '0 0 16px rgba(239,68,68,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
                            {t(cfg.titleKey)}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: 'clamp(11px, 3vw, 13px)', margin: 0, textAlign: 'center' }}>
                            {errMsg || t(cfg.msgKey)}
                        </p>
                        <button
                            onClick={() => onButtonPress('restart')}
                            style={{
                                fontSize: 'clamp(11px, 3vw, 13px)',
                                padding: 'clamp(8px, 2vw, 10px) clamp(20px, 6vw, 28px)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.45)',
                                color: '#ef4444',
                                borderRadius: 10,
                                cursor: 'pointer',
                                fontWeight: 600,
                                letterSpacing: '0.04em',
                                marginTop: 4,
                                boxShadow: '0 0 12px rgba(239,68,68,0.12)',
                                transition: 'all 0.15s',
                                touchAction: 'manipulation',
                            }}
                        >
                            {t('lost.try_again')}
                        </button>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    if (isSuccess) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(2, 5, 14, 0.82)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        zIndex: 150,
                        padding: '16px',
                        boxSizing: 'border-box',
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.7, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        style={{
                            background: 'rgba(3, 7, 18, 0.97)',
                            border: '1px solid rgba(0, 255, 136, 0.4)',
                            boxShadow: '0 0 40px rgba(0, 255, 136, 0.15), 0 0 80px rgba(0, 255, 136, 0.05)',
                            borderRadius: 20,
                            padding: 'clamp(20px, 5vw, 32px) clamp(24px, 6vw, 40px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 'clamp(10px, 3vw, 14px)',
                            width: 'min(88vw, 300px)',
                            boxSizing: 'border-box',
                        }}
                    >
                        <div style={{ fontSize: 'clamp(28px, 10vw, 40px)', color: '#00ff88', textShadow: '0 0 16px rgba(0,255,136,0.7)', lineHeight: 1 }}>
                            ✦
                        </div>
                        <h2 style={{ fontSize: 'clamp(14px, 4.5vw, 20px)', fontWeight: 800, color: '#00ff88', textShadow: '0 0 16px rgba(0,255,136,0.5)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
                            {t('win.title')}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: 'clamp(11px, 3vw, 13px)', margin: 0, textAlign: 'center' }}>
                            {t('win.test_success')}
                        </p>
                        
                        <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center', marginTop: 4 }}>
                            <button
                                onClick={() => onButtonPress('restart')}
                                style={{
                                    fontSize: 'clamp(11px, 3vw, 12px)',
                                    padding: 'clamp(8px, 2vw, 10px) clamp(16px, 4vw, 22px)',
                                    background: 'rgba(148, 163, 184, 0.06)',
                                    border: '1px solid rgba(148, 163, 184, 0.25)',
                                    color: '#94a3b8',
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    letterSpacing: '0.04em',
                                    transition: 'all 0.15s',
                                    touchAction: 'manipulation',
                                }}
                            >
                                {t('lost.try_again')}
                            </button>
                            <button
                                onClick={() => onButtonPress('menu')}
                                style={{
                                    fontSize: 'clamp(11px, 3vw, 12px)',
                                    padding: 'clamp(8px, 2vw, 10px) clamp(16px, 4vw, 22px)',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.45)',
                                    color: '#ef4444',
                                    borderRadius: 10,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    letterSpacing: '0.04em',
                                    boxShadow: '0 0 12px rgba(239,68,68,0.12)',
                                    transition: 'all 0.15s',
                                    touchAction: 'manipulation',
                                }}
                            >
                                {t('win.end_test')}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    if (event.kind === 'text' && !isError) {
        const color = TEXT_COLORS[event.textType] ?? '#ffffff';
        return (
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(3,7,18,0.78)',
                zIndex: 100,
            }}>
                <span style={{
                    color,
                    fontSize: 20,
                    fontWeight: 'bold',
                    textShadow: `0 0 18px ${color}`,
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                    padding: '0 16px',
                }}>
                    {event.message}
                </span>
            </div>
        );
    }

    return null;
}
