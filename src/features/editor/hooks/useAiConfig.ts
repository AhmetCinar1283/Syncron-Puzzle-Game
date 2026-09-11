import { useEffect, useState } from 'react';
import { generateSystemInstructions } from '../lib/aiCurriculum';
import type { CurriculumLevel } from '../lib/aiCurriculum';
import {
  getSavedCurriculum, getSavedTemplates, getSavedGameRules, saveGameRules,
  resetAllToDefaults, type PromptTemplatePreset,
} from '../lib/aiConfigStore';

/**
 * AI assistant's persisted config (curriculum, prompt templates, game rules —
 * `syncron_ai_*` localStorage keys via aiConfigStore). Reloaded every time the
 * dialog opens. Owns the rules-tab handlers and the global "reset all".
 */
export function useAiConfig(open: boolean) {
  const [curriculum, setCurriculum] = useState<CurriculumLevel[]>([]);
  const [templates, setTemplates] = useState<PromptTemplatePreset[]>([]);
  const [gameRules, setGameRules] = useState('');

  // Initial load
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: reload persisted config on open (moved verbatim)
      setCurriculum(getSavedCurriculum());
      setTemplates(getSavedTemplates());
      setGameRules(getSavedGameRules());
    }
  }, [open]);

  const handleResetDefaults = () => {
    if (!window.confirm('Tüm müfredat, şablonlar ve oyun kuralları varsayılan fabrika ayarlarına sıfırlanacak! Emin misiniz?')) return;
    resetAllToDefaults();
    setCurriculum(getSavedCurriculum());
    setTemplates(getSavedTemplates());
    setGameRules(getSavedGameRules());
    alert('Tüm veriler başarıyla sıfırlandı.');
  };

  // --- Tab 4: Rules Editor Handlers ---
  const handleSaveRules = () => {
    if (!gameRules.trim()) {
      alert('Kurallar boş olamaz.');
      return;
    }
    saveGameRules(gameRules);
    alert('Oyun kuralları prompt referansı başarıyla güncellendi.');
  };

  const handleResetRulesDefault = () => {
    if (!window.confirm('Oyun kuralları sistem varsayılanlarına sıfırlanacaktır. Onaylıyor musunuz?')) return;
    const def = generateSystemInstructions();
    setGameRules(def);
    saveGameRules(def);
    alert('Kurallar varsayılana sıfırlandı.');
  };

  return {
    curriculum, setCurriculum, templates, setTemplates, gameRules, setGameRules,
    handleResetDefaults, handleSaveRules, handleResetRulesDefault,
  };
}

export type AiConfigApi = ReturnType<typeof useAiConfig>;
