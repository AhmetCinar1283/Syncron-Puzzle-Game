// components/GameBoard.tsx
// Film oynatıcı — sadece TickSnapshot[] çizer, oyun mantığı içermez.

'use client';

import { useEffect, useMemo, ReactNode } from 'react';
import { TickSnapshot, RoomState, EdgeConfig } from '../logic/types';
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
import { useFilmPlayback } from '../hooks/useFilmPlayback';
import { BoardCell } from './board/BoardCell';
import { RoomTrails, RoomCables } from './board/RoomOverlays';
import { ensureBoardKeyframes, BoardAmbientMode } from './board/boardKeyframes';
import { useMotionTier } from '@/lib/motionTier';
import type { JankPhase } from '../render/jankMonitor';
import { BoardIndex, buildBoardIndex, cellKey, isCellVisible, playersIn, playersSignature } from './board/boardIndex';

const CELL_SIZE = 64;

const EMPTY_INDEX: BoardIndex = buildBoardIndex([]);
const NO_ENTITIES: Entity[] = [];

interface GameBoardProps {
    snapshots: TickSnapshot[] | null;
    controlledRoomIds?: string[]; // Aktif/kontrol edilen odalar
    levelEdges?: LevelEdges; // Legacy single-room edge behavior
    onAnimationEnd?: () => void;
    onPlaySound?: (sound: SoundName) => void;
    muted?: boolean;
    /** Kasma dedektörü için oynatma evresi (yalnızca DOM + Otomatik iken verilir). */
    onPlaybackPhase?: (phase: JankPhase) => void;
}

type EdgeSide = 'top' | 'bottom' | 'left' | 'right';
type EdgeBehavior = 'wall' | 'portal' | 'lava' | EdgeConfig;

// Aşağıdaki iki yardımcı bileşenin state'le ilgisi yok; modül seviyesinde
// durmaları her render'da yeniden oluşturulmalarını engeller.
function edgePlacement(side: EdgeSide): React.CSSProperties {
    switch (side) {
        case 'top':    return { top: 0, left: 0, right: 0, height: 4 };
        case 'bottom': return { bottom: 0, left: 0, right: 0, height: 4 };
        case 'left':   return { top: 0, bottom: 0, left: 0, width: 4 };
        case 'right':  return { top: 0, bottom: 0, right: 0, width: 4 };
    }
}

function renderEdgeStrip(side: EdgeSide, behavior?: EdgeBehavior) {
    if (!behavior) return null;

    const ruleType = typeof behavior === 'string' ? behavior : behavior.type;
    const isLava = ruleType === 'lava';
    const isPortal = ruleType === 'portal';
    const isHorizontal = side === 'top' || side === 'bottom';

    const outer: React.CSSProperties = {
        position: 'absolute',
        zIndex: 90,
        pointerEvents: 'none',
        ...edgePlacement(side),
    };

    if (!isLava && !isPortal) {
        outer.background = 'rgba(30, 58, 138, 0.4)';
        return <div style={outer} />;
    }

    // Akan gradient: eskiden `background-position` animasyonlanıyordu; bu her
    // karede gradient'i yeniden boyar. Aynı görüntüyü, 3 kat uzunluktaki bir iç
    // katmanı `transform` ile kaydırarak alıyoruz — compositor işi, 0 boyama.
    outer.overflow = 'hidden';
    outer.boxShadow = isLava
        ? '0 0 10px #ef4444, 0 0 20px rgba(239, 68, 68, 0.5)'
        : '0 0 10px #a855f7, 0 0 20px rgba(168, 85, 247, 0.5)';
    outer.animation = `edge-glow-pulse ${isLava ? '1.5s' : '1.2s'} infinite ease-in-out`;

    const stops = isLava
        ? '#ef4444, #f97316, #ef4444, #ef4444'
        : '#8b5cf6, #ec4899, #8b5cf6, #8b5cf6';

    const inner: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: isHorizontal ? '300%' : '100%',
        height: isHorizontal ? '100%' : '300%',
        background: `linear-gradient(${isHorizontal ? '90deg' : '180deg'}, ${stops})`,
        willChange: 'transform',
        animation: `${isHorizontal ? 'edge-slide-horiz' : 'edge-slide-vert'} ${isLava ? '4s' : '3s'} infinite linear`,
    };

    return (
        <div className="board-edge-glow" style={outer}>
            <div className="board-edge-flow" style={inner} />
        </div>
    );
}

function renderEdgeLabel(side: EdgeSide, behavior?: EdgeBehavior) {
    if (!behavior) return null;

    const ruleType = typeof behavior === 'string' ? behavior : behavior.type;
    if (ruleType === 'wall') return null;

    const isLava = ruleType === 'lava';
    const isPortal = ruleType === 'portal';

    // Konumlandırma dış katmanda durur. Eskiden `label-breath` aynı elemanda
    // çalışıyordu ve keyframe'in `transform: scale(1)` değeri buradaki
    // `translateX(-50%)`'i eziyordu — etiketler yana kayıyordu.
    const outerStyle: React.CSSProperties = {
        position: 'absolute',
        zIndex: 95,
        pointerEvents: 'none',
        ...(side === 'top' && { top: -28, left: '50%', transform: 'translateX(-50%)' }),
        ...(side === 'bottom' && { bottom: -28, left: '50%', transform: 'translateX(-50%)' }),
        ...(side === 'left' && { left: -28, top: '50%', transform: 'translateY(-50%)' }),
        ...(side === 'right' && { right: -28, top: '50%', transform: 'translateY(-50%)' }),
    };

    const breathStyle: React.CSSProperties = {
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
    };

    const iconStyle: React.CSSProperties = isPortal ? {
        animation: 'portal-spin 6s infinite linear',
        display: 'inline-block',
    } : {};

    return (
        <div style={outerStyle}>
            <div className="board-edge-label" style={breathStyle}>
                <span className={isPortal ? 'board-edge-label' : undefined} style={iconStyle}>
                    {isLava ? <GameIcon name="skull" size={20} color="#ff2d55" /> : <GameIcon name="portal" size={20} color="#00f5d4" />}
                </span>
            </div>
        </div>
    );
}

const GameBoard = ({ snapshots, controlledRoomIds, onAnimationEnd, onPlaySound, muted, onPlaybackPhase }: GameBoardProps) => {
    const { themeConfig } = useGameTheme();
    const motionTier = useMotionTier();
    // Film oynatma (kare ilerletme, ses, titreşim, bitiş) ortak hook'ta:
    // canvas yolu da aynısını kullanır (bkz. hooks/useFilmPlayback.ts).
    const { frameMs, snapshot, prevSnapshot, finalSnapshot, isPlaying, isVictoryActive } =
        useFilmPlayback({ snapshots, onAnimationEnd, onPlaySound, muted });

    const rooms = snapshot?.rooms ?? null;
    const entities = snapshot?.entities ?? NO_ENTITIES;

    useEffect(() => {
        onPlaybackPhase?.(isVictoryActive ? 'victory' : isPlaying ? 'move' : 'idle');
    }, [onPlaybackPhase, isVictoryActive, isPlaying]);

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

    if (!snapshots || snapshots.length === 0 || !snapshot || !rooms) return null;

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
                    className="board-portal-crawl"
                    style={{
                        animation: 'crawlPath 1.2s linear infinite',
                    }}
                />
            </g>
        );
    });

    const roomList = Object.values(rooms) as RoomState[];

    // Dekoratif animasyon bütçesi (bkz. boardKeyframes.ts):
    //  - zayıf cihazda tamamen kapalı,
    //  - zafer koreografisi oynarken tamamen kapalı: karenin en pahalı anı bu,
    //    üstelik tahta zaten vignette'in altında kalıyor, kimse bakmıyor,
    //  - hamle oynatılırken duraklatılmış (tüm kare bütçesi harekete kalsın),
    //  - boşta tam hızında.
    const ambientMode: BoardAmbientMode =
        motionTier === 'lite' || isVictoryActive ? 'off' : isPlaying ? 'paused' : 'on';

    return (
        <div
            data-board-ambient={ambientMode}
            style={{ position: 'relative', width: totalWidth, height: totalHeight }}
        >
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
                                            hasFog={!!room.fogOfWar}
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
