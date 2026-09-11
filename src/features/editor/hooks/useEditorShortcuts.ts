import { useEffect } from 'react';
import type { LevelData } from '@/game-engine/level-format';
import { useGamepad } from '@/hooks/useGamepad';

function isTypingInField(): boolean {
  const activeEl = document.activeElement;
  return !!(
    activeEl &&
    (activeEl.tagName === 'INPUT' ||
     activeEl.tagName === 'TEXTAREA' ||
     activeEl.tagName === 'SELECT')
  );
}

const MOVEMENT_KEYS = [
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'w', 'a', 's', 'd',
  'W', 'A', 'S', 'D'
];

/**
 * Global editor shortcuts: Ctrl/Cmd+Z undo, arrow/WASD or gamepad movement
 * starts test-play (ignored while typing in a form field or already testing).
 */
export function useEditorShortcuts(undo: () => void, testLevel: LevelData | null, handleTest: () => void) {
  // Ctrl+Z undo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  // Arrow keys/WASD movement trigger for Test Mode
  useEffect(() => {
    function handleMovementKeyDown(e: KeyboardEvent) {
      if (testLevel) return;
      if (isTypingInField()) return;

      if (MOVEMENT_KEYS.includes(e.key)) {
        e.preventDefault();
        handleTest();
      }
    }
    window.addEventListener('keydown', handleMovementKeyDown);
    return () => window.removeEventListener('keydown', handleMovementKeyDown);
  }, [testLevel, handleTest]);

  // Gamepad controls trigger for Test Mode
  useGamepad({
    onMove: () => {
      if (testLevel) return;
      if (isTypingInField()) return;
      handleTest();
    },
    enabled: !testLevel,
  });
}
