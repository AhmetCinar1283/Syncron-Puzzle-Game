import { useEffect, useState } from 'react';
import { saveTemplates, type PromptTemplatePreset } from '../lib/aiConfigStore';
import type { AiConfigApi } from './useAiConfig';

/** "Templates" tab: edit/new/delete prompt templates (`default_*` ids are undeletable). */
export function useAiTemplateEditor(config: AiConfigApi) {
  const { templates, setTemplates } = config;

  const [tempEditId, setTempEditId] = useState<string>('');
  const [tempName, setTempName] = useState('');
  const [tempType, setTempType] = useState<'create' | 'improve'>('create');
  const [tempText, setTempText] = useState('');

  useEffect(() => {
    if (templates.length > 0) {
      const initialId = tempEditId || templates[0].id;
      const t = templates.find(item => item.id === initialId) || templates[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing: load selected template into the form (moved verbatim)
      setTempEditId(t.id);
      setTempName(t.name);
      setTempType(t.type);
      setTempText(t.template);
    }
  }, [tempEditId, templates]);

  const handleSaveTemplate = () => {
    if (!tempName.trim() || !tempText.trim()) {
      alert('Lütfen şablon adını ve içeriğini doldurun.');
      return;
    }

    const updated = [...templates];
    const index = updated.findIndex(t => t.id === tempEditId);

    const preset: PromptTemplatePreset = {
      id: tempEditId || `custom_${Date.now()}`,
      name: tempName,
      type: tempType,
      template: tempText,
    };

    if (index > -1 && tempEditId) {
      updated[index] = preset;
    } else {
      updated.push(preset);
    }

    setTemplates(updated);
    saveTemplates(updated);
    setTempEditId(preset.id);
    alert('Prompt şablonu kaydedildi.');
  };

  const handleNewTemplateClick = () => {
    setTempEditId('');
    setTempName('Yeni Özel Şablon');
    setTempType('create');
    setTempText('{{SYSTEM_INSTRUCTIONS}}\n\n### YENİ TASARIM TALEBİ\nSeviye ID: {{LEVEL_ID}}\n...');
  };

  const handleDeleteTemplate = (id: string) => {
    if (id.startsWith('default_')) {
      alert('Varsayılan şablonlar silinemez!');
      return;
    }
    if (!window.confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    setTempEditId(updated[0]?.id ?? '');
    alert('Şablon silindi.');
  };

  return {
    templates, tempEditId, setTempEditId, tempName, setTempName, tempType, setTempType, tempText, setTempText,
    handleSaveTemplate, handleNewTemplateClick, handleDeleteTemplate,
  };
}

export type AiTemplateEditorApi = ReturnType<typeof useAiTemplateEditor>;
