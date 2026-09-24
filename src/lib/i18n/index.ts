import en from './en';
import tr from './tr';
import ptBR from './pt-BR';
import ru from './ru';
import es from './es';
import de from './de';
import fr from './fr';
import pl from './pl';

// Desteklenen diller
export type Lang = 'en' | 'tr' | 'pt-BR' | 'ru' | 'es' | 'de' | 'fr' | 'pl';

// Dil paketleri sözlüğü. Yönetici/editör arayüzü yalnızca en + tr'de çevrilidir;
// eksik anahtarlar İngilizce'ye düşer (bkz. `translate`).
const translations: Record<Lang, Record<string, string>> = {
  en,
  tr,
  'pt-BR': ptBR,
  ru,
  es,
  de,
  fr,
  pl,
};

/** Tanımlı tüm dillerin listesi (dil seçicideki sıra). `label` kısa kod, `name` ana dildeki ad. */
export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'tr', label: 'TR', name: 'Türkçe' },
  { code: 'pt-BR', label: 'PT', name: 'Português' },
  { code: 'ru', label: 'RU', name: 'Русский' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'pl', label: 'PL', name: 'Polski' },
];

/** Listedeki bir sonraki dil (sona gelince başa döner) — tek tuşlu dil değiştirici için. */
export function nextLang(current: Lang): Lang {
  const index = LANGS.findIndex((l) => l.code === current);
  return LANGS[(index + 1) % LANGS.length].code;
}

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
  // Anahtar bulunamazsa önce İngilizce'ye, o da yoksa anahtarın kendisine geri döner (fallback)
  let str = dict[key] ?? translations.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}
