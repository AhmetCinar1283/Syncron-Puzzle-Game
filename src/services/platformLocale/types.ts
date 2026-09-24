/**
 * DOSYA AMACI: Platform dil kaynağı sözleşmesi. Her platform SDK'sı kendi
 * adaptöründe bu şekle uyar; geri kalan kod hangi SDK'dan geldiğini bilmez.
 */

export interface PlatformLocaleSource {
  /**
   * Platformun bildirdiği ham locale'i döner (ör. "pt-BR"). Bilgi yoksa null.
   * Hata fırlatabilir; çağıran (`detectPlatformLanguage`) yakalayıp "en"e düşer.
   */
  getLocale(): Promise<string | null>;
}
