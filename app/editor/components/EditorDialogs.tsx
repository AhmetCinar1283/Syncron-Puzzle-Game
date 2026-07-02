'use client';

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { StoredLevel } from '@/app/src/lib/db';
import type { EdgeBehavior, LevelData, CellType, Position, LevelTargetDef } from '@/app/src/games/types';
import { useEditorContext } from '../EditorContext';
import { Modal, NBtn, iStyle, Lbl } from './EditorUI';
import { DIFFICULTY_COLORS } from '../editorConfig';
import AiAssistantDialog from './AiAssistantDialog';
import { useT } from '@/app/src/contexts/LanguageContext';
import GameCell from '@/app/src/games/components/GameCell';
import { getPlayerColor } from '@/app/src/game2/components/playerColors';

export interface GeneratorFiltersUI {
  width: number;
  height: number;
  difficulty: 1 | 2 | 3 | 4;
  playerCount: number | string;
  edgeBehavior?: 'wall' | 'portal' | 'lava' | 'random'; // legacy
  edgeTopAllowed?: (EdgeBehavior | 'random')[];
  edgeBottomAllowed?: (EdgeBehavior | 'random')[];
  edgeLeftAllowed?: (EdgeBehavior | 'random')[];
  edgeRightAllowed?: (EdgeBehavior | 'random')[];
  conveyorSteps?: number[] | number | 'random';
  trampolineSteps?: number[] | number | 'random';
  playerMode: 'normal' | 'reversed' | 'random';
  playerLock: 'lock' | 'nolock' | 'random';
  trailCollision: 'yes' | 'no' | 'random';
  obstacleDensity: number;
  iceDensity: number;
  conveyorDensity: number;
  trampolineDensity: number;
  forbiddenDensity: number;
  toggleDensity: number;
  teleporterCount: number;
  mutationRate?: number;

  obstacleMode?: 'ratio' | 'count';
  obstacleCount?: number;
  iceMode?: 'ratio' | 'count';
  iceCount?: number;
  conveyorMode?: 'ratio' | 'count';
  conveyorCount?: number;
  trampolineMode?: 'ratio' | 'count';
  trampolineCount?: number;
  forbiddenMode?: 'ratio' | 'count';
  forbiddenCount?: number;
  toggleMode?: 'ratio' | 'count';
  toggleCount?: number;

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

interface EditorDialogsProps {
  // Save dialog
  saveDialogOpen: boolean;
  onSaveClose: () => void;
  savePosition: string;
  setSavePosition: (v: string) => void;
  savedLevels: (StoredLevel & { id: number })[];
  onSave: (pos?: string) => void;
  // Submit dialog
  submitDialogOpen: boolean;
  onSubmitClose: () => void;
  submitNote: string;
  setSubmitNote: (v: string) => void;
  submitError: string;
  submitStatus: string;
  savedRequestId: string | null;
  levelName: string;
  difficulty: 1 | 2 | 3 | 4;
  user: User | null;
  userTag: string | null;
  onSubmit: () => void;
  // Generator dialog
  generatorDialogOpen: boolean;
  onGeneratorClose: () => void;
  onGenerate: (
    level: LevelData,
    solution: string[] | null,
    moveCount: number,
    allCandidates?: { level: LevelData; solution: string[] | null; moveCount: number }[],
    selectedIndex?: number
  ) => void;
  // AI Assistant dialog
  aiAssistantDialogOpen: boolean;
  onAiAssistantClose: () => void;
}

interface StoredPreset {
  name: string;
  filters: GeneratorFiltersUI;
}

// Subcomponent: GeneratorModal
function GeneratorModal({
  onClose,
  onGenerate,
}: {
  onClose: () => void;
  onGenerate: (
    level: LevelData,
    solution: string[] | null,
    moveCount: number,
    allCandidates?: { level: LevelData; solution: string[] | null; moveCount: number }[],
    selectedIndex?: number
  ) => void;
}) {
  const { grid, objects, boxes, conveyorConfig, trampolineConfig, lockedCells } = useEditorContext();

  const [width, setWidth] = useState(grid[0]?.length ?? 6);
  const [height, setHeight] = useState(grid.length ?? 6);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4>(2);
  const [playerCount, setPlayerCount] = useState<number | string>(1);
  const [edgeTopAllowed, setEdgeTopAllowed] = useState<(EdgeBehavior | 'random')[]>(['wall']);
  const [edgeBottomAllowed, setEdgeBottomAllowed] = useState<(EdgeBehavior | 'random')[]>(['wall']);
  const [edgeLeftAllowed, setEdgeLeftAllowed] = useState<(EdgeBehavior | 'random')[]>(['wall']);
  const [edgeRightAllowed, setEdgeRightAllowed] = useState<(EdgeBehavior | 'random')[]>(['wall']);
  const [conveyorSteps, setConveyorSteps] = useState<number[]>([1]);
  const [trampolineSteps, setTrampolineSteps] = useState<number[]>([3]);
  const [playerMode, setPlayerMode] = useState<'normal' | 'reversed' | 'random'>('normal');
  const [playerLock, setPlayerLock] = useState<'lock' | 'nolock' | 'random'>('lock');
  const [trailCollision, setTrailCollision] = useState<'yes' | 'no' | 'random'>('no');
  const [obstacleDensity, setObstacleDensity] = useState(0.15);
  const [iceDensity, setIceDensity] = useState(0.15);
  const [conveyorDensity, setConveyorDensity] = useState(0.0);
  const [trampolineDensity, setTrampolineDensity] = useState(0.0);
  const [forbiddenDensity, setForbiddenDensity] = useState(0.0);
  const [toggleDensity, setToggleDensity] = useState(0.0);
  const [teleporterCount, setTeleporterCount] = useState(0);

  // Multi-room state variables
  const [numRooms, setNumRooms] = useState<number>(1);
  const [roomPlacementMode, setRoomPlacementMode] = useState<'grid' | 'random'>('grid');
  const [roomFogMode, setRoomFogMode] = useState<'all_light' | 'all_dark' | 'random'>('all_light');
  const [roomFogVisibility, setRoomFogVisibility] = useState<number | string>(1.5);
  const [roomFogPersist, setRoomFogPersist] = useState<'yes' | 'no' | 'random'>('yes');
  const [roomPortalConnection, setRoomPortalConnection] = useState<'connected' | 'disconnected' | 'random'>('connected');
  const [playerDistribution, setPlayerDistribution] = useState<'same_room' | 'random_rooms'>('same_room');
  const [controlModeSelect, setControlModeSelect] = useState<'all_rooms' | 'selected_room' | 'random'>('all_rooms');

  // Exact counts and modes
  const [obstacleMode, setObstacleMode] = useState<'ratio' | 'count'>('ratio');
  const [obstacleCount, setObstacleCount] = useState<number>(0);
  const [iceMode, setIceMode] = useState<'ratio' | 'count'>('ratio');
  const [iceCount, setIceCount] = useState<number>(0);
  const [conveyorMode, setConveyorMode] = useState<'ratio' | 'count'>('ratio');
  const [conveyorCount, setConveyorCount] = useState<number>(0);
  const [trampolineMode, setTrampolineMode] = useState<'ratio' | 'count'>('ratio');
  const [trampolineCount, setTrampolineCount] = useState<number>(0);
  const [forbiddenMode, setForbiddenMode] = useState<'ratio' | 'count'>('ratio');
  const [forbiddenCount, setForbiddenCount] = useState<number>(0);
  const [toggleMode, setToggleMode] = useState<'ratio' | 'count'>('ratio');
  const [toggleCount, setToggleCount] = useState<number>(0);

  // Conversion helpers
  const ratioToCount = (ratio: number, total: number): number => {
    return Math.round(ratio * total);
  };

  const countToRatio = (count: number, total: number, maxRatio: number): number => {
    const rawRatio = count / total;
    const roundedRatio = Math.round(rawRatio * 20) / 20;
    return Math.max(0, Math.min(maxRatio, roundedRatio));
  };

  const handleModeChange = (
    element: 'obstacle' | 'ice' | 'conveyor' | 'trampoline' | 'forbidden' | 'toggle',
    newMode: 'ratio' | 'count'
  ) => {
    const totalCells = width * height;
    if (element === 'obstacle') {
      setObstacleMode(newMode);
      if (newMode === 'count') {
        setObstacleCount(ratioToCount(obstacleDensity, totalCells));
      } else {
        setObstacleDensity(countToRatio(obstacleCount, totalCells, 0.50));
      }
    } else if (element === 'ice') {
      setIceMode(newMode);
      if (newMode === 'count') {
        setIceCount(ratioToCount(iceDensity, totalCells));
      } else {
        setIceDensity(countToRatio(iceCount, totalCells, 0.50));
      }
    } else if (element === 'conveyor') {
      setConveyorMode(newMode);
      if (newMode === 'count') {
        setConveyorCount(ratioToCount(conveyorDensity, totalCells));
      } else {
        setConveyorDensity(countToRatio(conveyorCount, totalCells, 0.30));
      }
    } else if (element === 'trampoline') {
      setTrampolineMode(newMode);
      if (newMode === 'count') {
        setTrampolineCount(ratioToCount(trampolineDensity, totalCells));
      } else {
        setTrampolineDensity(countToRatio(trampolineCount, totalCells, 0.20));
      }
    } else if (element === 'forbidden') {
      setForbiddenMode(newMode);
      if (newMode === 'count') {
        setForbiddenCount(ratioToCount(forbiddenDensity, totalCells));
      } else {
        setForbiddenDensity(countToRatio(forbiddenCount, totalCells, 0.30));
      }
    } else if (element === 'toggle') {
      setToggleMode(newMode);
      if (newMode === 'count') {
        setToggleCount(ratioToCount(toggleDensity, totalCells));
      } else {
        setToggleDensity(countToRatio(toggleCount, totalCells, 0.20));
      }
    }
  };

  // Enhancements
  const [mutationRate, setMutationRate] = useState(1.0);
  const [candidates, setCandidates] = useState<{ level: LevelData; solution: string[] | null; moveCount: number }[] | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);

  const [presets, setPresets] = useState<StoredPreset[]>([]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | 'default' | 'last_used'>('default');
  const [newPresetName, setNewPresetName] = useState('');
  const [generating, setGenerating] = useState(false);

  const toggleConveyorStep = (val: number) => {
    if (conveyorSteps.includes(val)) {
      if (conveyorSteps.length > 1) {
        setConveyorSteps(conveyorSteps.filter(x => x !== val));
      }
    } else {
      setConveyorSteps([...conveyorSteps, val].sort());
    }
  };

  const toggleTrampolineStep = (val: number) => {
    if (trampolineSteps.includes(val)) {
      if (trampolineSteps.length > 1) {
        setTrampolineSteps(trampolineSteps.filter(x => x !== val));
      }
    } else {
      setTrampolineSteps([...trampolineSteps, val].sort());
    }
  };

  const toggleEdgeAllowed = (side: 'top' | 'bottom' | 'left' | 'right', behavior: EdgeBehavior | 'random') => {
    const setters = {
      top: [edgeTopAllowed, setEdgeTopAllowed],
      bottom: [edgeBottomAllowed, setEdgeBottomAllowed],
      left: [edgeLeftAllowed, setEdgeLeftAllowed],
      right: [edgeRightAllowed, setEdgeRightAllowed],
    } as const;
    
    const [current, set] = setters[side];
    if (behavior === 'random') {
      if (current.includes('random')) {
        set(['wall']);
      } else {
        set(['random']);
      }
    } else {
      const filtered = current.filter((x) => x !== 'random');
      if (filtered.includes(behavior)) {
        if (filtered.length > 1) {
          set(filtered.filter((x) => x !== behavior));
        }
      } else {
        set([...filtered, behavior] as any);
      }
    }
  };

  const applyFilters = (f: GeneratorFiltersUI) => {
    if (f.width !== undefined) setWidth(f.width);
    if (f.height !== undefined) setHeight(f.height);
    if (f.difficulty !== undefined) setDifficulty(f.difficulty);
    if (f.playerCount !== undefined) setPlayerCount(f.playerCount);
    if (f.playerMode !== undefined) setPlayerMode(f.playerMode);
    if (f.playerLock !== undefined) setPlayerLock(f.playerLock);
    if (f.trailCollision !== undefined) setTrailCollision(f.trailCollision);
    if (f.obstacleDensity !== undefined) setObstacleDensity(f.obstacleDensity);
    if (f.iceDensity !== undefined) setIceDensity(f.iceDensity);
    if (f.conveyorDensity !== undefined) setConveyorDensity(f.conveyorDensity);
    if (f.trampolineDensity !== undefined) setTrampolineDensity(f.trampolineDensity);
    if (f.forbiddenDensity !== undefined) setForbiddenDensity(f.forbiddenDensity);
    if (f.toggleDensity !== undefined) setToggleDensity(f.toggleDensity);
    if (f.teleporterCount !== undefined) setTeleporterCount(f.teleporterCount);
    if (f.mutationRate !== undefined) setMutationRate(f.mutationRate);

    // Support legacy presets having legacy edgeBehavior
    if (f.edgeBehavior !== undefined) {
      const legacy = f.edgeBehavior;
      if (legacy === 'random') {
        const all: (EdgeBehavior | 'random')[] = ['wall', 'portal', 'lava'];
        setEdgeTopAllowed(all);
        setEdgeBottomAllowed(all);
        setEdgeLeftAllowed(all);
        setEdgeRightAllowed(all);
      } else {
        setEdgeTopAllowed([legacy as EdgeBehavior]);
        setEdgeBottomAllowed([legacy as EdgeBehavior]);
        setEdgeLeftAllowed([legacy as EdgeBehavior]);
        setEdgeRightAllowed([legacy as EdgeBehavior]);
      }
    }

    // New fields
    if (f.edgeTopAllowed !== undefined) setEdgeTopAllowed(f.edgeTopAllowed);
    if (f.edgeBottomAllowed !== undefined) setEdgeBottomAllowed(f.edgeBottomAllowed);
    if (f.edgeLeftAllowed !== undefined) setEdgeLeftAllowed(f.edgeLeftAllowed);
    if (f.edgeRightAllowed !== undefined) setEdgeRightAllowed(f.edgeRightAllowed);
    
    if (f.conveyorSteps !== undefined) {
      if (Array.isArray(f.conveyorSteps)) {
        setConveyorSteps(f.conveyorSteps);
      } else if (f.conveyorSteps === 'random') {
        setConveyorSteps([1, 2, 3]);
      } else {
        setConveyorSteps([Number(f.conveyorSteps)]);
      }
    }
    if (f.trampolineSteps !== undefined) {
      if (Array.isArray(f.trampolineSteps)) {
        setTrampolineSteps(f.trampolineSteps);
      } else if (f.trampolineSteps === 'random') {
        setTrampolineSteps([2, 3, 4]);
      } else {
        setTrampolineSteps([Number(f.trampolineSteps)]);
      }
    }

    // Exact count fields
    if (f.obstacleMode !== undefined) setObstacleMode(f.obstacleMode);
    if (f.obstacleCount !== undefined) setObstacleCount(f.obstacleCount);
    if (f.iceMode !== undefined) setIceMode(f.iceMode);
    if (f.iceCount !== undefined) setIceCount(f.iceCount);
    if (f.conveyorMode !== undefined) setConveyorMode(f.conveyorMode);
    if (f.conveyorCount !== undefined) setConveyorCount(f.conveyorCount);
    if (f.trampolineMode !== undefined) setTrampolineMode(f.trampolineMode);
    if (f.trampolineCount !== undefined) setTrampolineCount(f.trampolineCount);
    if (f.forbiddenMode !== undefined) setForbiddenMode(f.forbiddenMode);
    if (f.forbiddenCount !== undefined) setForbiddenCount(f.forbiddenCount);
    if (f.toggleMode !== undefined) setToggleMode(f.toggleMode);
    if (f.toggleCount !== undefined) setToggleCount(f.toggleCount);

    // Multi-room settings
    if (f.numRooms !== undefined) setNumRooms(f.numRooms);
    if (f.roomPlacementMode !== undefined) setRoomPlacementMode(f.roomPlacementMode);
    if (f.roomFogMode !== undefined) setRoomFogMode(f.roomFogMode);
    if (f.roomFogVisibility !== undefined) setRoomFogVisibility(f.roomFogVisibility);
    if (f.roomFogPersist !== undefined) setRoomFogPersist(f.roomFogPersist);
    if (f.roomPortalConnection !== undefined) setRoomPortalConnection(f.roomPortalConnection);
    if (f.playerDistribution !== undefined) setPlayerDistribution(f.playerDistribution);
    if (f.controlMode !== undefined) setControlModeSelect(f.controlMode);
  };

  // Load presets & last-used from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedPresets = localStorage.getItem('generator_presets');
      if (storedPresets) {
        try { setPresets(JSON.parse(storedPresets)); } catch (e) { console.error(e); }
      }
      const lastUsed = localStorage.getItem('generator_last_used');
      if (lastUsed) {
        try {
          const parsed = JSON.parse(lastUsed) as GeneratorFiltersUI;
          applyFilters(parsed);
          setSelectedPresetIndex('last_used');
        } catch (e) { console.error(e); }
      }
    }
  }, []);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: StoredPreset = {
      name: newPresetName.trim(),
      filters: {
        width, height, difficulty, playerCount,
        edgeTopAllowed, edgeBottomAllowed, edgeLeftAllowed, edgeRightAllowed,
        playerMode, playerLock, trailCollision,
        obstacleDensity, iceDensity, conveyorDensity, trampolineDensity,
        forbiddenDensity, toggleDensity, teleporterCount,
        conveyorSteps, trampolineSteps, mutationRate,
        obstacleMode, obstacleCount,
        iceMode, iceCount,
        conveyorMode, conveyorCount,
        trampolineMode, trampolineCount,
        forbiddenMode, forbiddenCount,
        toggleMode, toggleCount,
        numRooms, roomPlacementMode, roomFogMode, roomFogVisibility,
        roomFogPersist, roomPortalConnection, playerDistribution,
        controlMode: controlModeSelect
      }
    };
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('generator_presets', JSON.stringify(updated));
    setSelectedPresetIndex(updated.length - 1);
    setNewPresetName('');
  };

  const handleDeletePreset = () => {
    if (typeof selectedPresetIndex !== 'number') return;
    const updated = presets.filter((_, idx) => idx !== selectedPresetIndex);
    setPresets(updated);
    localStorage.setItem('generator_presets', JSON.stringify(updated));
    setSelectedPresetIndex('default');
    
    // Reset to defaults
    setWidth(6); setHeight(6); setDifficulty(2); setPlayerCount(1);
    setEdgeTopAllowed(['wall']);
    setEdgeBottomAllowed(['wall']);
    setEdgeLeftAllowed(['wall']);
    setEdgeRightAllowed(['wall']);
    setPlayerMode('normal'); setPlayerLock('lock');
    setTrailCollision('no'); setObstacleDensity(0.15); setIceDensity(0.15);
    setConveyorDensity(0); setTrampolineDensity(0); setForbiddenDensity(0);
    setToggleDensity(0); setTeleporterCount(0);
    setConveyorSteps([1]); setTrampolineSteps([3]);
    setMutationRate(1.0);
    setObstacleMode('ratio'); setObstacleCount(0);
    setIceMode('ratio'); setIceCount(0);
    setConveyorMode('ratio'); setConveyorCount(0);
    setTrampolineMode('ratio'); setTrampolineCount(0);
    setForbiddenMode('ratio'); setForbiddenCount(0);
    setToggleMode('ratio'); setToggleCount(0);
    setNumRooms(1);
    setRoomPlacementMode('grid');
    setRoomFogMode('all_light');
    setRoomFogVisibility(1.5);
    setRoomFogPersist('yes');
    setRoomPortalConnection('connected');
    setPlayerDistribution('same_room');
    setControlModeSelect('all_rooms');
  };

  const handlePresetSelect = (val: string) => {
    if (val === 'default') {
      setSelectedPresetIndex('default');
      setWidth(6); setHeight(6); setDifficulty(2); setPlayerCount(1);
      setEdgeTopAllowed(['wall']);
      setEdgeBottomAllowed(['wall']);
      setEdgeLeftAllowed(['wall']);
      setEdgeRightAllowed(['wall']);
      setPlayerMode('normal'); setPlayerLock('lock');
      setTrailCollision('no'); setObstacleDensity(0.15); setIceDensity(0.15);
      setConveyorDensity(0); setTrampolineDensity(0); setForbiddenDensity(0);
      setToggleDensity(0); setTeleporterCount(0);
      setConveyorSteps([1]); setTrampolineSteps([3]);
      setMutationRate(1.0);
      setObstacleMode('ratio'); setObstacleCount(0);
      setIceMode('ratio'); setIceCount(0);
      setConveyorMode('ratio'); setConveyorCount(0);
      setTrampolineMode('ratio'); setTrampolineCount(0);
      setForbiddenMode('ratio'); setForbiddenCount(0);
      setToggleMode('ratio'); setToggleCount(0);
      setNumRooms(1);
      setRoomPlacementMode('grid');
      setRoomFogMode('all_light');
      setRoomFogVisibility(1.5);
      setRoomFogPersist('yes');
      setRoomPortalConnection('connected');
      setPlayerDistribution('same_room');
      setControlModeSelect('all_rooms');
    } else if (val === 'last_used') {
      setSelectedPresetIndex('last_used');
      const lastUsed = localStorage.getItem('generator_last_used');
      if (lastUsed) {
        try { applyFilters(JSON.parse(lastUsed)); } catch (e) { console.error(e); }
      }
    } else {
      const idx = parseInt(val, 10);
      if (!isNaN(idx) && presets[idx]) {
        setSelectedPresetIndex(idx);
        applyFilters(presets[idx].filters);
      }
    }
  };

  const handleGenerateClick = () => {
    setGenerating(true);
    const filters: GeneratorFiltersUI = {
      width, height, difficulty, playerCount,
      edgeTopAllowed, edgeBottomAllowed, edgeLeftAllowed, edgeRightAllowed,
      playerMode, playerLock, trailCollision,
      obstacleDensity, iceDensity, conveyorDensity, trampolineDensity,
      forbiddenDensity, toggleDensity, teleporterCount,
      conveyorSteps, trampolineSteps, mutationRate,
      obstacleMode, obstacleCount,
      iceMode, iceCount,
      conveyorMode, conveyorCount,
      trampolineMode, trampolineCount,
      forbiddenMode, forbiddenCount,
      toggleMode, toggleCount,
      numRooms,
      roomPlacementMode,
      roomFogMode,
      roomFogVisibility,
      roomFogPersist,
      roomPortalConnection,
      playerDistribution,
      controlMode: controlModeSelect
    };
    
    // Persist as last-used in localStorage
    localStorage.setItem('generator_last_used', JSON.stringify(filters));

    setTimeout(async () => {
      try {
        const { generateProceduralLevel } = await import('@/app/src/games/logic/generator');

        // Extract targets from grid
        const originalTargets: LevelTargetDef[] = [];
        for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            const cell = grid[r]?.[c];
            if (cell && cell.startsWith('target_')) {
              const oId = parseInt(cell.substring('target_'.length), 10);
              if (!isNaN(oId)) {
                originalTargets.push({ objectId: oId, position: { row: r, col: c } });
              }
            }
          }
        }

        const generatorFilters = {
          width, height, difficulty, playerCount,
          edgeTopAllowed, edgeBottomAllowed, edgeLeftAllowed, edgeRightAllowed,
          playerMode, playerLock, trailCollision,
          
          obstacleDensity: obstacleMode === 'ratio' ? obstacleDensity : 0,
          obstacleCount: obstacleMode === 'count' ? obstacleCount : undefined,

          iceDensity: iceMode === 'ratio' ? iceDensity : 0,
          iceCount: iceMode === 'count' ? iceCount : undefined,

          conveyorDensity: conveyorMode === 'ratio' ? conveyorDensity : 0,
          conveyorCount: conveyorMode === 'count' ? conveyorCount : undefined,

          trampolineDensity: trampolineMode === 'ratio' ? trampolineDensity : 0,
          trampolineCount: trampolineMode === 'count' ? trampolineCount : undefined,

          forbiddenDensity: forbiddenMode === 'ratio' ? forbiddenDensity : 0,
          forbiddenCount: forbiddenMode === 'count' ? forbiddenCount : undefined,

          toggleDensity: toggleMode === 'ratio' ? toggleDensity : 0,
          toggleCount: toggleMode === 'count' ? toggleCount : undefined,

          teleporterCount,
          conveyorSteps, trampolineSteps,

          lockedCells,
          mutationRate,
          originalGrid: numRooms > 1 ? undefined : grid,
          originalObjects: numRooms > 1 ? undefined : objects.filter(o => o.row !== null).map(o => ({ id: o.id, position: { row: o.row!, col: o.col! }, mode: o.mode, lockOnTarget: o.lockOnTarget })),
          originalTargets: numRooms > 1 ? undefined : originalTargets,
          originalBoxes: numRooms > 1 ? undefined : boxes.filter(b => b.row !== null).map(b => ({ id: b.id, position: { row: b.row!, col: b.col! }, requiresPower: b.requiresPower })),
          originalConveyorConfig: numRooms > 1 ? undefined : conveyorConfig,
          originalTrampolineConfig: numRooms > 1 ? undefined : trampolineConfig,

          numRooms,
          roomPlacementMode,
          roomFogMode,
          roomFogVisibility,
          roomFogPersist,
          roomPortalConnection,
          playerDistribution,
          controlMode: controlModeSelect
        };

        const results = [];
        for (let i = 0; i < 3; i++) {
          results.push(generateProceduralLevel(generatorFilters));
        }
        setCandidates(results);
        setSelectedCandidateIndex(0);
      } catch (err) {
        console.error('Generation failed:', err);
      } finally {
        setGenerating(false);
      }
    }, 80);
  };

  const MiniPreview = ({ level }: { level: LevelData }) => {
    const isMultiRoom = level.rooms && level.rooms.length > 0;
    
    if (isMultiRoom) {
      const rooms = level.rooms!;
      const minX = Math.min(...rooms.map(r => r.x));
      const maxX = Math.max(...rooms.map(r => r.x));
      const minY = Math.min(...rooms.map(r => r.y));
      const maxY = Math.max(...rooms.map(r => r.y));
      const layoutCols = maxX - minX + 1;
      const layoutRows = maxY - minY + 1;

      // Keep cell size compact so multi-room preview fits card container (width ~110px max)
      const miniCellSize = Math.max(3, Math.min(8, Math.floor(65 / Math.max(level.width, level.height) / Math.max(layoutCols, layoutRows))));
      const roomGap = 3;
      const boardWidth = layoutCols * (level.width * miniCellSize) + (layoutCols - 1) * roomGap;
      const boardHeight = layoutRows * (level.height * miniCellSize) + (layoutRows - 1) * roomGap;

      return (
        <div style={{
          position: 'relative',
          width: boardWidth,
          height: boardHeight,
          background: '#040914',
          borderRadius: 4,
          alignSelf: 'center',
          boxSizing: 'content-box',
          minHeight: 50,
          minWidth: 50,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {rooms.map((room) => {
            const roomLeft = (room.x - minX) * (room.width * miniCellSize + roomGap);
            const roomTop = (room.y - minY) * (room.height * miniCellSize + roomGap);

            return (
              <div
                key={room.id}
                style={{
                  position: 'absolute',
                  left: roomLeft,
                  top: roomTop,
                  width: room.width * miniCellSize,
                  height: room.height * miniCellSize,
                  background: '#040914',
                  border: '1.2px solid rgba(0,196,255,0.2)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                {/* Cells Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${room.width}, ${miniCellSize}px)`,
                  gridTemplateRows: `repeat(${room.height}, ${miniCellSize}px)`,
                }}>
                  {room.grid.map((row: CellType[], r: number) =>
                    row.map((cell: CellType, c: number) => (
                      <GameCell key={`${r}-${c}`} cellType={cell} cellSize={miniCellSize} />
                    ))
                  )}
                </div>

                {/* Boxes */}
                {(level.initialBoxes || []).filter(b => (b.position.roomId ?? 'main') === room.id).map((box) => {
                  const pad = Math.round(miniCellSize * 0.1);
                  const size = miniCellSize - pad * 2;
                  const isPowered = false;
                  const isUnpowered = box.requiresPower && !isPowered;

                  return (
                    <div
                      key={`box-${box.id}`}
                      style={{
                        position: 'absolute',
                        top: box.position.row * miniCellSize + pad,
                        left: box.position.col * miniCellSize + pad,
                        width: size,
                        height: size,
                        borderRadius: 1,
                        background: isUnpowered ? 'rgba(30, 40, 55, 0.9)' : 'rgba(15, 23, 35, 0.95)',
                        border: `${Math.max(1, Math.round(miniCellSize * 0.06))}px solid ${isUnpowered ? 'rgba(71, 85, 105, 0.5)' : '#f97316'}`,
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    />
                  );
                })}

                {/* Players */}
                {level.initialObjects.filter(o => (o.position.roomId ?? 'main') === room.id).map((obj) => {
                  const pad = Math.round(miniCellSize * 0.12);
                  const size = miniCellSize - pad * 2;
                  const { hex: bg } = getPlayerColor(obj.id - 1);

                  return (
                    <div
                      key={`player-${obj.id}`}
                      style={{
                        position: 'absolute',
                        top: obj.position.row * miniCellSize + pad,
                        left: obj.position.col * miniCellSize + pad,
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        backgroundColor: bg,
                        zIndex: 10,
                        pointerEvents: 'none',
                        boxShadow: `0 0 ${Math.max(1, Math.round(miniCellSize * 0.2))}px ${bg}aa`,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      );
    }

    const miniCellSize = Math.max(12, Math.min(20, Math.floor(100 / Math.max(level.width, level.height))));
    const boardWidth = level.width * miniCellSize;
    const boardHeight = level.height * miniCellSize;

    return (
      <div style={{
        position: 'relative',
        width: boardWidth,
        height: boardHeight,
        background: '#040914',
        border: '1.5px solid rgba(0,196,255,0.25)',
        borderRadius: 4,
        overflow: 'hidden',
        boxSizing: 'content-box',
        alignSelf: 'center'
      }}>
        {/* Cells Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${level.width}, ${miniCellSize}px)`,
          gridTemplateRows: `repeat(${level.height}, ${miniCellSize}px)`,
        }}>
          {level.grid.map((row, r) =>
            row.map((cell, c) => (
              <GameCell key={`${r}-${c}`} cellType={cell} cellSize={miniCellSize} />
            ))
          )}
        </div>

        {/* Boxes */}
        {(level.initialBoxes || []).map((box) => {
          const pad = Math.round(miniCellSize * 0.1);
          const size = miniCellSize - pad * 2;
          const isPowered = false;
          const isUnpowered = box.requiresPower && !isPowered;

          return (
            <div
              key={`box-${box.id}`}
              style={{
                position: 'absolute',
                top: box.position.row * miniCellSize + pad,
                left: box.position.col * miniCellSize + pad,
                width: size,
                height: size,
                borderRadius: 2,
                background: isUnpowered ? 'rgba(30, 40, 55, 0.9)' : 'rgba(15, 23, 35, 0.95)',
                border: `${Math.max(1, Math.round(miniCellSize * 0.06))}px solid ${isUnpowered ? 'rgba(71, 85, 105, 0.5)' : '#f97316'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: size * 0.55, color: isUnpowered ? '#334155' : '#f97316', fontWeight: 'bold', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ▣
              </span>
            </div>
          );
        })}

        {/* Players */}
        {level.initialObjects.map((obj) => {
          const pad = Math.round(miniCellSize * 0.12);
          const size = miniCellSize - pad * 2;
          const { hex: bg } = getPlayerColor(obj.id - 1);
          const textColor = '#060d1a';

          return (
            <div
              key={`player-${obj.id}`}
              style={{
                position: 'absolute',
                top: obj.position.row * miniCellSize + pad,
                left: obj.position.col * miniCellSize + pad,
                width: size,
                height: size,
                borderRadius: '50%',
                backgroundColor: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none',
                boxShadow: `0 0 ${Math.max(2, Math.round(miniCellSize * 0.2))}px ${bg}aa`,
              }}
            >
              <span style={{ fontSize: size * 0.6, color: textColor, fontWeight: 'bold', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {obj.mode === 'reversed' ? '⬇' : '⬆'}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal onClose={generating ? () => {} : onClose}>
      <div style={{ width: 440, maxWidth: '90vw', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '85dvh' }}>
        <h3 style={{ margin: '0 0 14px', flexShrink: 0, fontSize: 14, fontWeight: 800, color: '#00c4ff', textShadow: '0 0 8px rgba(0,196,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Procedural Level Generator
        </h3>

        {generating ? (
          <div style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div className="spinner" style={{
              width: 36, height: 36, border: '3px solid rgba(0,196,255,0.1)', borderTop: '3px solid #00c4ff', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ fontSize: 11, color: '#00c4ff', letterSpacing: '0.06em' }}>GENERATING LEVELS...</span>
            <span style={{ fontSize: 9, color: '#475569' }}>Calibrating physics & searching solution paths</span>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}} />
          </div>
        ) : candidates ? (
          <>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                We have generated 3 different level candidates. Please select one to apply:
              </span>
              <div style={{ display: 'flex', gap: 10, padding: '10px 0', overflowX: 'auto', justifyContent: 'center' }}>
                {candidates.map((cand, idx) => {
                  const active = selectedCandidateIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedCandidateIndex(idx)}
                      style={{
                        flex: '0 0 130px',
                        border: `2px solid ${active ? '#00c4ff' : 'rgba(30,58,95,0.4)'}`,
                        borderRadius: 10,
                        padding: 10,
                        background: active ? 'rgba(0,196,255,0.08)' : 'rgba(6,13,26,0.5)',
                        boxShadow: active ? '0 0 15px rgba(0,196,255,0.2)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        transition: 'all 0.2s',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 'bold', color: active ? '#00c4ff' : '#64748b' }}>
                        Option {idx + 1}
                      </span>
                      <MiniPreview level={cand.level} />
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>
                        Moves: <strong style={{ color: '#00ff88' }}>{cand.moveCount}</strong>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div style={{ flexShrink: 0, display: 'flex', gap: 8, borderTop: '1px solid rgba(30,58,95,0.3)', paddingTop: 10 }}>
              <NBtn
                onClick={() => {
                  if (selectedCandidateIndex !== null && candidates[selectedCandidateIndex]) {
                    const sel = candidates[selectedCandidateIndex];
                    onGenerate(sel.level, sel.solution, sel.moveCount, candidates, selectedCandidateIndex);
                  }
                }}
                color="#00c4ff"
                active
                style={{ flex: 2, padding: '8px 20px', fontSize: 12, fontWeight: 700 }}
              >
                ✓ APPLY SELECTED
              </NBtn>
              <NBtn onClick={handleGenerateClick} style={{ flex: 1, padding: '8px 10px', fontSize: 11 }}>
                🔁 REGENERATE
              </NBtn>
              <NBtn onClick={() => setCandidates(null)} style={{ flex: 1, padding: '8px 10px', fontSize: 11 }}>
                ◀ BACK
              </NBtn>
            </div>
          </>
        ) : (
          <>
            {/* Scrollable contents */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
              
              {/* GROUP 1: METADATA & GENERAL SETTINGS */}
              <div style={{ background: '#040914', border: '1px solid rgba(30,58,95,0.3)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#00c4ff', textTransform: 'uppercase' }}>1. Metadata & General Settings</span>
                
                {/* Presets Management */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid rgba(30,58,95,0.15)', paddingBottom: 10 }}>
                  <Lbl style={{ fontSize: 8 }}>Preset Management</Lbl>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select 
                      value={selectedPresetIndex} 
                      onChange={(e) => handlePresetSelect(e.target.value)} 
                      style={{ ...iStyle, flex: 1, background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', height: 30, fontSize: 10 }}
                    >
                      <option value="default">Default Configuration</option>
                      <option value="last_used">Last Used Settings</option>
                      {presets.map((p, idx) => (
                        <option key={idx} value={idx}>{p.name}</option>
                      ))}
                    </select>
                    {typeof selectedPresetIndex === 'number' && (
                      <button 
                        onClick={handleDeletePreset} 
                        style={{ padding: '0 12px', fontSize: 11, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: 6, cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input
                      type="text" placeholder="Preset Name..."
                      value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)}
                      style={{ ...iStyle, flex: 1, height: 28, fontSize: 10 }}
                    />
                    <button
                      onClick={handleSavePreset}
                      disabled={!newPresetName.trim()}
                      style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, background: newPresetName.trim() ? 'rgba(0,196,255,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${newPresetName.trim() ? 'rgba(0,196,255,0.4)' : 'rgba(255,255,255,0.08)'}`, color: newPresetName.trim() ? '#00c4ff' : '#475569', borderRadius: 6, cursor: newPresetName.trim() ? 'pointer' : 'not-allowed' }}
                    >
                      Save Preset
                    </button>
                  </div>
                </div>

                {/* Grid Dimensions */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <Lbl>Width: {width}</Lbl>
                    <input type="range" min={3} max={12} value={width} onChange={(e) => setWidth(Number(e.target.value))} style={{ width: '100%', accentColor: '#00c4ff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Lbl>Height: {height}</Lbl>
                    <input type="range" min={3} max={12} value={height} onChange={(e) => setHeight(Number(e.target.value))} style={{ width: '100%', accentColor: '#00c4ff' }} />
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <Lbl>Difficulty</Lbl>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {([1, 2, 3, 4] as const).map((d) => {
                      const colors = { 1: '#00ff88', 2: '#00c4ff', 3: '#fbbf24', 4: '#ef4444' };
                      const labels = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Expert' };
                      return (
                        <NBtn key={d} onClick={() => setDifficulty(d)} active={difficulty === d} color={colors[d]} style={{ flex: 1, padding: '5px 1px', fontSize: 9 }}>
                          {labels[d]}
                        </NBtn>
                      );
                    })}
                  </div>
                </div>

                {/* Mutation Rate / Fine-Tuning */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Lbl style={{ margin: 0 }}>Mutation Rate (Fine-Tuning)</Lbl>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold' }}>{Math.round(mutationRate * 100)}%</span>
                  </div>
                  <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', lineHeight: 1.3 }}>
                    Lower rates preserve more cells from the current canvas grid.
                  </p>
                  <input
                    type="range" min={10} max={100} step={10}
                    value={mutationRate * 100}
                    onChange={(e) => setMutationRate(Number(e.target.value) / 100)}
                    style={{ width: '100%', accentColor: '#00c4ff' }}
                  />
                </div>
              </div>

              {/* GROUP 1.5: MULTIPLE ROOMS SETTINGS */}
              <div style={{ background: '#040914', border: '1px solid rgba(30,58,95,0.3)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#00c4ff', textTransform: 'uppercase' }}>1.5. Multiple Rooms Settings</span>
                
                {/* Number of Rooms */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Lbl style={{ margin: 0 }}>Room Count</Lbl>
                    <span style={{ fontSize: 10, color: '#00c4ff', fontWeight: 'bold' }}>{numRooms} {numRooms === 1 ? 'Room' : 'Rooms'}</span>
                  </div>
                  <input
                    type="range" min={1} max={4} step={1}
                    value={numRooms}
                    onChange={(e) => setNumRooms(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#00c4ff' }}
                  />
                </div>

                {numRooms > 1 && (
                  <>
                    {/* Room Placement & Portal Connections */}
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <Lbl>Placement Mode</Lbl>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {(['grid', 'random'] as const).map((mode) => (
                            <NBtn key={mode} onClick={() => setRoomPlacementMode(mode)} active={roomPlacementMode === mode} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                              {mode}
                            </NBtn>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Lbl>Portal Connections</Lbl>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {(['connected', 'disconnected', 'random'] as const).map((mode) => (
                            <NBtn key={mode} onClick={() => setRoomPortalConnection(mode)} active={roomPortalConnection === mode} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 7, textTransform: 'uppercase' }}>
                              {mode === 'disconnected' ? 'None' : mode}
                            </NBtn>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Player Distribution & Control Mode */}
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <Lbl>Player Distribution</Lbl>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {(['same_room', 'random_rooms'] as const).map((dist) => (
                            <NBtn key={dist} onClick={() => setPlayerDistribution(dist)} active={playerDistribution === dist} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                              {dist === 'same_room' ? 'Same' : 'Random'}
                            </NBtn>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Lbl>Movement Sync Mode</Lbl>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {(['all_rooms', 'selected_room', 'random'] as const).map((mode) => (
                            <NBtn key={mode} onClick={() => setControlModeSelect(mode)} active={controlModeSelect === mode} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 7, textTransform: 'uppercase' }}>
                              {mode === 'all_rooms' ? 'Sync' : mode === 'selected_room' ? 'Single' : 'Rand'}
                            </NBtn>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Fog of War Mode & Visibility Distance */}
                    <div style={{ display: 'flex', gap: 14 }}>
                      <div style={{ flex: 1 }}>
                        <Lbl>Fog of War Mode</Lbl>
                        <select
                          value={roomFogMode}
                          onChange={(e) => setRoomFogMode(e.target.value as any)}
                          style={{ ...iStyle, width: '100%', background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', height: 28, fontSize: 10 }}
                        >
                          <option value="all_light">All Light</option>
                          <option value="all_dark">All Dark</option>
                          <option value="random">Random Per Room</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Lbl>Visibility Distance</Lbl>
                        <select
                          value={roomFogVisibility}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRoomFogVisibility(isNaN(Number(val)) ? val : Number(val));
                          }}
                          style={{ ...iStyle, width: '100%', background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', height: 28, fontSize: 10 }}
                        >
                          <option value={1.0}>1.0 cells</option>
                          <option value={1.5}>1.5 cells (Default)</option>
                          <option value={2.0}>2.0 cells</option>
                          <option value={2.5}>2.5 cells</option>
                          <option value={3.0}>3.0 cells</option>
                          <option value="random">Random</option>
                        </select>
                      </div>
                    </div>

                    {/* Fog Persistence */}
                    <div>
                      <Lbl>Keep Revealed (Fog Persistence)</Lbl>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {(['yes', 'no', 'random'] as const).map((persist) => (
                          <NBtn key={persist} onClick={() => setRoomFogPersist(persist)} active={roomFogPersist === persist} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                            {persist === 'yes' ? 'Persistent' : persist === 'no' ? 'Temporary' : 'Random'}
                          </NBtn>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* GROUP 2: PLAYER & OBJECT SETTINGS */}
              <div style={{ background: '#040914', border: '1px solid rgba(30,58,95,0.3)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#00c4ff', textTransform: 'uppercase' }}>2. Player & Entity Settings</span>
                
                {/* Players Count Dropdown */}
                <div>
                  <Lbl>Player Count (Specific count or random range)</Lbl>
                  <select
                    value={playerCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!isNaN(Number(val))) {
                        setPlayerCount(Number(val));
                      } else {
                        setPlayerCount(val);
                      }
                    }}
                    style={{ ...iStyle, width: '100%', background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', height: 28, fontSize: 10 }}
                  >
                    <option value={1}>1 Player</option>
                    <option value={2}>2 Players</option>
                    <option value={3}>3 Players</option>
                    <option value={4}>4 Players</option>
                    <option value="1-2">Random 1-2 Players</option>
                    <option value="2-3">Random 2-3 Players</option>
                    <option value="2-4">Random 2-4 Players</option>
                    <option value="3-4">Random 3-4 Players</option>
                    <option value="1-4">Random 1-4 Players</option>
                  </select>
                </div>

                {/* Player Behaviors: Directions & Locks */}
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <Lbl>Player Movement Mode</Lbl>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {(['normal', 'reversed', 'random'] as const).map((mode) => (
                        <NBtn key={mode} onClick={() => setPlayerMode(mode)} active={playerMode === mode} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                          {mode === 'reversed' ? 'Rev' : mode}
                        </NBtn>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Lbl>Lock Target On Reach</Lbl>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {(['lock', 'nolock', 'random'] as const).map((lock) => (
                        <NBtn key={lock} onClick={() => setPlayerLock(lock)} active={playerLock === lock} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                          {lock === 'nolock' ? 'NoLock' : lock}
                        </NBtn>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Trail Collision Row */}
                <div>
                  <Lbl>Trail Collision</Lbl>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['yes', 'no', 'random'] as const).map((tc) => (
                      <NBtn key={tc} onClick={() => setTrailCollision(tc)} active={trailCollision === tc} color="#00c4ff" style={{ flex: 1, padding: '4px 2px', fontSize: 9, textTransform: 'capitalize' }}>
                        {tc}
                      </NBtn>
                    ))}
                  </div>
                </div>
              </div>

              {/* GROUP 3: CELL & ELEMENT SETTINGS */}
              <div style={{ background: '#040914', border: '1px solid rgba(30,58,95,0.3)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#00c4ff', textTransform: 'uppercase' }}>3. Cell & Element Settings</span>
                
                {/* Granular Edge Behaviors */}
                <div>
                  <Lbl style={{ marginBottom: 4 }}>Granular Edge Behaviors</Lbl>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#020617', padding: 8, borderRadius: 8, border: '1px solid rgba(30,58,95,0.2)' }}>
                    
                    {/* Top Edge */}
                    <div>
                      <Lbl style={{ margin: '0 0 3px', fontSize: 8 }}>Top Edge</Lbl>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {(['wall', 'portal', 'lava', 'random'] as const).map((b) => (
                          <NBtn
                            key={b}
                            onClick={() => toggleEdgeAllowed('top', b)}
                            active={edgeTopAllowed.includes(b)}
                            color={b === 'wall' ? '#00c4ff' : b === 'portal' ? '#a78bfa' : b === 'lava' ? '#ef4444' : '#f59e0b'}
                            style={{ flex: 1, padding: '4px 0', fontSize: 8 }}
                          >
                            {b === 'wall' ? 'Wall' : b === 'portal' ? 'Port' : b === 'lava' ? 'Lava' : 'Rand'}
                          </NBtn>
                        ))}
                      </div>
                    </div>

                    {/* Right Edge */}
                    <div>
                      <Lbl style={{ margin: '0 0 3px', fontSize: 8 }}>Right Edge</Lbl>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {(['wall', 'portal', 'lava', 'random'] as const).map((b) => (
                          <NBtn
                            key={b}
                            onClick={() => toggleEdgeAllowed('right', b)}
                            active={edgeRightAllowed.includes(b)}
                            color={b === 'wall' ? '#00c4ff' : b === 'portal' ? '#a78bfa' : b === 'lava' ? '#ef4444' : '#f59e0b'}
                            style={{ flex: 1, padding: '4px 0', fontSize: 8 }}
                          >
                            {b === 'wall' ? 'Wall' : b === 'portal' ? 'Port' : b === 'lava' ? 'Lava' : 'Rand'}
                          </NBtn>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Edge */}
                    <div>
                      <Lbl style={{ margin: '0 0 3px', fontSize: 8 }}>Bottom Edge</Lbl>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {(['wall', 'portal', 'lava', 'random'] as const).map((b) => (
                          <NBtn
                            key={b}
                            onClick={() => toggleEdgeAllowed('bottom', b)}
                            active={edgeBottomAllowed.includes(b)}
                            color={b === 'wall' ? '#00c4ff' : b === 'portal' ? '#a78bfa' : b === 'lava' ? '#ef4444' : '#f59e0b'}
                            style={{ flex: 1, padding: '4px 0', fontSize: 8 }}
                          >
                            {b === 'wall' ? 'Wall' : b === 'portal' ? 'Port' : b === 'lava' ? 'Lava' : 'Rand'}
                          </NBtn>
                        ))}
                      </div>
                    </div>

                    {/* Left Edge */}
                    <div>
                      <Lbl style={{ margin: '0 0 3px', fontSize: 8 }}>Left Edge</Lbl>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {(['wall', 'portal', 'lava', 'random'] as const).map((b) => (
                          <NBtn
                            key={b}
                            onClick={() => toggleEdgeAllowed('left', b)}
                            active={edgeLeftAllowed.includes(b)}
                            color={b === 'wall' ? '#00c4ff' : b === 'portal' ? '#a78bfa' : b === 'lava' ? '#ef4444' : '#f59e0b'}
                            style={{ flex: 1, padding: '4px 0', fontSize: 8 }}
                          >
                            {b === 'wall' ? 'Wall' : b === 'portal' ? 'Port' : b === 'lava' ? 'Lava' : 'Rand'}
                          </NBtn>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Granular Sliders for Densities/Exact Counts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(30,58,95,0.15)', paddingTop: 10 }}>
                  <Lbl style={{ margin: 0 }}>Special Element Densities & Ratios</Lbl>
                  
                  {/* helper to render sliders with toggle */}
                  {(Object.entries({
                    Obstacles: { key: 'obstacle', mode: obstacleMode, setMode: (m: any) => handleModeChange('obstacle', m), ratio: obstacleDensity, setRatio: setObstacleDensity, count: obstacleCount, setCount: setObstacleCount, maxRatio: 50 },
                    'Ice cells': { key: 'ice', mode: iceMode, setMode: (m: any) => handleModeChange('ice', m), ratio: iceDensity, setRatio: setIceDensity, count: iceCount, setCount: setIceCount, maxRatio: 50 },
                    Conveyors: { key: 'conveyor', mode: conveyorMode, setMode: (m: any) => handleModeChange('conveyor', m), ratio: conveyorDensity, setRatio: setConveyorDensity, count: conveyorCount, setCount: setConveyorCount, maxRatio: 30 },
                    Trampolines: { key: 'trampoline', mode: trampolineMode, setMode: (m: any) => handleModeChange('trampoline', m), ratio: trampolineDensity, setRatio: setTrampolineDensity, count: trampolineCount, setCount: setTrampolineCount, maxRatio: 20 },
                    'Forbidden tiles': { key: 'forbidden', mode: forbiddenMode, setMode: (m: any) => handleModeChange('forbidden', m), ratio: forbiddenDensity, setRatio: setForbiddenDensity, count: forbiddenCount, setCount: setForbiddenCount, maxRatio: 30 },
                    'Direction Toggles': { key: 'toggle', mode: toggleMode, setMode: (m: any) => handleModeChange('toggle', m), ratio: toggleDensity, setRatio: setToggleDensity, count: toggleCount, setCount: setToggleCount, maxRatio: 20 },
                  }) as any).map(([label, cfg]: any) => {
                    const maxCount = width * height;
                    const isActive = cfg.mode === 'ratio' ? cfg.ratio > 0 : cfg.count > 0;
                    return (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 9, color: '#94a3b8' }}>{label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {/* Toggle buttons for Ratio / Count */}
                            <div style={{ display: 'flex', background: '#020617', borderRadius: 4, padding: 1, border: '1px solid rgba(30,58,95,0.4)' }}>
                              {(['ratio', 'count'] as const).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => cfg.setMode(m)}
                                  style={{
                                    padding: '1px 5px',
                                    fontSize: 8,
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: 3,
                                    background: cfg.mode === m ? 'rgba(0,196,255,0.2)' : 'transparent',
                                    color: cfg.mode === m ? '#00c4ff' : '#475569',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    lineHeight: 1
                                  }}
                                >
                                  {m === 'ratio' ? '%' : '#'}
                                </button>
                              ))}
                            </div>
                            <span style={{ fontSize: 9, color: '#e2e8f0', minWidth: 28, textAlign: 'right', fontWeight: 'bold' }}>
                              {cfg.mode === 'ratio' ? `${Math.round(cfg.ratio * 100)}%` : `${cfg.count} pcs`}
                            </span>
                          </div>
                        </div>
                        
                        {cfg.mode === 'ratio' ? (
                          <input
                            type="range"
                            min={0}
                            max={cfg.maxRatio}
                            step={5}
                            value={cfg.ratio * 100}
                            onChange={(e) => cfg.setRatio(Number(e.target.value) / 100)}
                            style={{ width: '100%', accentColor: '#00c4ff' }}
                          />
                        ) : (
                          <input
                            type="range"
                            min={0}
                            max={maxCount}
                            step={1}
                            value={cfg.count}
                            onChange={(e) => cfg.setCount(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#00c4ff' }}
                          />
                        )}

                        {/* Conveyor steps expand dynamically */}
                        {cfg.key === 'conveyor' && isActive && (
                          <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid rgba(0,196,255,0.3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 8, color: '#00c4ff' }}>Conveyor Steps (Select multiple for random):</span>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {([1, 2, 3, 4, 5] as const).map((s) => {
                                const active = conveyorSteps.includes(s);
                                return (
                                  <NBtn key={s} onClick={() => toggleConveyorStep(s)} active={active} color="#00c4ff" style={{ flex: 1, padding: '3px 0', fontSize: 8 }}>
                                    {s}
                                  </NBtn>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Trampoline steps expand dynamically */}
                        {cfg.key === 'trampoline' && isActive && (
                          <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid rgba(0,196,255,0.3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 8, color: '#00c4ff' }}>Trampoline Steps (Select multiple for random):</span>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {([1, 2, 3, 4, 5] as const).map((s) => {
                                const active = trampolineSteps.includes(s);
                                return (
                                  <NBtn key={s} onClick={() => toggleTrampolineStep(s)} active={active} color="#00c4ff" style={{ flex: 1, padding: '3px 0', fontSize: 8 }}>
                                    {s}
                                  </NBtn>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Teleporter pairs slider (always count) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>
                      <span>Teleporter pairs (A, B, C)</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{teleporterCount} Pairs</span>
                    </div>
                    <input type="range" min={0} max={3} step={1} value={teleporterCount} onChange={(e) => setTeleporterCount(Number(e.target.value))} style={{ width: '100%', accentColor: '#00c4ff' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div style={{ flexShrink: 0, display: 'flex', gap: 8, borderTop: '1px solid rgba(30,58,95,0.3)', paddingTop: 10 }}>
              <NBtn onClick={handleGenerateClick} color="#00c4ff" active style={{ flex: 2, padding: '8px 20px', fontSize: 12, fontWeight: 700 }}>
                ⚡ GENERATE LEVEL
              </NBtn>
              <NBtn onClick={onClose} style={{ flex: 1, padding: '8px 16px', fontSize: 12 }}>
                CANCEL
              </NBtn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function EditorDialogs({
  saveDialogOpen, onSaveClose, savePosition, setSavePosition, savedLevels, onSave,
  submitDialogOpen, onSubmitClose, submitNote, setSubmitNote,
  submitError, submitStatus, savedRequestId, levelName, difficulty, user, userTag, onSubmit,
  generatorDialogOpen, onGeneratorClose, onGenerate,
  aiAssistantDialogOpen, onAiAssistantClose,
}: EditorDialogsProps) {
  const t = useT();
  return (
    <>
      {saveDialogOpen && (
        <Modal onClose={onSaveClose}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#00ff88', textShadow: '0 0 8px rgba(0,255,136,0.5)', letterSpacing: '0.06em' }}>{t('editor.dialog_save_title')}</h3>
          <p style={{ fontSize: 12, color: '#475569', margin: '0 0 14px' }}>{t('editor.dialog_save_instruction')}</p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
            <input
              type="number" min={1} placeholder={t('editor.dialog_save_last', { n: savedLevels.length + 1 })}
              value={savePosition} onChange={(e) => setSavePosition(e.target.value)}
              style={{ ...iStyle, width: 90 }}
              autoFocus
            />
            <span style={{ fontSize: 11, color: '#334155' }}>{t('editor.dialog_save_of', { n: savedLevels.length + 1 })}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <NBtn onClick={() => onSave(savePosition)} color="#00ff88" style={{ padding: '7px 20px', fontSize: 12 }}>{t('editor.dialog_save_btn')}</NBtn>
            <NBtn onClick={onSaveClose} style={{ padding: '7px 16px', fontSize: 12 }}>{t('common.cancel')}</NBtn>
          </div>
        </Modal>
      )}

      {submitDialogOpen && (
        <Modal onClose={onSubmitClose}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#a78bfa', letterSpacing: '0.06em', textShadow: '0 0 8px rgba(167,139,250,0.5)' }}>
            {savedRequestId ? t('editor.dialog_submit_update') : t('editor.dialog_submit_new')}
          </h3>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: 4 }}>{t('editor.dialog_level_name')}</span>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>{levelName || t('editor.dialog_unnamed')}</span>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: 4 }}>{t('editor.dialog_creator')}</span>
            <span style={{ fontSize: 13, color: '#a78bfa' }}>
              {userTag ?? user?.displayName ?? user?.email ?? 'Unknown'}
            </span>
          </div>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: 4 }}>{t('editor.dialog_difficulty')}</span>
            <span style={{ fontSize: 13, color: DIFFICULTY_COLORS[difficulty], fontWeight: 700 }}>
              {t(`difficulty.${difficulty}`)}
            </span>
          </div>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: 4 }}>{t('editor.dialog_note')}</span>
            <textarea
              value={submitNote} onChange={(e) => setSubmitNote(e.target.value)}
              placeholder={t('editor.dialog_note_placeholder')}
              style={{ width: 320, height: 60, background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', color: '#94a3b8', fontFamily: 'inherit', fontSize: 12, borderRadius: 6, padding: 8, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {submitError && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{submitError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <NBtn onClick={onSubmit} color="#a78bfa" active style={{ padding: '7px 20px', fontSize: 12 }}>
              {submitStatus || (savedRequestId ? t('editor.dialog_update_btn') : t('editor.dialog_submit_btn'))}
            </NBtn>
            <NBtn onClick={onSubmitClose} style={{ padding: '7px 16px', fontSize: 12 }}>{t('common.cancel')}</NBtn>
          </div>
          <p style={{ fontSize: 10, color: '#1e3a5f', margin: '10px 0 0', lineHeight: 1.5 }}>
            {savedRequestId ? t('editor.dialog_request_update_note') : t('editor.dialog_submit_note')}
          </p>
        </Modal>
      )}
      {generatorDialogOpen && (
        <GeneratorModal onClose={onGeneratorClose} onGenerate={onGenerate} />
      )}
      {aiAssistantDialogOpen && (
        <AiAssistantDialog open={aiAssistantDialogOpen} onClose={onAiAssistantClose} />
      )}
    </>
  );
}
