/**
 * DOSYA AMACI: Geliştirme sırasında sahte sağlayıcının hangi senaryoyu (başarı,
 * no-fill, hata, zaman aşımı, kullanıcı kapattı) taklit edeceğini localStorage
 * üzerinden okur/yazar. `MonetizationDebugPanel` bu değeri değiştirir.
 */
export type MockScenario = 'success' | 'no-fill' | 'error' | 'timeout' | 'user-closed';

const STORAGE_KEY = 'monetization:mock:scenario';
const DEFAULT_SCENARIO: MockScenario = 'success';

const VALID_SCENARIOS: readonly MockScenario[] = [
  'success',
  'no-fill',
  'error',
  'timeout',
  'user-closed',
];

export function getMockScenario(): MockScenario {
  if (typeof window === 'undefined') return DEFAULT_SCENARIO;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && (VALID_SCENARIOS as readonly string[]).includes(raw)) {
      return raw as MockScenario;
    }
  } catch {
    // localStorage erişilemez olabilir (gizli sekme vb.) — varsayılana düş.
  }
  return DEFAULT_SCENARIO;
}

export function setMockScenario(scenario: MockScenario): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, scenario);
  } catch {
    // Yazılamadıysa sessizce yoksay — sadece dev aracı etkilenir.
  }
}
