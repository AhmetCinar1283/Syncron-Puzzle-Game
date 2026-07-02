'use client';

import { AI_CURRICULUM, generateSystemInstructions } from './aiCurriculum';
import type { CurriculumLevel } from './aiCurriculum';

export interface PromptTemplatePreset {
  id: string;
  name: string;
  type: 'create' | 'improve';
  template: string;
}

const STORAGE_KEYS = {
  CURRICULUM: 'syncron_ai_curriculum',
  TEMPLATES: 'syncron_ai_templates',
  GAME_RULES: 'syncron_ai_game_rules',
};

export const DEFAULT_CREATE_TEMPLATE = `{{SYSTEM_INSTRUCTIONS}}

### YENİ SEVİYE TASARIM TALEBİ
Şu bilgilere ve kısıtlamalara sahip tamamen YENİ bir seviye tasarla:

- Seviye ID: {{LEVEL_ID}}
- Bölüm (Part): {{LEVEL_PART}}
- Seviye Adı: "{{LEVEL_NAME}}"
- Hedeflenen Zorluk Derecesi: {{LEVEL_DIFFICULTY}} (1: Kolay, 2: Orta, 3: Zor, 4: Çok Zor)
- Hedeflenen Hamle Sayısı: En az {{LEVEL_MOVES_MIN}}, en fazla {{LEVEL_MOVES_MAX}} hamle olmalı.
- Kullanılacak Yeni Mekanikler: {{LEVEL_MECHANICS}}
- Seviye Açıklaması: {{LEVEL_DESCRIPTION}}

### EK TASARIM TALİMATLARI:
{{LEVEL_DESIGN_INSTRUCTIONS}}

Önemli Kurallar:
1. Haritada kestirme yollar (shortcuts) olmamasına özen göster. Oyuncunun hedefe gitmek için mekanikleri tam olarak senin planladığın şekilde kullanması gereksin.
2. Sadece JSON formatında çıktı ver. Başka hiçbir şey yazma.`;

export const DEFAULT_IMPROVE_TEMPLATE = `{{SYSTEM_INSTRUCTIONS}}

### SEVİYE GELİŞTİRME TALEBİ
Aşağıda verilen mevcut seviyeyi incele ve talep edilen geliştirmelere/düzeltmelere göre harita tasarımını GÜNCELLE:

### MEVCUT SEVİYE JSON:
\`\`\`json
{{CURRENT_LEVEL_JSON}}
\`\`\`

### TALEP EDİLEN GELİŞTİRMELER / DÜZELTMELER:
{{IMPROVEMENT_NOTES}}

Önemli Kurallar:
1. Mevcut haritanın genel yapısını ve ruhunu koru ancak hatalı veya kestirme yolları engellemek için engellerin, konveyörlerin veya nesnelerin yerlerini kaydır/düzenle.
2. Sadece güncellenmiş yeni JSON formatında çıktı ver. Başka hiçbir şey yazma.`;

const DEFAULT_TEMPLATES: PromptTemplatePreset[] = [
  {
    id: 'default_create',
    name: 'Varsayılan Yeni Seviye Şablonu',
    type: 'create',
    template: DEFAULT_CREATE_TEMPLATE,
  },
  {
    id: 'default_improve',
    name: 'Varsayılan İyileştirme Şablonu',
    type: 'improve',
    template: DEFAULT_IMPROVE_TEMPLATE,
  },
];

export function getSavedCurriculum(): CurriculumLevel[] {
  if (typeof window === 'undefined') return AI_CURRICULUM;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRICULUM);
    if (!raw) return AI_CURRICULUM;
    return JSON.parse(raw) as CurriculumLevel[];
  } catch (e) {
    console.error('Error loading curriculum from local storage', e);
    return AI_CURRICULUM;
  }
}

export function saveCurriculum(levels: CurriculumLevel[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CURRICULUM, JSON.stringify(levels));
}

export function getSavedTemplates(): PromptTemplatePreset[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (!raw) return DEFAULT_TEMPLATES;
    return JSON.parse(raw) as PromptTemplatePreset[];
  } catch (e) {
    console.error('Error loading templates from local storage', e);
    return DEFAULT_TEMPLATES;
  }
}

export function saveTemplates(templates: PromptTemplatePreset[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
}

export function getSavedGameRules(): string {
  if (typeof window === 'undefined') return generateSystemInstructions();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GAME_RULES);
    if (!raw) return generateSystemInstructions();
    return raw;
  } catch (e) {
    console.error('Error loading game rules from local storage', e);
    return generateSystemInstructions();
  }
}

export function saveGameRules(rules: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.GAME_RULES, rules);
}

export function resetAllToDefaults() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CURRICULUM);
  localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
  localStorage.removeItem(STORAGE_KEYS.GAME_RULES);
}
