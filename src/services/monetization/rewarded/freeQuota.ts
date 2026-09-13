/**
 * DOSYA AMACI: Ödüllü aksiyonların ücretsiz kullanım sayaçlarının cihazdaki KOPYASI (aksiyon +
 * kapsam başına): yalnızca butonu doğru göstermek için. Asıl kota sunucuda uygulanır. localStorage erişilemezse (gizli sekme, portal
 * iframe kısıtı) bellek içi sayaca düşer; asla throw etmez.
 */
const STORAGE_PREFIX = 'rewarded_free_used';
const memoryFallback = new Map<string, number>();

function storageKey(actionId: string, scopeKey: string): string {
  return `${STORAGE_PREFIX}:${actionId}:${scopeKey}`;
}

export function getFreeUsed(actionId: string, scopeKey: string): number {
  const key = storageKey(actionId, scopeKey);
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return memoryFallback.get(key) ?? 0;
  }
}

export function incrementFreeUsed(actionId: string, scopeKey: string): void {
  const key = storageKey(actionId, scopeKey);
  const next = getFreeUsed(actionId, scopeKey) + 1;
  memoryFallback.set(key, next);
  try {
    window.localStorage.setItem(key, String(next));
  } catch {
    // Bellek içi sayaç yeterli.
  }
}

/** Sunucunun bildirdiği kullanım sayısıyla yerel sayacı eşitler (asıl kaynak sunucudur). */
export function setFreeUsed(actionId: string, scopeKey: string, used: number): void {
  const key = storageKey(actionId, scopeKey);
  const value = Math.max(0, Math.floor(used));
  memoryFallback.set(key, value);
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Bellek içi sayaç yeterli.
  }
}
