/**
 * DOSYA AMACI: `.env*` ve Java `.properties` metinlerini sözlüğe çeviren SAF
 * ayrıştırıcılar. Dosyayı okuyan taraf `verify-release-config.mjs`'tir; burası
 * yalnızca string alır, nesne döner.
 *
 * TASARIM NOTLARI
 * - Alternatif neydi? `dotenv` paketini bağımlılık olarak eklemek. Reddedildi:
 *   yalnızca bir build script'i için üretim bağımlılık ağacını büyütmek pahalı;
 *   ayrıca Java `.properties` kaçış kuralları için yine ayrı kod gerekiyordu.
 * - Yeni bir kimlik türü eklenince bu dosya değişir mi? Hayır — biçim
 *   ayrıştırıcıdır, içerikten habersizdir.
 * - Değer eksik/null gelirse? `parseDotEnv(undefined)` boş nesne döner; dosyanın
 *   var olmaması ile boş olması aynı sonucu verir ve karar katmanı bunu "tanımlı
 *   değil" olarak raporlar.
 */

/** Satır sonu ve BOM farklarını normalize eder (Windows'ta CRLF yaygın). */
function toLines(text) {
  if (typeof text !== 'string') return [];
  return text.replace(/^﻿/, '').split(/\r?\n/);
}

/**
 * `.env` biçimi: `KEY=value`, `export KEY=value`, `#` yorum satırı, tek/çift
 * tırnaklı değerler. Değer içindeki `#` yorum sayılmaz (URL fragment'i olabilir).
 * @param {string|undefined|null} text
 * @returns {Record<string, string>}
 */
export function parseDotEnv(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of toLines(text)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eq = withoutExport.indexOf('=');
    if (eq <= 0) continue;
    const key = withoutExport.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(key)) continue;
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Java `.properties` biçimi. `key=value` ve `key:value` ayırıcılarını, `#`/`!`
 * yorumlarını ve ters bölü kaçışlarını (`\\` → `\`, `\:` → `:`) destekler.
 *
 * Kaçış çözümü önemli: `android/local.properties` içindeki yollar
 * `C\:\\Users\\...` biçimindedir; ham okunursa değer bozuk görünür.
 * @param {string|undefined|null} text
 * @returns {Record<string, string>}
 */
export function parseJavaProperties(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of toLines(text)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;

    let key = '';
    let rest = null;
    for (let i = 0; i < trimmed.length; i += 1) {
      const ch = trimmed[i];
      if (ch === '\\') {
        key += trimmed[i + 1] ?? '';
        i += 1;
        continue;
      }
      if (ch === '=' || ch === ':') {
        rest = trimmed.slice(i + 1);
        break;
      }
      key += ch;
    }
    if (rest === null) continue;
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    out[trimmedKey] = unescapeProperties(rest.trim());
  }
  return out;
}

/** `\\` → `\`, `\n`/`\t` → gerçek karakter, diğer `\x` → `x`. */
function unescapeProperties(value) {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = value[i + 1];
    i += 1;
    if (next === undefined) break;
    if (next === 'n') out += '\n';
    else if (next === 't') out += '\t';
    else if (next === 'r') out += '\r';
    else out += next;
  }
  return out;
}
