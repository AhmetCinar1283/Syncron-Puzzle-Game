import tr from './tr';
import en from './en';

// Desteklenen diller
export type Lang = 'tr' | 'en';

// Dil paketleri sözlüğü
const translations: Record<Lang, Record<string, string>> = { tr, en };

/** Tanımlı tüm dillerin listesi */
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
];

/**
 * Belirtilen dildeki anahtara ait çeviriyi döndürür.
 * İsteğe bağlı olarak `{name}`, `{n}` gibi değişkenleri (vars) yerleştirir (interpolation).
 */
export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const dict = translations[lang];
  // Anahtar bulunamazsa önce Türkçe'ye, o da yoksa anahtarın kendisine geri döner (fallback)
  let str = dict[key] ?? translations.tr[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

