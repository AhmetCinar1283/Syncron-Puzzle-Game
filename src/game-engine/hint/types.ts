/**
 * DOSYA AMACI: İpucunun istemcideki tipleri. İpucu SUNUCUDA hesaplanır
 * (syncron-worker/src/services/hint); istemci yalnızca teslim edilen sonucu
 * gösterir ve oyuncu ipucunu takip ettikçe ilerletir. Çözücüden habersizdir.
 */

/** Hamle geçmişindeki kodlar: yön tuşları ve oda değiştirme (features/play/lib/session.ts). */
export type HintMoveCode = 'u' | 'd' | 'l' | 'r' | 's';

/** Sunucunun teslim ettiği ipucu (worker `HintResult` ile aynı şekil). */
export interface ServerHint {
  /** Önce kaç kez "geri al" yapılmalı (0 = mevcut durumdan devam). */
  undoSteps: number;
  /** Önce baştan başlanmalı. */
  restart: boolean;
  /** O noktadan çözüme kalan en az adım. */
  stepsRemaining: number;
  /** O noktadan itibaren sonraki en fazla 5 adım. */
  moves: HintMoveCode[];
}

/** Ekranda gösterilen, oyuncu ipucunu takip ettikçe güncellenen ipucu. */
export interface ActiveHint {
  /** Şu an oyuncudan beklenen: baştan başla → geri al → gösterilen adımları oyna. */
  phase: 'restart' | 'undo' | 'moves';
  /** `undo` aşamasında kalan geri alma sayısı. */
  undoLeft: number;
  /** Gösterilen adımlar oynandıkça azalan, çözüme kalan adım sayısı. */
  stepsRemaining: number;
  /** Henüz oynanmamış gösterilen adımlar (ilki sıradaki). */
  moves: HintMoveCode[];
}
