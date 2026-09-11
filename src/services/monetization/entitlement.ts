/**
 * DOSYA AMACI: "Bu kullanıcı reklamsız mı?" sorusu için tek bağlantı noktası.
 * Gerçek kaynak (satın alma hakkı) 07 numaralı görevde bağlanır; o güne kadar
 * varsayılan yanıt her zaman "hayır"dır (reklamlar normal şekilde gösterilir).
 */
export type AdFreeSource = () => boolean;

let adFreeSource: AdFreeSource = () => false;

/** 07 numaralı görev, kullanıcının satın alma hakkını buradan bağlayacak. */
export function setAdFreeSource(source: AdFreeSource): void {
  adFreeSource = source;
}

/** Test/temizlik için: kayıtlı kaynağı varsayılana döndürür. */
export function resetAdFreeSource(): void {
  adFreeSource = () => false;
}

export function isAdFree(): boolean {
  try {
    return adFreeSource();
  } catch (err) {
    console.warn('[monetization] adFreeSource çağrısı başarısız, reklamsız değil kabul edildi:', err);
    return false;
  }
}
