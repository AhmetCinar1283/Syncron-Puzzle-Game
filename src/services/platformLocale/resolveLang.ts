/**
 * DOSYA AMACI: Platformların verdiği ham locale metnini ("pt-BR", "en_US", "TR")
 * uygulamanın desteklediği dil koduna çeviren SAF fonksiyon. Desteklenen dil
 * listesi parametre olarak gelir; yeni dil eklendiğinde bu dosya değişmez.
 */

/** "pt_br" / " PT-br " gibi girdileri "pt-br" biçimine indirger; geçersizse null. */
function normalizeTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const tag = raw.trim().replace(/_/g, '-').toLowerCase();
  return tag.length > 0 ? tag : null;
}

/**
 * Sıra: (1) tam eşleşme ("pt-br" → "pt-BR"), (2) ana dil eşleşmesi ("en-US" → "en"),
 * (3) desteklenen bir bölgesel kodun ana dili ("pt" → "pt-BR"). Hiçbiri yoksa `fallback`.
 */
export function resolveSupportedLang<L extends string>(
  raw: unknown,
  supported: readonly L[],
  fallback: L,
): L {
  const tag = normalizeTag(raw);
  if (!tag) return fallback;

  const exact = supported.find((code) => code.toLowerCase() === tag);
  if (exact) return exact;

  const primary = tag.split('-')[0];
  const primaryMatch = supported.find((code) => code.toLowerCase() === primary);
  if (primaryMatch) return primaryMatch;

  const regionalMatch = supported.find((code) => code.toLowerCase().split('-')[0] === primary);
  return regionalMatch ?? fallback;
}
