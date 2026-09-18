/**
 * DOSYA AMACI: "Bu yapılandırmayla yayın build'i alınabilir mi?" kararının SAF hâli.
 * Dosya okumaz, `process.env`'e bakmaz, ekrana yazmaz, çıkış kodu üretmez —
 * yalnızca verilen sözlükleri kural tablosuyla karşılaştırır. Bu sayede
 * `evaluateReleaseConfig.test.ts` gerçek bir build almadan tüm senaryoları dener.
 *
 * TASARIM NOTLARI
 * - Alternatif neydi? Doğrulamayı doğrudan `verify-release-config.mjs` içinde
 *   yapmak. Reddedildi: karar mantığı dosya sistemine bağlı kalırdı ve
 *   "eksik kimlik → hata / test kimliği → hata / gerçek kimlik → geçer"
 *   üçlüsünü test etmek mümkün olmazdı (görev §3.1 bunu şart koşuyor).
 * - Yeni platform/kimlik eklenince bu dosya değişmek zorunda mı? HAYIR.
 *   Burada hiçbir platform adı ve hiçbir değişken adı geçmez; hepsi
 *   `releaseConfigRules.mjs` verisinden gelir.
 * - Değer eksik/null gelirse? `values` sözlüğü hiç verilmemiş olabilir; boş
 *   nesne varsayılır ve her `required` kural "tanımlı değil" hatası üretir —
 *   yani eksik girdi SESSİZ GEÇMEZ, en gürültülü sonucu verir.
 */
import { COMMON_RULES, KNOWN_RELEASE_PLATFORMS, PLATFORM_RULES } from './releaseConfigRules.mjs';
import { isPlaceholderValue } from './placeholderIdentities.mjs';

/**
 * @typedef {object} ReleaseConfigIssue
 * @property {string} key      Sorunlu değişken/özellik adı.
 * @property {string} source   Nereden okunduğu (`env` | `androidLocalProperties`).
 * @property {'missing'|'placeholder'|'forbidden'} kind
 * @property {string} message  Kullanıcıya gösterilecek tam cümle.
 * @property {string} hint     Nasıl düzeltileceği.
 */

/**
 * @typedef {object} ReleaseConfigReport
 * @property {boolean} ok
 * @property {string} platform
 * @property {ReleaseConfigIssue[]} issues
 * @property {string[]} checkedKeys  Gerçekten bakılan anahtarlar (rapor için).
 */

const SOURCE_LABELS = {
  env: '.env.local / ortam değişkeni',
  androidLocalProperties: 'android/local.properties',
};

/** Boş/whitespace değeri "tanımsız" sayar — `admobConfig.ts` ile aynı kural. */
function readValue(bag, key) {
  const raw = bag?.[key];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

/**
 * Kuralın değerini, tanımlı tüm kaynaklardan öncelik sırasıyla çözer.
 * @returns {{value: string|null, key: string, source: string}}
 */
function resolveRuleValue(rule, bags) {
  const candidates = [{ key: rule.key, source: rule.source }, ...(rule.alternatives ?? [])];
  for (const candidate of candidates) {
    const value = readValue(bags[candidate.source], candidate.key);
    if (value !== null) return { ...candidate, value };
  }
  // Hiçbiri dolu değil: hata mesajı BİRİNCİL kaynağı gösterir (kullanıcıya
  // "nereye yazayım" sorusunun tek ve net cevabını vermek için).
  return { key: rule.key, source: rule.source, value: null };
}

/** Tek bir kuralı değerlendirir. Sorun yoksa `null` döner. */
function evaluateRule(rule, resolved) {
  const { value, key, source } = resolved;
  const label = SOURCE_LABELS[source] ?? source;

  if (rule.presence === 'absent') {
    if (value === null) return null;
    const rejected = (rule.rejectValues ?? []).map((v) => v.toLowerCase());
    // Liste boşsa "varlığı yeter"; doluysa yalnızca listedeki değerler engeller
    // (örn. `...USE_TEST_ADS=false` meşrudur, `=true` değildir).
    if (rejected.length > 0 && !rejected.includes(value.toLowerCase())) return null;
    return {
      key,
      source,
      kind: 'forbidden',
      message: `${key} yayın build'inde ayarlı olmamalı (şu an "${value}", kaynak: ${label}).`,
      hint: rule.hint,
    };
  }

  if (value === null) {
    if (rule.presence === 'optional') return null;
    return {
      key,
      source,
      kind: 'missing',
      message: `${key} tanımlı değil (${label}).`,
      hint: rule.hint,
    };
  }

  const rejected = (rule.rejectValues ?? []).map((v) => v.toLowerCase());
  if (rejected.includes(value.toLowerCase())) {
    return {
      key,
      source,
      kind: 'forbidden',
      message: `${key} yasaklı bir değere sahip: "${value}" (${label}).`,
      hint: rule.hint,
    };
  }

  if (!rule.allowPlaceholder && isPlaceholderValue(value)) {
    return {
      key,
      source,
      kind: 'placeholder',
      message: `${key} hâlâ bir TEST/ÖRNEK kimliği: "${value}" (${label}). Bu build gelir üretmez.`,
      hint: rule.hint,
    };
  }

  return null;
}

/**
 * @param {object} input
 * @param {string} input.platform
 * @param {Record<string, string|undefined>} [input.env]
 * @param {Record<string, string|undefined>} [input.androidLocalProperties]
 * @returns {ReleaseConfigReport}
 */
export function evaluateReleaseConfig({ platform, env, androidLocalProperties }) {
  const bags = {
    env: env ?? {},
    androidLocalProperties: androidLocalProperties ?? {},
  };

  if (!KNOWN_RELEASE_PLATFORMS.includes(platform)) {
    // Bilinmeyen platform SESSİZCE GEÇMEZ. Sessiz geçiş, yazım hatası olan bir
    // `release:*` script'inin hiçbir şey doğrulamadan yayına çıkması demekti.
    return {
      ok: false,
      platform,
      checkedKeys: [],
      issues: [
        {
          key: 'platform',
          source: 'env',
          kind: 'forbidden',
          message: `Bilinmeyen yayın platformu: "${platform}".`,
          hint: `Geçerli değerler: ${KNOWN_RELEASE_PLATFORMS.join(', ')}.`,
        },
      ],
    };
  }

  const rules = [...COMMON_RULES, ...PLATFORM_RULES[platform]];
  const issues = [];
  for (const rule of rules) {
    const issue = evaluateRule(rule, resolveRuleValue(rule, bags));
    if (issue) issues.push(issue);
  }

  return {
    ok: issues.length === 0,
    platform,
    checkedKeys: rules.map((rule) => rule.key),
    issues,
  };
}
