import { useEffect, useState } from 'react';
import type { EdgeBehavior } from '@/game-engine/level-format';
import { useEditorContext } from '../EditorContext';
import {
  EDGE_ALLOWED_KEY, applyFiltersToForm, buildGeneratorParams, defaultForm, modeChangePatch, toFilters,
  type DensityElement, type DensityMode, type GeneratorFiltersUI, type GeneratorForm, type StoredPreset,
} from '../lib/generatorFilters';
import type { GeneratedCandidate } from './useEditorUiState';

export type PresetSelection = number | 'default' | 'last_used';

/**
 * State + actions of the procedural generator modal: form, presets
 * (`generator_presets` / `generator_last_used` in localStorage), and the
 * 3-candidate generation run.
 */
export function useGeneratorForm() {
  const { grid, objects, boxes, conveyorConfig, trampolineConfig, lockedCells } = useEditorContext();

  const [form, setForm] = useState<GeneratorForm>(() => defaultForm(grid[0]?.length ?? 6, grid.length ?? 6));
  const update = (patch: Partial<GeneratorForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const [candidates, setCandidates] = useState<GeneratedCandidate[] | null>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);

  const [presets, setPresets] = useState<StoredPreset[]>([]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<PresetSelection>('default');
  const [newPresetName, setNewPresetName] = useState('');
  const [generating, setGenerating] = useState(false);

  const applyFilters = (f: GeneratorFiltersUI) => setForm((prev) => applyFiltersToForm(prev, f));

  const handleModeChange = (element: DensityElement, newMode: DensityMode) => {
    update(modeChangePatch(form, element, newMode));
  };

  const toggleConveyorStep = (val: number) => {
    const conveyorSteps = form.conveyorSteps;
    if (conveyorSteps.includes(val)) {
      if (conveyorSteps.length > 1) {
        update({ conveyorSteps: conveyorSteps.filter(x => x !== val) });
      }
    } else {
      update({ conveyorSteps: [...conveyorSteps, val].sort() });
    }
  };

  const toggleTrampolineStep = (val: number) => {
    const trampolineSteps = form.trampolineSteps;
    if (trampolineSteps.includes(val)) {
      if (trampolineSteps.length > 1) {
        update({ trampolineSteps: trampolineSteps.filter(x => x !== val) });
      }
    } else {
      update({ trampolineSteps: [...trampolineSteps, val].sort() });
    }
  };

  const toggleEdgeAllowed = (side: 'top' | 'bottom' | 'left' | 'right', behavior: EdgeBehavior | 'random') => {
    const key = EDGE_ALLOWED_KEY[side];
    const current = form[key];
    if (behavior === 'random') {
      if (current.includes('random')) {
        update({ [key]: ['wall'] });
      } else {
        update({ [key]: ['random'] });
      }
    } else {
      const filtered = current.filter((x) => x !== 'random');
      if (filtered.includes(behavior)) {
        if (filtered.length > 1) {
          update({ [key]: filtered.filter((x) => x !== behavior) });
        }
      } else {
        update({ [key]: [...filtered, behavior] });
      }
    }
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
          setForm((prev) => applyFiltersToForm(prev, parsed));
          setSelectedPresetIndex('last_used');
        } catch (e) { console.error(e); }
      }
    }
  }, []);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: StoredPreset = { name: newPresetName.trim(), filters: toFilters(form) };
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
    setForm(defaultForm());
  };

  const handlePresetSelect = (val: string) => {
    if (val === 'default') {
      setSelectedPresetIndex('default');
      setForm(defaultForm());
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
    const filters = toFilters(form);

    // Persist as last-used in localStorage
    localStorage.setItem('generator_last_used', JSON.stringify(filters));

    const snapshot = form;
    setTimeout(async () => {
      try {
        const { generateProceduralLevel } = await import('@/game-engine/solver/generator');
        const generatorFilters = buildGeneratorParams(snapshot, { grid, objects, boxes, conveyorConfig, trampolineConfig, lockedCells });

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

  return {
    form, update,
    candidates, setCandidates, selectedCandidateIndex, setSelectedCandidateIndex,
    presets, selectedPresetIndex, newPresetName, setNewPresetName, generating,
    handleModeChange, toggleConveyorStep, toggleTrampolineStep, toggleEdgeAllowed,
    handleSavePreset, handleDeletePreset, handlePresetSelect, handleGenerateClick,
  };
}

export type GeneratorFormApi = ReturnType<typeof useGeneratorForm>;
