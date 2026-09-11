'use client';

import type { User } from 'firebase/auth';
import type { StoredLevel } from '@/services/db';
import type { LevelData } from '@/game-engine/level-format';
import type { GeneratedCandidate } from '../../hooks/useEditorUiState';
import AiAssistantDialog from '../ai/AiAssistantDialog';
import GeneratorModal from '../generator/GeneratorModal';
import SaveLevelDialog from './SaveLevelDialog';
import SubmitLevelDialog from './SubmitLevelDialog';

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
    allCandidates?: GeneratedCandidate[],
    selectedIndex?: number
  ) => void;
  // AI Assistant dialog
  aiAssistantDialogOpen: boolean;
  onAiAssistantClose: () => void;
}

/** Mounts the editor's modal dialogs (each lives in its own file); render order unchanged. */
export default function EditorDialogs({
  saveDialogOpen, onSaveClose, savePosition, setSavePosition, savedLevels, onSave,
  submitDialogOpen, onSubmitClose, submitNote, setSubmitNote,
  submitError, submitStatus, savedRequestId, levelName, difficulty, user, userTag, onSubmit,
  generatorDialogOpen, onGeneratorClose, onGenerate,
  aiAssistantDialogOpen, onAiAssistantClose,
}: EditorDialogsProps) {
  return (
    <>
      {saveDialogOpen && (
        <SaveLevelDialog
          onClose={onSaveClose}
          savePosition={savePosition} setSavePosition={setSavePosition}
          savedLevels={savedLevels} onSave={onSave}
        />
      )}

      {submitDialogOpen && (
        <SubmitLevelDialog
          onClose={onSubmitClose}
          submitNote={submitNote} setSubmitNote={setSubmitNote}
          submitError={submitError} submitStatus={submitStatus}
          savedRequestId={savedRequestId} levelName={levelName}
          difficulty={difficulty} user={user} userTag={userTag}
          onSubmit={onSubmit}
        />
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
