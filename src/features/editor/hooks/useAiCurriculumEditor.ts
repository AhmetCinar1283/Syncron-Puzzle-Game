import { useEffect, useState } from 'react';
import type { CurriculumLevel } from '../lib/aiCurriculum';
import { saveCurriculum } from '../lib/aiConfigStore';
import type { AiConfigApi } from './useAiConfig';

/** "Curriculum" tab: select/new/edit/delete curriculum levels (persisted via aiConfigStore). */
export function useAiCurriculumEditor(config: AiConfigApi) {
  const { curriculum, setCurriculum } = config;

  const [currEditId, setCurrEditId] = useState<number | 'new'>(51);
  const [currForm, setCurrForm] = useState<Partial<CurriculumLevel>>({});

  useEffect(() => {
    if (currEditId === 'new') {
      const nextId = curriculum.length > 0 ? Math.max(...curriculum.map(l => l.id)) + 1 : 51;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: derive edit form from selection (moved verbatim)
      setCurrForm({
        id: nextId,
        part: 3,
        name: 'Yeni Bölüm',
        difficulty: 2,
        targetMovesMin: 5,
        targetMovesMax: 10,
        mechanics: [],
        description: '',
        designInstructions: '',
      });
    } else {
      const level = curriculum.find(l => l.id === currEditId);
      if (level) {
        setCurrForm({ ...level });
      }
    }
  }, [currEditId, curriculum]);

  const handleSaveCurriculumLevel = () => {
    if (!currForm.id || !currForm.name) {
      alert('Lütfen Seviye ID ve Adını doldurun.');
      return;
    }

    const updatedList = [...curriculum];
    const index = updatedList.findIndex(l => l.id === currForm.id);

    if (currEditId === 'new') {
      if (curriculum.some(l => l.id === currForm.id)) {
        alert('Bu Seviye ID zaten mevcut!');
        return;
      }
      updatedList.push(currForm as CurriculumLevel);
    } else {
      if (index > -1) {
        updatedList[index] = currForm as CurriculumLevel;
      }
    }

    updatedList.sort((a, b) => a.id - b.id);
    setCurriculum(updatedList);
    saveCurriculum(updatedList);
    setCurrEditId(currForm.id);
    alert('Müfredat seviyesi başarıyla kaydedildi.');
  };

  const handleDeleteCurriculumLevel = (id: number) => {
    if (!window.confirm(`Level ${id} müfredattan kalıcı olarak silinecek. Emin misiniz?`)) return;
    const updatedList = curriculum.filter(l => l.id !== id);
    setCurriculum(updatedList);
    saveCurriculum(updatedList);
    if (currEditId === id) {
      setCurrEditId(updatedList[0]?.id ?? 'new');
    }
    alert('Seviye müfredattan silindi.');
  };

  // Toggle checklist item for mechanics
  const handleToggleMechanic = (mech: string) => {
    const list = currForm.mechanics || [];
    const newList = list.includes(mech) ? list.filter(m => m !== mech) : [...list, mech];
    setCurrForm({ ...currForm, mechanics: newList });
  };

  return {
    curriculum, currEditId, setCurrEditId, currForm, setCurrForm,
    handleSaveCurriculumLevel, handleDeleteCurriculumLevel, handleToggleMechanic,
    handleResetDefaults: config.handleResetDefaults,
  };
}

export type AiCurriculumEditorApi = ReturnType<typeof useAiCurriculumEditor>;
