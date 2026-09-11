import { solvePuzzle } from './solver';
import type { LevelData, CellType, LevelEdges, EdgeBehavior, Position, LevelObjectDef, LevelTargetDef, ConveyorCellConfig, TrampolineCellConfig, BoxDef } from '../level-format';

export interface GeneratorFilters {
  width: number;
  height: number;
  difficulty: 1 | 2 | 3 | 4; // 1: Easy (2-5 moves), 2: Medium (6-10 moves), 3: Hard (11-16 moves), 4: Expert (17-25 moves)
  playerCount: number | string; // e.g. 1, 2, 3, 4 or '2-4'
  edgeBehavior?: 'wall' | 'portal' | 'lava' | 'random'; // legacy
  edgeTopAllowed?: (EdgeBehavior | 'random')[];
  edgeBottomAllowed?: (EdgeBehavior | 'random')[];
  edgeLeftAllowed?: (EdgeBehavior | 'random')[];
  edgeRightAllowed?: (EdgeBehavior | 'random')[];
  conveyorSteps?: number[] | number | 'random';
  trampolineSteps?: number[] | number | 'random';
  // Player options
  playerMode: 'normal' | 'reversed' | 'random';
  playerLock: 'lock' | 'nolock' | 'random';
  // Trail collision
  trailCollision: 'yes' | 'no' | 'random';
  // Specific densities (0.0 to 0.5)
  obstacleDensity: number;
  iceDensity: number;
  conveyorDensity: number;
  trampolineDensity: number;
  forbiddenDensity: number;
  toggleDensity: number;
  teleporterCount: number; // Number of teleporter pairs (0 to 3)

  // Specific exact counts (overrides densities)
  obstacleCount?: number;
  iceCount?: number;
  conveyorCount?: number;
  trampolineCount?: number;
  forbiddenCount?: number;
  toggleCount?: number;

  // Interactive enhancements
  lockedCells?: Record<string, boolean>;
  mutationRate?: number;
  originalGrid?: CellType[][];
  originalObjects?: LevelObjectDef[];
  originalTargets?: LevelTargetDef[];
  originalBoxes?: BoxDef[];
  originalConveyorConfig?: ConveyorCellConfig[];
  originalTrampolineConfig?: TrampolineCellConfig[];

  // Multi-room settings
  numRooms?: number;
  roomPlacementMode?: 'grid' | 'random';
  roomFogMode?: 'all_light' | 'all_dark' | 'random';
  roomFogVisibility?: number | string;
  roomFogPersist?: 'yes' | 'no' | 'random';
  roomPortalConnection?: 'connected' | 'disconnected' | 'random';
  playerDistribution?: 'same_room' | 'random_rooms';
  controlMode?: 'all_rooms' | 'selected_room' | 'random';
}

/** Helper to generate a random number in range [min, max] inclusive */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Shuffles an array in place (Fisher-Yates) */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Check if two positions are equal */
function posEqual(p1: Position, p2: Position): boolean {
  return p1.row === p2.row && p1.col === p2.col;
}

/** Returns the Manhattan distance between two points */
function manhattanDistance(p1: Position, p2: Position): number {
  return Math.abs(p1.row - p2.row) + Math.abs(p1.col - p2.col);
}

/** Helper to find a path of rooms from start to end based on portal connections */
function findRoomPath(start: string, end: string, rooms: any[]): { roomId: string, crossedEdge: 'top' | 'bottom' | 'left' | 'right' }[] | null {
  const queue: { current: string, path: { roomId: string, crossedEdge: 'top' | 'bottom' | 'left' | 'right' }[] }[] = [];
  queue.push({ current: start, path: [] });
  const visited = new Set<string>([start]);

  while (queue.length > 0) {
    const { current, path } = queue.shift()!;
    if (current === end) {
      return path;
    }
    const room = rooms.find(r => r.id === current);
    if (!room) continue;

    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      const edge = room.edges[side];
      if (edge && edge.type === 'portal' && edge.targetRoomId) {
        const nextRoomId = edge.targetRoomId;
        if (!visited.has(nextRoomId)) {
          visited.add(nextRoomId);
          queue.push({
            current: nextRoomId,
            path: [...path, { roomId: current, crossedEdge: side }]
          });
        }
      }
    }
  }
  return null;
}

/** Helper to get border position for an edge side */
function getEdgeBorderPosition(side: 'top' | 'bottom' | 'left' | 'right', w: number, h: number): Position {
  if (side === 'top') return { row: 0, col: Math.floor(w / 2) };
  if (side === 'bottom') return { row: h - 1, col: Math.floor(w / 2) };
  if (side === 'left') return { row: Math.floor(h / 2), col: 0 };
  return { row: Math.floor(h / 2), col: w - 1 };
}

/**
 * Builds a single candidate LevelData based on density and filters.
 * Applies connectivity rules to maximize solvability.
 */
function buildCandidate(filters: GeneratorFilters, attemptId: number): LevelData {
  const { width, height, playerCount, edgeBehavior } = filters;

  const locked = filters.lockedCells ?? {};
  const isLocked = (r: number, c: number) => !!locked[`${r},${c}`];
  const mutationRate = filters.mutationRate ?? 1.0;
  const isMutating = filters.originalGrid !== undefined;

  // Determine player modes based on filter
  const getPlayerMode = (): 'normal' | 'reversed' => {
    if (filters.playerMode === 'random') {
      return Math.random() > 0.5 ? 'normal' : 'reversed';
    }
    return filters.playerMode as 'normal' | 'reversed';
  };

  // Determine player target lock settings
  const getPlayerLock = (): boolean => {
    if (filters.playerLock === 'random') {
      return Math.random() > 0.5;
    }
    return filters.playerLock === 'lock';
  };

  // Determine actual playerCount for this run
  let actualPlayerCount = 1;
  if (typeof playerCount === 'number') {
    actualPlayerCount = playerCount;
  } else if (typeof playerCount === 'string' && playerCount.includes('-')) {
    const [minStr, maxStr] = playerCount.split('-');
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    if (!isNaN(min) && !isNaN(max)) {
      actualPlayerCount = randomInt(min, max);
    }
  } else if (playerCount === 'random' as any) {
    actualPlayerCount = randomInt(1, 4);
  }

  // Determine trail collision
  const getTrailCollision = (): boolean => {
    if (filters.trailCollision === 'random') {
      return Math.random() > 0.5;
    }
    return filters.trailCollision === 'yes';
  };

  // Determine Edge Behaviors for standard rooms
  const behaviors: EdgeBehavior[] = ['wall', 'portal', 'lava'];
  const getEdgeForSide = (allowed: (EdgeBehavior | 'random')[] | undefined, fallbackLegacy: 'wall' | 'portal' | 'lava' | 'random' | undefined): EdgeBehavior => {
    if (allowed && allowed.length > 0) {
      if (allowed.includes('random')) {
        return behaviors[randomInt(0, behaviors.length - 1)];
      }
      return allowed[randomInt(0, allowed.length - 1)] as EdgeBehavior;
    }
    const legacy = fallbackLegacy ?? 'wall';
    if (legacy === 'random') {
      return behaviors[randomInt(0, behaviors.length - 1)];
    }
    return legacy as EdgeBehavior;
  };

  // MULTI-ROOM GENERATION PATH
  const numRooms = filters.numRooms ?? 1;
  if (numRooms > 1) {
    // 1. Position rooms using layout coordinates (x, y)
    let coords: { x: number; y: number }[] = [];
    if (filters.roomPlacementMode === 'random') {
      while (coords.length < numRooms) {
        const rx = randomInt(0, 3);
        const ry = randomInt(0, 3);
        if (!coords.some(c => c.x === rx && c.y === ry)) {
          coords.push({ x: rx, y: ry });
        }
      }
    } else {
      // Grid positioning
      coords = Array.from({ length: numRooms }, (_, idx) => {
        if (numRooms === 4) {
          return { x: idx % 2, y: Math.floor(idx / 2) };
        }
        return { x: idx, y: 0 };
      });
    }

    // 2. Generate room list definitions
    const generatedRooms = Array.from({ length: numRooms }, (_, idx) => {
      const id = idx === 0 ? 'main' : `room_${idx + 1}`;
      const name = idx === 0 ? 'Main Room' : `Room ${idx + 1}`;

      let fogOfWar = false;
      if (filters.roomFogMode === 'all_dark') fogOfWar = true;
      else if (filters.roomFogMode === 'random') fogOfWar = Math.random() > 0.5;

      let fogVisibilityDistance = 1.5;
      if (filters.roomFogVisibility === 'random') {
        fogVisibilityDistance = randomInt(10, 30) / 10;
      } else if (filters.roomFogVisibility !== undefined) {
        fogVisibilityDistance = Number(filters.roomFogVisibility);
      }

      let fogKeepRevealed = true;
      if (filters.roomFogPersist === 'no') fogKeepRevealed = false;
      else if (filters.roomFogPersist === 'random') fogKeepRevealed = Math.random() > 0.5;

      const roomEdges = {
        top: { type: getEdgeForSide(filters.edgeTopAllowed, edgeBehavior) } as any,
        bottom: { type: getEdgeForSide(filters.edgeBottomAllowed, edgeBehavior) } as any,
        left: { type: getEdgeForSide(filters.edgeLeftAllowed, edgeBehavior) } as any,
        right: { type: getEdgeForSide(filters.edgeRightAllowed, edgeBehavior) } as any,
      };

      return {
        id,
        name,
        width,
        height,
        x: coords[idx].x,
        y: coords[idx].y,
        edges: roomEdges,
        grid: Array.from({ length: height }, () => Array(width).fill('empty' as CellType)) as CellType[][],
        fogOfWar,
        fogVisibilityDistance,
        fogKeepRevealed,
      };
    });

    // 3. Connect portal edges between adjacent rooms
    const connMode = filters.roomPortalConnection ?? 'connected';
    if (connMode !== 'disconnected') {
      for (let i = 0; i < generatedRooms.length; i++) {
        for (let j = i + 1; j < generatedRooms.length; j++) {
          const rA = generatedRooms[i];
          const rB = generatedRooms[j];

          let isAdjacent = false;
          let sideA: 'top' | 'bottom' | 'left' | 'right' | null = null;
          let sideB: 'top' | 'bottom' | 'left' | 'right' | null = null;

          if (rA.x === rB.x && rB.y === rA.y + 1) {
            isAdjacent = true;
            sideA = 'bottom';
            sideB = 'top';
          } else if (rA.x === rB.x && rB.y === rA.y - 1) {
            isAdjacent = true;
            sideA = 'top';
            sideB = 'bottom';
          } else if (rA.y === rB.y && rB.x === rA.x + 1) {
            isAdjacent = true;
            sideA = 'right';
            sideB = 'left';
          } else if (rA.y === rB.y && rB.x === rA.x - 1) {
            isAdjacent = true;
            sideA = 'left';
            sideB = 'right';
          }

          if (isAdjacent && sideA && sideB) {
            if (connMode === 'random' && Math.random() > 0.7) {
              continue;
            }
            rA.edges[sideA] = { type: 'portal', targetRoomId: rB.id, targetEdge: sideB };
            rB.edges[sideB] = { type: 'portal', targetRoomId: rA.id, targetEdge: sideA };
          }
        }
      }
    }

    // 4. Distribute Players and Targets across rooms
    const initialObjects: LevelObjectDef[] = [];
    const targets: LevelTargetDef[] = [];

    const roomPositions: Record<string, Position[]> = {};
    generatedRooms.forEach(room => {
      const list: Position[] = [];
      for (let r = 0; r < room.height; r++) {
        for (let c = 0; c < room.width; c++) {
          list.push({ row: r, col: c });
        }
      }
      roomPositions[room.id] = shuffleArray(list);
    });

    const playerAssignments: { id: number; playerRoomId: string; targetRoomId: string }[] = [];
    for (let i = 1; i <= actualPlayerCount; i++) {
      let playerRoomId = 'main';
      let targetRoomId = 'main';
      if (filters.playerDistribution === 'random_rooms') {
        playerRoomId = generatedRooms[randomInt(0, generatedRooms.length - 1)].id;
        targetRoomId = generatedRooms[randomInt(0, generatedRooms.length - 1)].id;
      } else {
        const r = generatedRooms[randomInt(0, generatedRooms.length - 1)];
        playerRoomId = r.id;
        targetRoomId = r.id;
      }
      playerAssignments.push({ id: i, playerRoomId, targetRoomId });
    }

    // Keep track of carved paths per room to avoid placing obstacles on them
    const pathCellsByRoom: Record<string, Set<string>> = {};
    generatedRooms.forEach(r => { pathCellsByRoom[r.id] = new Set<string>(); });

    playerAssignments.forEach(({ id, playerRoomId, targetRoomId }) => {
      const pPool = roomPositions[playerRoomId];
      let pPos = pPool.length > 0 ? pPool.pop()! : { row: 0, col: 0 };

      const tPool = roomPositions[targetRoomId];
      let tPos: Position;
      if (tPool.length > 0) {
        if (playerRoomId === targetRoomId) {
          let tIdx = tPool.findIndex(p => manhattanDistance(p, pPos) >= Math.min(3, width - 1));
          if (tIdx === -1) tIdx = 0;
          tPos = tPool.splice(tIdx, 1)[0];
        } else {
          tPos = tPool.pop()!;
        }
      } else {
        tPos = { row: height - 1, col: width - 1 };
      }

      initialObjects.push({
        id,
        position: { roomId: playerRoomId, row: pPos.row, col: pPos.col },
        mode: getPlayerMode(),
        lockOnTarget: getPlayerLock(),
      });

      targets.push({
        objectId: id,
        position: { roomId: targetRoomId, row: tPos.row, col: tPos.col },
      });

      const targetRoom = generatedRooms.find(r => r.id === targetRoomId)!;
      targetRoom.grid[tPos.row][tPos.col] = `target_${id}` as CellType;

      // 5. Carve paths inside rooms
      const carvePathInRoom = (roomId: string, start: Position, end: Position) => {
        const gridRef = generatedRooms.find(r => r.id === roomId)!.grid;
        let curr = { ...start };
        while (!posEqual(curr, end)) {
          pathCellsByRoom[roomId].add(`${curr.row},${curr.col}`);
          const dRow = Math.sign(end.row - curr.row);
          const dCol = Math.sign(end.col - curr.col);

          if (dRow !== 0 && (dCol === 0 || Math.random() > 0.5)) {
            curr.row += dRow;
          } else if (dCol !== 0) {
            curr.col += dCol;
          }
        }
        pathCellsByRoom[roomId].add(`${end.row},${end.col}`);
      };

      if (playerRoomId === targetRoomId) {
        carvePathInRoom(playerRoomId, pPos, tPos);
      } else {
        const roomPath = findRoomPath(playerRoomId, targetRoomId, generatedRooms);
        if (roomPath && roomPath.length > 0) {
          let currentPos = pPos;
          let currentRoomId = playerRoomId;

          for (let stepIdx = 0; stepIdx < roomPath.length; stepIdx++) {
            const step = roomPath[stepIdx];
            const currentRoom = generatedRooms.find(r => r.id === currentRoomId)!;
            const outgoingEdge = step.crossedEdge;
            const borderPos = getEdgeBorderPosition(outgoingEdge, currentRoom.width, currentRoom.height);

            carvePathInRoom(currentRoomId, currentPos, borderPos);

            // Setup incoming entry point in target room
            const edgeConfig = currentRoom.edges[outgoingEdge];
            const nextRoomId = edgeConfig.targetRoomId!;
            const nextRoom = generatedRooms.find(r => r.id === nextRoomId)!;
            const targetEdge = edgeConfig.targetEdge ?? 'top';

            currentPos = getEdgeBorderPosition(targetEdge, nextRoom.width, nextRoom.height);
            currentRoomId = nextRoomId;
          }

          // Carve path in final room from portal entry to target
          carvePathInRoom(targetRoomId, currentPos, tPos);
        } else {
          // No path: carve locally to random exit (if any) and target
          const pRoom = generatedRooms.find(r => r.id === playerRoomId)!;
          const outgoingSide = (['top', 'bottom', 'left', 'right'] as const).find(s => pRoom.edges[s]?.type === 'portal');
          if (outgoingSide) {
            carvePathInRoom(playerRoomId, pPos, getEdgeBorderPosition(outgoingSide, pRoom.width, pRoom.height));
          }
          const tRoom = generatedRooms.find(r => r.id === targetRoomId)!;
          const incomingSide = (['top', 'bottom', 'left', 'right'] as const).find(s => tRoom.edges[s]?.type === 'portal');
          if (incomingSide) {
            carvePathInRoom(targetRoomId, getEdgeBorderPosition(incomingSide, tRoom.width, tRoom.height), tPos);
          }
        }
      }
    });

    // 6. Global Placement Pool across all rooms (excluding reserved starting/target cells)
    const reservedByRoom: Record<string, Set<string>> = {};
    generatedRooms.forEach(room => {
      reservedByRoom[room.id] = new Set<string>();
      initialObjects.forEach((o) => {
        if (o.position.roomId === room.id) reservedByRoom[room.id].add(`${o.position.row},${o.position.col}`);
      });
      targets.forEach((t) => {
        if (t.position.roomId === room.id) reservedByRoom[room.id].add(`${t.position.row},${t.position.col}`);
      });
    });

    interface GlobalPos {
      roomId: string;
      row: number;
      col: number;
    }
    const globalPlacementPool: GlobalPos[] = [];
    generatedRooms.forEach((room) => {
      for (let r = 0; r < room.height; r++) {
        for (let c = 0; c < room.width; c++) {
          if (!reservedByRoom[room.id].has(`${r},${c}`)) {
            globalPlacementPool.push({ roomId: room.id, row: r, col: c });
          }
        }
      }
    });
    const shuffledGlobalPool = shuffleArray(globalPlacementPool);

    // Place exact count elements globally
    const placeExactCountGlobally = (
      count: number | undefined,
      cellTypePicker: () => CellType,
      allowOnPath: boolean
    ) => {
      if (count === undefined || count <= 0) return;
      let placed = 0;
      for (let i = shuffledGlobalPool.length - 1; i >= 0; i--) {
        if (placed >= count) break;
        const pos = shuffledGlobalPool[i];
        const onMainPath = pathCellsByRoom[pos.roomId].has(`${pos.row},${pos.col}`);

        if (!allowOnPath && onMainPath) {
          continue;
        }

        const room = generatedRooms.find(r => r.id === pos.roomId)!;
        room.grid[pos.row][pos.col] = cellTypePicker();
        shuffledGlobalPool.splice(i, 1);
        placed++;
      }
    };

    // Place Obstacles
    if (filters.obstacleCount !== undefined) {
      placeExactCountGlobally(filters.obstacleCount, () => 'obstacle', false);
    }
    // Place Ice
    if (filters.iceCount !== undefined) {
      placeExactCountGlobally(filters.iceCount, () => 'ice', true);
    }
    // Place Conveyors
    if (filters.conveyorCount !== undefined) {
      const dirs: CellType[] = ['conveyor_up', 'conveyor_down', 'conveyor_left', 'conveyor_right'];
      placeExactCountGlobally(filters.conveyorCount, () => dirs[randomInt(0, 3)], true);
    }
    // Place Trampolines
    if (filters.trampolineCount !== undefined) {
      const dirs: CellType[] = ['trampoline_up', 'trampoline_down', 'trampoline_left', 'trampoline_right'];
      placeExactCountGlobally(filters.trampolineCount, () => dirs[randomInt(0, 3)], true);
    }
    // Place Forbidden
    if (filters.forbiddenCount !== undefined) {
      placeExactCountGlobally(filters.forbiddenCount, () => 'forbidden', true);
    }
    // Place Toggles
    if (filters.toggleCount !== undefined) {
      placeExactCountGlobally(filters.toggleCount, () => 'direction_toggle', true);
    }

    // Portals placement: pairs (A, B, C)
    const portalsToPlace: ('A' | 'B' | 'C')[] = [];
    if (filters.teleporterCount >= 1) portalsToPlace.push('A');
    if (filters.teleporterCount >= 2) portalsToPlace.push('B');
    if (filters.teleporterCount >= 3) portalsToPlace.push('C');

    while (portalsToPlace.length > 0 && shuffledGlobalPool.length >= 2) {
      const portalType = portalsToPlace.pop()!;
      const pos1 = shuffledGlobalPool.pop()!;
      const pos2 = shuffledGlobalPool.pop()!;
      
      const r1 = generatedRooms.find(r => r.id === pos1.roomId)!;
      const r2 = generatedRooms.find(r => r.id === pos2.roomId)!;

      r1.grid[pos1.row][pos1.col] = `teleporter_in_${portalType}` as CellType;
      r2.grid[pos2.row][pos2.col] = `teleporter_out_${portalType}` as CellType;
    }

    // Populate Remaining Grid with Special Tiles based on densities
    const obstacleDensity = filters.obstacleCount !== undefined ? 0 : Math.max(0.02, filters.obstacleDensity - attemptId * 0.001);
    const iceDensity = filters.iceCount !== undefined ? 0 : filters.iceDensity;
    const conveyorDensity = filters.conveyorCount !== undefined ? 0 : filters.conveyorDensity;
    const trampolineDensity = filters.trampolineCount !== undefined ? 0 : filters.trampolineDensity;
    const forbiddenDensity = filters.forbiddenCount !== undefined ? 0 : filters.forbiddenDensity;
    const toggleDensity = filters.toggleCount !== undefined ? 0 : filters.toggleDensity;

    while (shuffledGlobalPool.length > 0) {
      const pos = shuffledGlobalPool.pop()!;
      const onMainPath = pathCellsByRoom[pos.roomId].has(`${pos.row},${pos.col}`);
      const room = generatedRooms.find(r => r.id === pos.roomId)!;

      const rand = Math.random();
      let cumulative = 0;

      // Obstacles
      if (!onMainPath && rand < (cumulative += obstacleDensity)) {
        room.grid[pos.row][pos.col] = 'obstacle';
        continue;
      }
      // Ice
      if (rand < (cumulative += iceDensity)) {
        room.grid[pos.row][pos.col] = 'ice';
        continue;
      }
      // Conveyors
      if (rand < (cumulative += conveyorDensity)) {
        const dirs: CellType[] = ['conveyor_up', 'conveyor_down', 'conveyor_left', 'conveyor_right'];
        room.grid[pos.row][pos.col] = dirs[randomInt(0, 3)];
        continue;
      }
      // Trampolines
      if (rand < (cumulative += trampolineDensity)) {
        const dirs: CellType[] = ['trampoline_up', 'trampoline_down', 'trampoline_left', 'trampoline_right'];
        room.grid[pos.row][pos.col] = dirs[randomInt(0, 3)];
        continue;
      }
      // Forbidden
      if (rand < (cumulative += forbiddenDensity)) {
        room.grid[pos.row][pos.col] = 'forbidden';
        continue;
      }
      // Toggles
      if (rand < (cumulative += toggleDensity)) {
        room.grid[pos.row][pos.col] = 'direction_toggle';
        continue;
      }
    }

    // conveyor and trampoline steps configuration
    const conveyorConfig: ConveyorCellConfig[] = [];
    const conveyorStepsVal = filters.conveyorSteps ?? [1];
    const trampolineConfig: TrampolineCellConfig[] = [];
    const trampolineStepsVal = filters.trampolineSteps ?? [3];

    generatedRooms.forEach((room) => {
      for (let r = 0; r < room.height; r++) {
        for (let c = 0; c < room.width; c++) {
          const cell = room.grid[r][c];
          if (cell && cell.startsWith('conveyor_')) {
            let steps = 1;
            if (Array.isArray(conveyorStepsVal)) {
              steps = conveyorStepsVal[randomInt(0, conveyorStepsVal.length - 1)];
            } else if (conveyorStepsVal === 'random') {
              steps = randomInt(1, 3);
            } else {
              steps = Number(conveyorStepsVal);
            }
            conveyorConfig.push({ position: { roomId: room.id, row: r, col: c }, steps });
          } else if (cell && cell.startsWith('trampoline_')) {
            let steps = 3;
            if (Array.isArray(trampolineStepsVal)) {
              steps = trampolineStepsVal[randomInt(0, trampolineStepsVal.length - 1)];
            } else if (trampolineStepsVal === 'random') {
              steps = randomInt(2, 4);
            } else {
              steps = Number(trampolineStepsVal);
            }
            trampolineConfig.push({ position: { roomId: room.id, row: r, col: c }, steps });
          }
        }
      }
    });

    const controlModeVal = filters.controlMode === 'random' 
      ? (Math.random() > 0.5 ? 'all_rooms' : 'selected_room') 
      : (filters.controlMode ?? 'all_rooms');

    const firstRoom = generatedRooms[0];

    return {
      id: (filters as any).id ?? randomInt(1000, 9999),
      name: (filters as any).name ?? `Procedural Level ${randomInt(1, 999)}`,
      width: firstRoom.width,
      height: firstRoom.height,
      edges: firstRoom.edges,
      grid: firstRoom.grid,
      rooms: generatedRooms,
      controlMode: controlModeVal,
      initialControlledRooms: generatedRooms.map(r => r.id),
      initialObjects,
      targets,
      trailCollision: getTrailCollision(),
      conveyorConfig: conveyorConfig.length > 0 ? conveyorConfig : undefined,
      trampolineConfig: trampolineConfig.length > 0 ? trampolineConfig : undefined,
    };
  }

  // LEGACY SINGLE-ROOM GENERATION PATH (Backward Compatible)
  let edges: LevelEdges;
  edges = {
    top: getEdgeForSide(filters.edgeTopAllowed, edgeBehavior),
    bottom: getEdgeForSide(filters.edgeBottomAllowed, edgeBehavior),
    left: getEdgeForSide(filters.edgeLeftAllowed, edgeBehavior),
    right: getEdgeForSide(filters.edgeRightAllowed, edgeBehavior),
  };

  // 2. Initialize Grid (Resize/Crop to target height/width if mutating)
  let grid: CellType[][];
  if (filters.originalGrid) {
    const resized: CellType[][] = [];
    for (let r = 0; r < height; r++) {
      const row: CellType[] = [];
      for (let c = 0; c < width; c++) {
        row.push(filters.originalGrid[r]?.[c] ?? 'empty');
      }
      resized.push(row);
    }
    grid = resized;
  } else {
    grid = Array.from({ length: height }, () => Array(width).fill('empty'));
  }

  // 3. Preserve or clear cells based on locks/mutation
  const allPositions: Position[] = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      allPositions.push({ row: r, col: c });
    }
  }

  const preservedCells = new Set<string>();
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (isLocked(r, c)) {
        preservedCells.add(`${r},${c}`);
      } else if (isMutating) {
        if (Math.random() >= mutationRate) {
          preservedCells.add(`${r},${c}`);
        } else {
          grid[r][c] = 'empty';
        }
      }
    }
  }

  const initialObjects: LevelObjectDef[] = [];
  const targets: LevelTargetDef[] = [];

  // Find remaining walkable positions that are NOT locked or preserved
  const availablePool = allPositions.filter((p) => !preservedCells.has(`${p.row},${p.col}`));
  let shuffledPositions = shuffleArray(availablePool);

  for (let i = 1; i <= actualPlayerCount; i++) {
    let pPos: Position | null = null;
    let tPos: Position | null = null;

    const origP = filters.originalObjects?.find((o) => o.id === i);
    const origT = filters.originalTargets?.find((t) => t.objectId === i);

    if (origP && origT && origP.position.row < height && origP.position.col < width && origT.position.row < height && origT.position.col < width) {
      const pLocked = isLocked(origP.position.row, origP.position.col);
      const tLocked = isLocked(origT.position.row, origT.position.col);
      if (pLocked || tLocked || Math.random() >= mutationRate) {
        pPos = origP.position;
        tPos = origT.position;
      }
    }

    if (!pPos) {
      shuffledPositions = shuffledPositions.filter(
        p => !initialObjects.some(o => posEqual(o.position, p)) && !targets.some(t => posEqual(t.position, p))
      );
      if (shuffledPositions.length > 0) {
        pPos = shuffledPositions.pop()!;
      } else if (origP) {
        pPos = origP.position;
      } else {
        pPos = { row: Math.floor((i - 1) / width) % height, col: (i - 1) % width };
      }
    }

    if (!tPos) {
      shuffledPositions = shuffledPositions.filter(
        p => !posEqual(p, pPos!) && !initialObjects.some(o => posEqual(o.position, p)) && !targets.some(t => posEqual(t.position, p))
      );
      let tIdx = shuffledPositions.findIndex((p) => manhattanDistance(p, pPos!) >= Math.min(3, width - 1));
      if (tIdx === -1) tIdx = 0;
      if (shuffledPositions.length > 0) {
        tPos = shuffledPositions.splice(tIdx, 1)[0];
      } else if (origT) {
        tPos = origT.position;
      } else {
        tPos = { row: height - 1 - (Math.floor((i - 1) / width) % height), col: width - 1 - ((i - 1) % width) };
      }
    }

    initialObjects.push({
      id: i,
      position: pPos,
      mode: getPlayerMode(),
      lockOnTarget: getPlayerLock(),
    });
    targets.push({
      objectId: i,
      position: tPos,
    });
    grid[tPos.row][tPos.col] = `target_${i}` as CellType;
  }

  // Helper set of preserved cells (start/end positions cannot be overridden)
  const reserved = new Set<string>();
  initialObjects.forEach((o) => reserved.add(`${o.position.row},${o.position.col}`));
  targets.forEach((t) => reserved.add(`${t.position.row},${t.position.col}`));
  preservedCells.forEach((c) => reserved.add(c));

  // 4. Carve Walkways (DFS Path) to Guarantee Basic Solvability
  const pathCells = new Set<string>();
  const carvePath = (start: Position, end: Position) => {
    let curr = { ...start };
    while (!posEqual(curr, end)) {
      pathCells.add(`${curr.row},${curr.col}`);
      const dRow = Math.sign(end.row - curr.row);
      const dCol = Math.sign(end.col - curr.col);

      if (dRow !== 0 && (dCol === 0 || Math.random() > 0.5)) {
        curr.row += dRow;
      } else if (dCol !== 0) {
        curr.col += dCol;
      }
    }
  };

  initialObjects.forEach((obj, idx) => {
    carvePath(obj.position, targets[idx].position);
  });

  // Filter out remaining grid positions
  const placementPool = shuffleArray(allPositions.filter((p) => !reserved.has(`${p.row},${p.col}`)));

  // Place exact count elements first
  const placeExactCount = (
    count: number | undefined,
    cellTypePicker: () => CellType,
    allowOnPath: boolean
  ) => {
    if (count === undefined || count <= 0) return;
    let placed = 0;
    for (let i = placementPool.length - 1; i >= 0; i--) {
      if (placed >= count) break;
      const pos = placementPool[i];
      const key = `${pos.row},${pos.col}`;
      const onMainPath = pathCells.has(key);

      if (!allowOnPath && onMainPath) {
        continue;
      }

      grid[pos.row][pos.col] = cellTypePicker();
      placementPool.splice(i, 1);
      placed++;
    }
  };

  // Place Obstacles (not allowed on path)
  if (filters.obstacleCount !== undefined) {
    placeExactCount(filters.obstacleCount, () => 'obstacle', false);
  }

  // Place Ice
  if (filters.iceCount !== undefined) {
    placeExactCount(filters.iceCount, () => 'ice', true);
  }

  // Place Conveyors
  if (filters.conveyorCount !== undefined) {
    const dirs: CellType[] = ['conveyor_up', 'conveyor_down', 'conveyor_left', 'conveyor_right'];
    placeExactCount(filters.conveyorCount, () => dirs[randomInt(0, 3)], true);
  }

  // Place Trampolines
  if (filters.trampolineCount !== undefined) {
    const dirs: CellType[] = ['trampoline_up', 'trampoline_down', 'trampoline_left', 'trampoline_right'];
    placeExactCount(filters.trampolineCount, () => dirs[randomInt(0, 3)], true);
  }

  // Place Forbidden
  if (filters.forbiddenCount !== undefined) {
    placeExactCount(filters.forbiddenCount, () => 'forbidden', true);
  }

  // Place Toggles
  if (filters.toggleCount !== undefined) {
    placeExactCount(filters.toggleCount, () => 'direction_toggle', true);
  }

  // Portals placement: pairs (A, B, C)
  const portalsToPlace: ('A' | 'B' | 'C')[] = [];
  if (filters.teleporterCount >= 1) portalsToPlace.push('A');
  if (filters.teleporterCount >= 2) portalsToPlace.push('B');
  if (filters.teleporterCount >= 3) portalsToPlace.push('C');

  while (portalsToPlace.length > 0 && placementPool.length >= 2) {
    const portalType = portalsToPlace.pop()!;
    const pos1 = placementPool.pop()!;
    const pos2 = placementPool.pop()!;
    grid[pos1.row][pos1.col] = `teleporter_in_${portalType}` as CellType;
    grid[pos2.row][pos2.col] = `teleporter_out_${portalType}` as CellType;
  }

  // 5. Populate Remaining Grid with Special Tiles (only if exact count is not specified)
  const obstacleDensity = filters.obstacleCount !== undefined ? 0 : Math.max(0.02, filters.obstacleDensity - attemptId * 0.001);
  const iceDensity = filters.iceCount !== undefined ? 0 : filters.iceDensity;
  const conveyorDensity = filters.conveyorCount !== undefined ? 0 : filters.conveyorDensity;
  const trampolineDensity = filters.trampolineCount !== undefined ? 0 : filters.trampolineDensity;
  const forbiddenDensity = filters.forbiddenCount !== undefined ? 0 : filters.forbiddenDensity;
  const toggleDensity = filters.toggleCount !== undefined ? 0 : filters.toggleDensity;

  while (placementPool.length > 0) {
    const pos = placementPool.pop()!;
    const key = `${pos.row},${pos.col}`;
    const onMainPath = pathCells.has(key);

    const rand = Math.random();
    let cumulative = 0;

    // Obstacles
    if (!onMainPath && rand < (cumulative += obstacleDensity)) {
      grid[pos.row][pos.col] = 'obstacle';
      continue;
    }

    // Ice
    if (rand < (cumulative += iceDensity)) {
      grid[pos.row][pos.col] = 'ice';
      continue;
    }

    // Conveyors
    if (rand < (cumulative += conveyorDensity)) {
      const dirs: CellType[] = ['conveyor_up', 'conveyor_down', 'conveyor_left', 'conveyor_right'];
      grid[pos.row][pos.col] = dirs[randomInt(0, 3)];
      continue;
    }

    // Trampolines
    if (rand < (cumulative += trampolineDensity)) {
      const dirs: CellType[] = ['trampoline_up', 'trampoline_down', 'trampoline_left', 'trampoline_right'];
      grid[pos.row][pos.col] = dirs[randomInt(0, 3)];
      continue;
    }

    // Forbidden
    if (rand < (cumulative += forbiddenDensity)) {
      grid[pos.row][pos.col] = 'forbidden';
      continue;
    }

    // Toggles
    if (rand < (cumulative += toggleDensity)) {
      grid[pos.row][pos.col] = 'direction_toggle';
      continue;
    }
  }

  // Generate conveyor and trampoline custom step configs
  const conveyorConfig: ConveyorCellConfig[] = [];
  const conveyorStepsVal = filters.conveyorSteps ?? [1];
  const trampolineConfig: TrampolineCellConfig[] = [];
  const trampolineStepsVal = filters.trampolineSteps ?? [3];

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const cell = grid[r][c];
      const posKey = `${r},${c}`;

      if (cell && cell.startsWith('conveyor_')) {
        const orig = filters.originalConveyorConfig?.find(cfg => cfg.position.row === r && cfg.position.col === c);
        if (orig && preservedCells.has(posKey)) {
          conveyorConfig.push(orig);
        } else {
          let steps = 1;
          if (Array.isArray(conveyorStepsVal)) {
            steps = conveyorStepsVal[randomInt(0, conveyorStepsVal.length - 1)];
          } else if (conveyorStepsVal === 'random') {
            steps = randomInt(1, 3);
          } else {
            steps = Number(conveyorStepsVal);
          }
          conveyorConfig.push({ position: { row: r, col: c }, steps });
        }
      } else if (cell && cell.startsWith('trampoline_')) {
        const orig = filters.originalTrampolineConfig?.find(cfg => cfg.position.row === r && cfg.position.col === c);
        if (orig && preservedCells.has(posKey)) {
          trampolineConfig.push(orig);
        } else {
          let steps = 3;
          if (Array.isArray(trampolineStepsVal)) {
            steps = trampolineStepsVal[randomInt(0, trampolineStepsVal.length - 1)];
          } else if (trampolineStepsVal === 'random') {
            steps = randomInt(2, 4);
          } else {
            steps = Number(trampolineStepsVal);
          }
          trampolineConfig.push({ position: { row: r, col: c }, steps });
        }
      }
    }
  }

  const initialBoxes = (filters.originalBoxes ?? []).filter(
    (b) => b.position.row < height && b.position.col < width
  );
  const conveyorPowerRequired = ((filters as any).conveyorPowerRequired ?? []).filter(
    (pos: Position) => pos.row < height && pos.col < width
  );

  return {
    id: (filters as any).id ?? randomInt(1000, 9999),
    name: (filters as any).name ?? `Procedural Level ${randomInt(1, 999)}`,
    width,
    height,
    edges,
    grid,
    initialObjects,
    targets,
    trailCollision: getTrailCollision(),
    initialBoxes: initialBoxes.length > 0 ? initialBoxes.map(b => ({ id: b.id, position: b.position, requiresPower: b.requiresPower })) : undefined,
    conveyorPowerRequired: conveyorPowerRequired.length > 0 ? conveyorPowerRequired : undefined,
    conveyorConfig: conveyorConfig.length > 0 ? conveyorConfig : undefined,
    trampolineConfig: trampolineConfig.length > 0 ? trampolineConfig : undefined,
  };
}

/**
 * Procedurally generates a premium puzzle level matching the desired filters.
 * Runs an intelligent Generate & Test loop: generates candidates, solves them using
 * the BFS solver, and yields the first level satisfying the difficulty bounds.
 *
 * @param filters Configuration settings including sizes, difficulty, and allowed tiles.
 * @returns The fully calibrated LevelData and the optimal solve path.
 */
export function generateProceduralLevel(filters: GeneratorFilters): {
  level: LevelData;
  solution: string[] | null;
  moveCount: number;
} {
  // Define difficulty ranges (shortest solution paths)
  const difficultyRanges: Record<1 | 2 | 3 | 4, { min: number; max: number }> = {
    1: { min: 2, max: 5 },
    2: { min: 6, max: 10 },
    3: { min: 11, max: 16 },
    4: { min: 17, max: 25 },
  };

  const range = difficultyRanges[filters.difficulty];

  let bestMatch: LevelData | null = null;
  let bestSolution: string[] | null = null;
  let bestDiffScore = Infinity;
  let bestMoveCount = 0;

  const maxAttempts = 150;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = buildCandidate(filters, attempt);

    // Solve candidate using BFS
    const maxSearchDepth = filters.difficulty === 4 ? 28 : 22;
    const solveResult = solvePuzzle(candidate, maxSearchDepth, 4000);

    if (solveResult.solvable && solveResult.solution) {
      const moves = solveResult.moveCount;

      // Check if moves fit inside the desired range
      if (moves >= range.min && moves <= range.max) {
        return {
          level: {
            ...candidate,
            difficulty: filters.difficulty,
          },
          solution: solveResult.solution,
          moveCount: moves,
        };
      }

      // Keep track of closest match
      let diffScore = 0;
      if (moves < range.min) diffScore = range.min - moves;
      else if (moves > range.max) diffScore = moves - range.max;

      if (diffScore < bestDiffScore) {
        bestDiffScore = diffScore;
        bestMatch = candidate;
        bestSolution = solveResult.solution;
        bestMoveCount = moves;
      }
    }
  }

  // Fallback to closest solvable match
  if (bestMatch && bestSolution) {
    return {
      level: {
        ...bestMatch,
        difficulty: filters.difficulty,
      },
      solution: bestSolution,
      moveCount: bestMoveCount,
    };
  }

  // Ultimate fallback
  const fallbackLevel = buildCandidate({
    ...filters,
    obstacleDensity: 0,
    iceDensity: 0.1,
    conveyorDensity: 0,
    trampolineDensity: 0,
    forbiddenDensity: 0,
    toggleDensity: 0,
    teleporterCount: 0
  }, 99);
  const fallbackSolve = solvePuzzle(fallbackLevel, 15, 2000);

  return {
    level: {
      ...fallbackLevel,
      difficulty: filters.difficulty,
    },
    solution: fallbackSolve.solution,
    moveCount: fallbackSolve.moveCount,
  };
}
