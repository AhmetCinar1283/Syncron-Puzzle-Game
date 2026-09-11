import { useCallback, useRef, useState } from 'react';
import type { LevelData, Position } from '@/game-engine/level-format';
import type { ToolType } from '../lib/editorConfig';
import type { SelectionRect } from './useGridOperations';

export interface GeneratedCandidate {
  level: LevelData;
  solution: string[] | null;
  moveCount: number;
}

/**
 * Transient editor UI state that is not part of the level document:
 * dialogs, test-play level, live-solver results, selection, generator
 * candidates. Plain state holders; the behavior lives in the other hooks.
 */
export function useEditorUiState() {
  const [optimalSolutionTrajectory, setOptimalSolutionTrajectory] = useState<{ player1: Position[]; player2: Position[] } | null>(null);

  // Selection & Generated Candidates
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [generatedCandidates, setGeneratedCandidates] = useState<GeneratedCandidate[]>([]);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number | null>(null);

  // UI
  const [testLevel, setTestLevel] = useState<LevelData | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [optimalSolution, setOptimalSolution] = useState<string[] | null>(null);
  const [optimalSolutionMoves, setOptimalSolutionMoves] = useState<number>(0);
  const [showSolutionPath, setShowSolutionPath] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savePosition, setSavePosition] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [submitNote, setSubmitNote] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [copied, setCopied] = useState(false);
  const [levelsDialogOpen, setLevelsDialogOpen] = useState(false);
  const [generatorDialogOpen, setGeneratorDialogOpen] = useState(false);
  const [aiAssistantDialogOpen, setAiAssistantDialogOpen] = useState(false);

  return {
    optimalSolutionTrajectory, setOptimalSolutionTrajectory,
    selection, setSelection,
    generatedCandidates, setGeneratedCandidates,
    activeCandidateIndex, setActiveCandidateIndex,
    testLevel, setTestLevel, testError, setTestError,
    optimalSolution, setOptimalSolution, optimalSolutionMoves, setOptimalSolutionMoves,
    showSolutionPath, setShowSolutionPath,
    saveDialogOpen, setSaveDialogOpen, savePosition, setSavePosition,
    saveSuccess, setSaveSuccess,
    submitDialogOpen, setSubmitDialogOpen, submitNote, setSubmitNote,
    submitStatus, setSubmitStatus, submitError, setSubmitError,
    copied, setCopied,
    levelsDialogOpen, setLevelsDialogOpen,
    generatorDialogOpen, setGeneratorDialogOpen,
    aiAssistantDialogOpen, setAiAssistantDialogOpen,
  };
}

export type EditorUiState = ReturnType<typeof useEditorUiState>;

/**
 * Active tool. `setActiveTool` remembers the previous "paint" tool so the
 * box-placement flow can restore it afterwards (`prevToolRef`).
 */
export function useEditorTool() {
  const [activeTool, _setActiveTool] = useState<ToolType>('obstacle');
  const prevToolRef = useRef<ToolType>('obstacle');
  const setActiveTool = useCallback((t: ToolType) => {
    _setActiveTool((prev) => {
      if (prev !== 'place_box' && !prev.startsWith('place_obj')) {
        prevToolRef.current = prev;
      }
      return t;
    });
  }, []);
  const paintMode = useRef<'paint' | 'erase'>('paint');

  return { activeTool, setActiveTool, prevToolRef, paintMode };
}

export type EditorTool = ReturnType<typeof useEditorTool>;
