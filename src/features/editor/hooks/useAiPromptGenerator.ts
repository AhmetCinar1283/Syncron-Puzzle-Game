import { useEffect, useMemo, useState } from 'react';
import { solvePuzzle } from '@/game-engine/solver/solver';
import type { LevelData } from '@/game-engine/level-format';
import { useEditorContext } from '../EditorContext';
import { buildCreateLevelPrompt, buildImproveLevelPrompt } from '../lib/aiCurriculum';
import { stripJsonCodeFence } from '../lib/aiAssistant';
import type { AiConfigApi } from './useAiConfig';

export interface AiValidationResult {
  status: 'idle' | 'success' | 'unsolvable' | 'error';
  moves?: number;
  solution?: string[];
  errorMsg?: string;
}

/**
 * "Prompt Generator" tab: compiles the create/improve prompt from the selected
 * template + curriculum level (or the level currently open in the editor),
 * validates pasted AI JSON with the solver, and imports it into the editor.
 */
export function useAiPromptGenerator(open: boolean, onClose: () => void, config: AiConfigApi) {
  const { generateLevelData, doImportLevelJson } = useEditorContext();
  const { curriculum, templates, gameRules } = config;

  const [selectedLevelId, setSelectedLevelId] = useState<number>(51);
  const [promptMode, setPromptMode] = useState<'create' | 'improve'>('create');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [improvementNotes, setImprovementNotes] = useState<string>(
    'Kestirme yolları engellemek için engeller ekle. Çözüm hamlesini artır.'
  );
  const [copied, setCopied] = useState(false);
  const [aiJsonInput, setAiJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<AiValidationResult>({ status: 'idle' });

  // Setup initial bindings
  useEffect(() => {
    if (curriculum.length > 0) {
      const exists = curriculum.some(l => l.id === selectedLevelId);
      if (!exists) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: fall back to first curriculum level (moved verbatim)
        setSelectedLevelId(curriculum[0].id);
      }
    }
  }, [curriculum, selectedLevelId]);

  // Sync templates selection
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => t.type === promptMode);
  }, [templates, promptMode]);

  useEffect(() => {
    if (filteredTemplates.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: select first template of the mode (moved verbatim)
      setSelectedTemplateId(filteredTemplates[0].id);
    } else {
      setSelectedTemplateId('');
    }
  }, [filteredTemplates]);

  // Load level meta for generator
  const selectedLevelMeta = useMemo(() => {
    return curriculum.find(l => l.id === selectedLevelId) || curriculum[0];
  }, [curriculum, selectedLevelId]);

  // JSON string of level open in editor
  const currentLevelJsonStr = useMemo(() => {
    if (!open) return '';
    const { level } = generateLevelData();
    if (!level) return '{}';
    return JSON.stringify(level, null, 2);
  }, [generateLevelData, open]);

  // Compile final prompt
  const compiledPrompt = useMemo(() => {
    const activeTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!activeTemplate) return 'Lütfen bir şablon seçin.';

    if (promptMode === 'create') {
      if (!selectedLevelMeta) return 'Lütfen müfredattan bir seviye seçin.';
      return buildCreateLevelPrompt(selectedLevelMeta, activeTemplate.template, gameRules);
    } else {
      return buildImproveLevelPrompt(currentLevelJsonStr, improvementNotes, activeTemplate.template, gameRules);
    }
  }, [promptMode, selectedLevelMeta, selectedTemplateId, templates, gameRules, currentLevelJsonStr, improvementNotes]);

  // Copy prompt to clipboard
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(compiledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run Solver to Validate AI JSON
  const handleVerifyJson = () => {
    if (!aiJsonInput.trim()) {
      setValidationResult({ status: 'error', errorMsg: 'Lütfen AI tarafından üretilen JSON verisini girin.' });
      return;
    }

    try {
      const cleanInput = stripJsonCodeFence(aiJsonInput.trim());
      const parsed = JSON.parse(cleanInput) as LevelData;

      if (!parsed.width || !parsed.height || !parsed.grid || !parsed.initialObjects) {
        setValidationResult({
          status: 'error',
          errorMsg: 'JSON geçerli ancak Syncron seviye yapısına uymuyor (width, height, grid veya initialObjects eksik).'
        });
        return;
      }

      const solveResult = solvePuzzle(parsed, 25, 4000);

      if (solveResult.solvable && solveResult.solution) {
        setValidationResult({
          status: 'success',
          moves: solveResult.moveCount,
          solution: solveResult.solution
        });
      } else {
        setValidationResult({
          status: 'unsolvable',
          errorMsg: 'Harita çözülebilir durumda değil! AI yolu bloke etmiş veya geçersiz hedefler eklemiş.'
        });
      }
    } catch (e) {
      setValidationResult({
        status: 'error',
        errorMsg: `JSON Hata: ${(e as Error).message}`
      });
    }
  };

  // Import Validated Level into Editor
  const handleImportToEditor = () => {
    let cleanInput = aiJsonInput.trim();
    if (!cleanInput) return;
    cleanInput = stripJsonCodeFence(cleanInput);

    try {
      const parsed = JSON.parse(cleanInput) as LevelData;
      if (!parsed.width || !parsed.height || !parsed.grid || !parsed.initialObjects) {
        alert('Seviye şeması geçersiz (width, height, grid veya initialObjects eksik).');
        return;
      }
    } catch (e) {
      alert(`Geçersiz JSON formatı: ${(e as Error).message}`);
      return;
    }

    const err = doImportLevelJson(cleanInput);
    if (err) {
      alert(`İçe aktarma başarısız: ${err}`);
    } else {
      onClose();
    }
  };

  return {
    curriculum,
    selectedLevelId, setSelectedLevelId, promptMode, setPromptMode,
    selectedTemplateId, setSelectedTemplateId, filteredTemplates, selectedLevelMeta,
    improvementNotes, setImprovementNotes, compiledPrompt, copied, handleCopyPrompt,
    aiJsonInput, setAiJsonInput, validationResult, handleVerifyJson, handleImportToEditor,
  };
}

export type AiPromptGeneratorApi = ReturnType<typeof useAiPromptGenerator>;
