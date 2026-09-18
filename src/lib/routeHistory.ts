/**
 * DOSYA AMACI: Uygulama içinde ziyaret edilen sayfaların kısa geçmişini tutar.
 * Editör gibi "birden çok yerden girilebilen" sayfaların geri tuşunun sabit bir
 * menü yerine gerçekten gelinen sayfaya dönebilmesi için kullanılır.
 *
 * Geçmiş sessionStorage'a yazılır; böylece editörde sayfa yenilense bile
 * nereden gelindiği bilgisi kaybolmaz.
 */

const STORAGE_KEY = 'syncron:route-history';
const MAX_ENTRIES = 12;

let memoryHistory: string[] = [];
let hydrated = false;

/**
 * URL yollarını trailing-slash, arama parametreleri ve boşluklardan arındırıp normalize eder.
 * Örneğin: '/play/' -> '/play', '/play?id=2' -> '/play', '' -> '/'
 */
export function normalizePath(path: string | null | undefined): string {
  if (!path) return '/';
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

function readStorage(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

function writeStorage(history: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Özel sekme / kapalı depolama: bellek içi geçmiş yeterli.
  }
}

function ensureHydrated(): void {
  if (hydrated) return;
  hydrated = true;
  memoryHistory = readStorage();
}

/** Ziyaret edilen yolu geçmişe ekler (arka arkaya aynı yol tekrar yazılmaz). */
export function recordRouteVisit(path: string | null | undefined): void {
  ensureHydrated();
  const norm = normalizePath(path);
  if (memoryHistory[memoryHistory.length - 1] === norm) return;
  memoryHistory = [...memoryHistory, norm].slice(-MAX_ENTRIES);
  writeStorage(memoryHistory);
}

/**
 * Verilen sayfadan önce ziyaret edilen farklı sayfayı döndürür.
 * Aynı sayfanın tekrarları atlanır; kayıt yoksa null döner.
 */
export function getPreviousRoute(currentPath?: string | null): string | null {
  ensureHydrated();
  const current = normalizePath(currentPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/'));
  for (let i = memoryHistory.length - 1; i >= 0; i--) {
    const entry = memoryHistory[i];
    if (entry !== current) return entry;
  }
  return null;
}

/** Test yardımcıları — üretim kodunda kullanılmaz. */
export function __resetRouteHistory(): void {
  memoryHistory = [];
  hydrated = true;
  writeStorage(memoryHistory);
}
