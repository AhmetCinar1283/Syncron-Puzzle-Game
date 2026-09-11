/**
 * DOSYA AMACI: Bir promise'i zaman aşımına bağlar. Reklam SDK çağrıları hiç
 * dönmezse (SDK asılırsa) oyunun kilitlenmemesi için `adService`'in tüm sağlayıcı
 * çağrılarını bununla sarması gerekir (bkz. 00-mimari-ilkeler.md §4).
 */
export class AdTimeoutError extends Error {
  constructor(label: string) {
    super(`[monetization] "${label}" zaman aşımına uğradı.`);
    this.name = 'AdTimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AdTimeoutError(label)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
