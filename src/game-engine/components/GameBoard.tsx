// components/GameBoard.tsx
// Film oynatıcı — sadece TickSnapshot[] çizer, oyun mantığı içermez.

'use client';

import { useEffect, useRef, useState, useMemo, ReactNode } from 'react';
import { TickSnapshot, VFXEvent, RoomState, EdgeConfig } from '../logic/types';
import { Cell } from '../logic/cellTypes';
import { Entity } from '../logic/entityTypes';
import { ENTITY_RENDERERS } from './entities/ENTITY_RENDERERS';
import { PhysicsWrapper } from './physicsWrapper';
import { LevelEdges } from '../logic/engine/getNextTopologyPosition';
import { calculateRoomLayoutOffsets, routePortalPath } from '../logic/engine/rooms';
import { useGameTheme } from '../contexts/GameThemeContext';
import { GameIcon } from '@/components/icons';
import { VictoryCelebration, VICTORY_CELEBRATION_DURATION } from './effects/VictoryCelebration';
import type { SoundName } from '../hooks/useSoundManager';
import { userStorageGet } from '@/lib/userStorage';
import { soundEngine } from '../audio/soundEngine';
import { hapticImpact, hapticNotify } from '@/lib/haptics';
import { BoardCell } from './board/BoardCell';
import { RoomTrails, RoomCables } from './board/RoomOverlays';
import { ensureBoardKeyframes } from './board/boardKeyframes';
import { BoardIndex, buildBoardIndex, cellKey, isCellVisible, playersIn, playersSignature } from './board/boardIndex';

const CELL_SIZE = 64;

/** Bir tick'in ekranda kalma süresi (ms) — bkz. `frameMs` yorumu. */
const MIN_FRAME_MS = 55;
const MAX_FRAME_MS = 90;

const VFX_TO_SOUND: Partial<Record<string, SoundName>> = {
    sound_move:         'move',
    sound_push:         'box_push',
    sound_ice_slide:    'ice',
    sound_ice_break:    'ice',
    sound_portal_enter: 'portal',
    sound_portal_exit:  'teleport',
    sound_boing:        'boing',
    sound_conveyor:     'conveyor',
    sound_toggle:       'toggle',
    sound_win:          'win',
    sound_lose:         'lose',
};

const EMPTY_INDEX: BoardIndex = buildBoardIndex([]);
const NO_ENTITIES: Entity[] = [];

interface GameBoardProps {
    snapshots: TickSnapshot[] | null;
    controlledRoomIds?: string[]; // Aktif/kontrol edilen odalar
    levelEdges?: LevelEdges; // Legacy single-room edge behavior
    onAnimationEnd?: () => void;
    onPlaySound?: (sound: SoundName) => void;
    muted?: boolean;
}

type EdgeSide = 'top' | 'bottom' | 'left' | 'right';
type EdgeBehavior = 'wall' | 'portal' | 'lava' | EdgeConfig;

// Aşağıdaki iki yardımcı bileşenin state'le ilgisi yok; modül seviyesinde
// durmaları her render'da yeniden oluşturulmalarını engeller.
function renderEdgeStrip(side: EdgeSide, behavior?: EdgeBehavior) {
    if (!behavior) return null;

    const ruleType = typeof behavior === 'string' ? behavior : behavior.type;
    const isLava = ruleType === 'lava';
    const isPortal = ruleType === 'portal';
    const isHorizontal = side === 'top' || side === 'bottom';

    const style: React.CSSProperties = {
        position: 'absolute',
        zIndex: 90,
        pointerEvents: 'none',
        ...(side === 'top' && { top: 0, left: 0, right: 0, height: 4 }),
        ...(side === 'bottom' && { bottom: 0, left: 0, right: 0, height: 4 }),
        ...(side === 'left' && { top: 0, bottom: 0, left: 0, width: 4 }),
        ...(side === 'right' && { top: 0, bottom: 0, right: 0, width: 4 }),
    };

    if (isLava) {
        style.background = isHorizontal
            ? 'linear-gradient(90deg, #ef4444, #f97316, #ef4444, #ef4444)'
            : 'linear-gradient(180deg, #ef4444, #f97316, #ef4444, #ef4444)';
        style.backgroundSize = isHorizontal ? '300% 100%' : '100% 300%';
        style.boxShadow = '0 0 10px #ef4444, 0 0 20px rgba(239, 68, 68, 0.5)';
        style.animation = `${isHorizontal ? 'lava-flow-horiz' : 'lava-flow-vert'} 4s infinite linear, edge-glow-pulse 1.5s infinite ease-in-out`;
    } else if (isPortal) {
        style.background = isHorizontal
            ? 'linear-gradient(90deg, #8b5cf6, #ec4899, #8b5cf6, #8b5cf6)'
            : 'linear-gradient(180deg, #8b5cf6, #ec4899, #8b5cf6, #8b5cf6)';
        style.backgroundSize = isHorizontal ? '300% 100%' : '100% 300%';
        style.boxShadow = '0 0 10px #a855f7, 0 0 20px rgba(168, 85, 247, 0.5)';
        style.animation = `${isHorizontal ? 'portal-shift-horiz' : 'portal-shift-vert'} 3s infinite linear, edge-glow-pulse 1.2s infinite ease-in-out`;
    } else {
        style.background = 'rgba(30, 58, 138, 0.4)';
        style.boxShadow = 'none';
    }

    return <div style={style} />;
}

function renderEdgeLabel(side: EdgeSide, behavior?: EdgeBehavior) {
    if (!behavior) return null;

    const ruleType = typeof behavior === 'string' ? behavior : behavior.type;
    if (ruleType === 'wall') return null;

    const isLava = ruleType === 'lava';
    const isPortal = ruleType === 'portal';

    const style: React.CSSProperties = {
        position: 'absolute',
        zIndex: 95,
        pointerEvents: 'none',
        fontSize: 14,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        backgroundColor: isLava ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)',
        border: `1px solid ${isLava ? 'rgba(239, 68, 68, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
        color: isLava ? '#ef4444' : '#a855f7',
        textShadow: `0 0 6px ${isLava ? '#ef4444' : '#a855f7'}`,
        boxShadow: `0 0 10px ${isLava ? 'rgba(239, 68, 68, 0.1)' : 'rgba(168, 85, 247, 0.1)'}`,
        animation: 'label-breath 2.5s infinite ease-in-out',
        ...(side === 'top' && { top: -28, left: '50%', transform: 'translateX(-50%)' }),
        ...(side === 'bottom' && { bottom: -28, left: '50%', transform: 'translateX(-50%)' }),
        ...(side === 'left' && { left: -28, top: '50%', transform: 'translateY(-50%)' }),
        ...(side === 'right' && { right: -28, top: '50%', transform: 'translateY(-50%)' }),
    };

    const iconStyle: React.CSSProperties = isPortal ? {
        animation: 'portal-spin 6s infinite linear',
        display: 'inline-block',
    } : {};

    return (
        <div style={style}>
            <span style={iconStyle}>
                {isLava ? <GameIcon name="skull" size={20} color="#ff2d55" /> : <GameIcon name="portal" size={20} color="#00f5d4" />}
            </span>
        </div>
    );
}

const GameBoard = ({ snapshots, controlledRoomIds, onAnimationEnd, onPlaySound, muted }: GameBoardProps) => {
    const { themeConfig } = useGameTheme();
    const [prevSnapshots, setPrevSnapshots] = useState<TickSnapshot[] | null>(snapshots);
    const [currentFrame, setCurrentFrame] = useState(0);

    if (snapshots !== prevSnapshots) {
        setPrevSnapshots(snapshots);
        const isExtension = prevSnapshots &&
                            prevSnapshots.length > 0 &&
                            snapshots &&
                            snapshots.length > prevSnapshots.length &&
                            prevSnapshots[0] === snapshots[0];
        if (!isExtension) {
            setCurrentFrame(0);
        }
    }

    const onAnimationEndRef = useRef(onAnimationEnd);
    onAnimationEndRef.current = onAnimationEnd;

    const remainingFrames = snapshots ? snapshots.length - 1 - currentFrame : 0;
    // Kare süresi aynı anda CSS geçiş süresidir. Eski alt sınır 20ms idi:
    // 60Hz'de bir ekran karesinden az, yani geçiş hiç tamamlanmadan bir
    // sonraki tick geliyordu — hareket akmak yerine "zıplıyor" gibi
    // görünüyordu. MIN_FRAME_MS ~3.5 ekran karesine denk gelir; ara kareler
    // gerçekten çizilir ve uzun kaymalar bile akıcı okunur.
    const frameMs = snapshots
        ? remainingFrames > 3
            ? Math.max(MIN_FRAME_MS, Math.min(MAX_FRAME_MS, 420 / remainingFrames))
            : Math.max(60, Math.min(110, 300 / snapshots.length))
        : 80;

    // Kare verisi — tüm hook'lar erken çıkıştan ÖNCE çalışmalı.
    const frameIndex = snapshots && snapshots.length > 0 ? Math.min(currentFrame, snapshots.length - 1) : 0;
    const snapshot: TickSnapshot | null = snapshots?.[frameIndex] ?? null;
    const prevSnapshot: TickSnapshot | null = (snapshots && frameIndex > 0 ? snapshots[frameIndex - 1] : null) ?? null;
    const rooms = snapshot?.rooms ?? null;
    const entities = snapshot?.entities ?? NO_ENTITIES;

    // @keyframes tanımları statik — belgeye tek sefer enjekte edilir.
    useEffect(() => { ensureBoardKeyframes(); }, []);

    const { roomPositions, totalWidth, totalHeight } = useMemo(
        () => (rooms
            ? calculateRoomLayoutOffsets(rooms, CELL_SIZE, 40)
            : { roomPositions: {}, totalWidth: 0, totalHeight: 0 }),
        [rooms]
    );

    // Kare başına TEK geçişte varlık indeksi. Eski kod hücre başına
    // `entities.find` + `entities.filter` çağırıyordu (bkz. boardIndex.ts).
    const index = useMemo(() => (snapshot ? buildBoardIndex(snapshot.entities) : EMPTY_INDEX), [snapshot]);
    const prevIndex = useMemo(() => (prevSnapshot ? buildBoardIndex(prevSnapshot.entities) : EMPTY_INDEX), [prevSnapshot]);
    const playersSig = useMemo(() => playersSignature(entities), [entities]);

    useEffect(() => {
        if (!snapshots || snapshots.length === 0) return;
        if (snapshots.length === 1) return;

        if (currentFrame >= snapshots.length - 1) {
            const finalSnapshot = snapshots[snapshots.length - 1];
            const hasDeath = finalSnapshot?.entities.some(e => e.customData.deathReason) ?? false;
            const hasVictory = finalSnapshot?.entities.some(e => e.customData.isVictory) ?? false;

            if (hasDeath) {
                const timer = setTimeout(() => {
                    onAnimationEndRef.current?.();
                }, 800);
                return () => clearTimeout(timer);
            } else if (hasVictory) {
                const timer = setTimeout(() => {
                    onAnimationEndRef.current?.();
                }, VICTORY_CELEBRATION_DURATION);
                return () => clearTimeout(timer);
            } else {
                onAnimationEndRef.current?.();
            }
            return;
        }

        let start: number | null = null;
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;

            if (progress >= frameMs) {
                setCurrentFrame(c => c + 1);
            } else {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        animationFrameId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrameId);
    }, [currentFrame, snapshots, frameMs]);

    useEffect(() => {
        if (muted) return;
        if (!snapshots) return;
        const frame = snapshots[currentFrame];
        if (!frame) return;
        frame.vfxEvents.forEach((vfx: VFXEvent) => {
            const soundName = VFX_TO_SOUND[vfx];
            if (!soundName) return;
            if (onPlaySound) {
                onPlaySound(soundName);
            } else if (typeof window !== 'undefined' && userStorageGet('soundMuted') !== 'true') {
                // PlayScreen dışındaki kullanımlar (ör. editör önizleme) için
                // aynı Web Audio motoru — HTMLAudioElement gecikmesi yok.
                soundEngine.play(soundName);
            }
        });
    }, [currentFrame, snapshots, muted, onPlaySound]);

    // Dokunsal geri bildirim: çarpma / ölüm / zafer. Sesle aynı karede verilir
    // ki görüntü-ses-titreşim üçlüsü senkron kalsın.
    useEffect(() => {
        if (!snapshots) return;
        const frame = snapshots[currentFrame];
        if (!frame) return;

        let strongest: 'none' | 'bump' | 'death' | 'victory' = 'none';
        for (const entity of frame.entities) {
            if (entity.customData.deathReason) { strongest = 'death'; break; }
            if (entity.customData.isVictory) { strongest = 'victory'; break; }
            if (entity.customData.bumpDirection) strongest = 'bump';
        }

        if (strongest === 'death') hapticNotify('error');
        else if (strongest === 'victory') hapticNotify('success');
        else if (strongest === 'bump') hapticImpact('medium');
    }, [currentFrame, snapshots]);

    if (!snapshots || snapshots.length === 0 || !snapshot || !rooms) return null;

    const finalSnapshot = snapshots[snapshots.length - 1];
    const hasVictory = finalSnapshot?.entities.some(e => e.customData.isVictory) ?? false;
    const isVictoryActive = currentFrame >= snapshots.length - 1 && hasVictory;

    // Bağlantılı portal çizgilerini oluştur
    const connections: { fromRoomId: string; fromSide: EdgeSide; toRoomId: string; toSide: EdgeSide }[] = [];
    const seen = new Set<string>();
    for (const [rId, room] of Object.entries(rooms)) {
        for (const side of ['top', 'bottom', 'left', 'right'] as const) {
            const edge = room.edges[side];
            if (edge && edge.type === 'portal' && edge.targetRoomId && edge.targetEdge) {
                const targetRoomId = edge.targetRoomId;
                const targetEdge = edge.targetEdge;

                const connectionKey = [`${rId}:${side}`, `${targetRoomId}:${targetEdge}`].sort().join('--');
                if (seen.has(connectionKey)) continue;
                seen.add(connectionKey);
                connections.push({ fromRoomId: rId, fromSide: side, toRoomId: targetRoomId, toSide: targetEdge });
            }
        }
    }

    const connectionPaths: ReactNode[] = [];
    connections.forEach((conn, connIdx) => {
        const pathD = routePortalPath(
            conn.fromRoomId,
            conn.fromSide,
            conn.toRoomId,
            conn.toSide,
            roomPositions,
            rooms,
            CELL_SIZE,
            40, // gap for gameplay
            connIdx,
            connections.length
        );

        connectionPaths.push(
            <g key={`${conn.fromRoomId}-${conn.fromSide}-${conn.toRoomId}-${conn.toSide}`}>
                <path
                    d={pathD}
                    fill="none"
                    stroke="rgba(168, 85, 247, 0.4)"
                    strokeWidth={6}
                    strokeLinecap="round"
                    filter="blur(4px)"
                />
                <path
                    d={pathD}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray="6, 6"
                    style={{
                        animation: 'crawlPath 1.2s linear infinite',
                    }}
                />
            </g>
        );
    });

    const roomList = Object.values(rooms) as RoomState[];

    return (
        <div style={{ position: 'relative', width: totalWidth, height: totalHeight }}>
            {/* Portal Bağlantı SVG Overlay */}
            {connectionPaths.length > 0 && (
                <svg
                    style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: totalWidth,
                        height: totalHeight,
                        pointerEvents: 'none',
                        zIndex: 80,
                    }}
                >
                    {connectionPaths}
                </svg>
            )}

            {/* Odaların Çizilmesi */}
            {roomList.map((room: RoomState) => {
                const offset = roomPositions[room.id];
                if (!offset) return null;

                const isControlled = !controlledRoomIds || controlledRoomIds.length === 0 || controlledRoomIds.includes(room.id);
                const players = playersIn(index, room.id);

                return (
                    <div
                        key={room.id}
                        style={{
                            position: 'absolute',
                            left: offset.left,
                            top: offset.top,
                            width: offset.width,
                            height: offset.height,
                            boxSizing: 'border-box',
                            transition: 'opacity 0.25s, box-shadow 0.25s',
                            opacity: isControlled ? 1.0 : 0.4,
                            border: themeConfig.board.border(isControlled),
                            boxShadow: themeConfig.board.boxShadow(isControlled),
                            background: themeConfig.board.background,
                            borderRadius: themeConfig.board.borderRadius ?? 6,
                        }}
                    >
                        {/* Oda başlığı */}
                        <div style={{
                            position: 'absolute',
                            top: -20, left: 2,
                            fontSize: 10, fontWeight: 700,
                            color: isControlled ? '#00c4ff' : '#475569',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}>
                            {room.name}
                        </div>

                        {/* Edge Neon Borders & Labels */}
                        {renderEdgeStrip('top', room.edges.top)}
                        {renderEdgeStrip('bottom', room.edges.bottom)}
                        {renderEdgeStrip('left', room.edges.left)}
                        {renderEdgeStrip('right', room.edges.right)}

                        {renderEdgeLabel('top', room.edges.top)}
                        {renderEdgeLabel('bottom', room.edges.bottom)}
                        {renderEdgeLabel('left', room.edges.left)}
                        {renderEdgeLabel('right', room.edges.right)}

                        {/* Grid cells */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${room.width}, ${CELL_SIZE}px)`,
                            width: offset.width - 4, // 2px border offset correction
                            height: offset.height - 4,
                        }}>
                            {room.grid.map((row: Cell[]) =>
                                row.map((cell: Cell) => {
                                    const key = cellKey(room.id, cell.position.row, cell.position.col);
                                    const isCurrentlyVisible = isCellVisible(room, players, cell.position.row, cell.position.col);
                                    const isExplored = !room.fogOfWar
                                        || (room.fogKeepRevealed !== false ? !!cell.customData.explored : isCurrentlyVisible);

                                    return (
                                        <BoardCell
                                            key={cell.id}
                                            cell={cell}
                                            size={CELL_SIZE}
                                            entityOnCell={index.entityAt.get(key) ?? null}
                                            prevEntityOnCell={prevIndex.entityAt.get(key) ?? null}
                                            isCurrentlyVisible={isCurrentlyVisible}
                                            isExplored={isExplored}
                                        />
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Trail Layer */}
            <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: totalWidth, height: totalHeight }}>
                {roomList.map((room: RoomState) => {
                    const offset = roomPositions[room.id];
                    if (!offset) return null;
                    return (
                        <RoomTrails
                            key={room.id}
                            room={room}
                            offset={offset}
                            cellSize={CELL_SIZE}
                            players={playersIn(index, room.id)}
                            playerByIndex={index.playerByIndex}
                            sig={playersSig}
                        />
                    );
                })}
            </div>

            {/* Cable Layer */}
            <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: totalWidth, height: totalHeight }}>
                {roomList.map((room: RoomState) => {
                    const offset = roomPositions[room.id];
                    if (!offset) return null;
                    return (
                        <RoomCables
                            key={room.id}
                            room={room}
                            offset={offset}
                            cellSize={CELL_SIZE}
                            players={playersIn(index, room.id)}
                            playerByIndex={index.playerByIndex}
                            sig={playersSig}
                        />
                    );
                })}
            </div>

            {/* Entity Layer */}
            <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                {entities.map((entity: Entity) => {
                    const Renderer = ENTITY_RENDERERS[entity.type];
                    const rId = entity.position.roomId ?? 'main';
                    const room = rooms[rId];
                    const currentCell = room?.grid[entity.position.row]?.[entity.position.col];
                    const prevEntity = prevIndex.byId.get(entity.id) ?? null;

                    const playersInRoom = playersIn(index, rId);
                    const isEntityVisible = !room?.fogOfWar
                        || entity.type === 'player'
                        || isCellVisible(room, playersInRoom, entity.position.row, entity.position.col);
                    const isEntityExplored = !room?.fogOfWar
                        || (room.fogKeepRevealed !== false ? !!currentCell?.customData.explored : isEntityVisible);

                    const isPlayerCelebrating = isVictoryActive && entity.type === 'player';
                    const opacity = isPlayerCelebrating ? 0.0 : ((isEntityExplored && isEntityVisible) ? 1.0 : 0.0);

                    return (
                        <PhysicsWrapper
                            key={entity.id}
                            entity={entity}
                            prevEntity={prevEntity}
                            currentCellType={currentCell?.type ?? 'normal'}
                            frameMs={frameMs}
                            roomOffsets={roomPositions}
                        >
                            <div style={{ opacity, transition: 'opacity 0.3s ease', width: '100%', height: '100%' }}>
                                <Renderer entity={entity} />
                            </div>
                        </PhysicsWrapper>
                    );
                })}
            </div>

            {/* Victory Celebration Layer */}
            {isVictoryActive && finalSnapshot && (
                <VictoryCelebration
                    entities={finalSnapshot.entities}
                    roomPositions={roomPositions}
                    boardWidth={totalWidth}
                    boardHeight={totalHeight}
                    durationMs={VICTORY_CELEBRATION_DURATION}
                />
            )}
        </div>
    );
};

export default GameBoard;
