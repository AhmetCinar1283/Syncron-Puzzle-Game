'use client';

import { useRef, type ComponentProps } from 'react';
import { PlayScreen } from '@/game-engine/components/PlayScreen';
import { convertToGame2State } from '@/game-engine/logic/converter';
import type { LevelData } from '@/game-engine/level-format';

type ConverterInput = Parameters<typeof convertToGame2State>[0];
type PlayLevelEdges = ComponentProps<typeof PlayScreen>['levelEdges'];

export interface PlayTestOverlayProps {
  testLevel: LevelData;
  setTestLevel: (l: LevelData | null) => void;
  solutionSteps?: string[] | null;
  /** Level test modunda kazanıldığında hamle kodlarıyla çağrılır (günlük bulmaca admin çözümü). */
  onSolved?: (level: LevelData, moves: string[]) => void;
}

const MOVE_CODE = { up: 'u', down: 'd', left: 'l', right: 'r', switch_room: 's' } as const;

/**
 * Tam ekran seviye test oynanış katmanı (Overlay).
 * Editör, Admin Level Parts ve diğer ekranlar tarafından test modunda oynamak için kullanılır.
 */
export default function PlayTestOverlay({
  testLevel,
  setTestLevel,
  solutionSteps = null,
  onSolved,
}: PlayTestOverlayProps) {
  const asStored = testLevel as unknown as ConverterInput;
  const movesRef = useRef<string[]>([]);

  return (
    <div
      className="ad-banner-inset"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: '#030712',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <PlayScreen
        key={testLevel.id}
        levelName={testLevel.name}
        initialEntities={convertToGame2State(asStored).entities}
        initialRooms={convertToGame2State(asStored).rooms}
        controlMode={convertToGame2State(asStored).controlMode}
        initialControlledRooms={convertToGame2State(asStored).initialControlledRooms}
        levelEdges={testLevel.edges as unknown as PlayLevelEdges}
        trailCollision={!!testLevel.trailCollision}
        onMoveExecuted={(direction) => {
          movesRef.current.push(MOVE_CODE[direction]);
        }}
        onUndoExecuted={() => {
          const history = movesRef.current;
          while (history.length > 0 && history[history.length - 1] === 's') history.pop();
          history.pop();
        }}
        isTestMode={true}
        solutionSteps={solutionSteps}
        onButtonPressed={(btn) => {
          if (btn === 'next_level') onSolved?.(testLevel, [...movesRef.current]);
          if (btn === 'menu' || btn === 'next_level') {
            setTestLevel(null);
          } else if (btn === 'restart') {
            const temp = testLevel;
            setTestLevel(null);
            setTimeout(() => setTestLevel(temp), 50);
          }
        }}
      />
    </div>
  );
}
