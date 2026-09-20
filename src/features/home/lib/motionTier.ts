/**
 * DOSYA AMACI: Geriye dönük uyumluluk köprüsü.
 *
 * `motionTier` artık yalnızca ana menünün değil, oyun tahtasının da dekoratif
 * animasyon bütçesini belirliyor; bu yüzden `src/lib/motionTier.ts` altına
 * taşındı. Mevcut import'lar kırılmasın diye buradan yeniden dışa aktarılıyor.
 */

export { detectMotionTier, useMotionTier } from '@/lib/motionTier';
export type { MotionTier } from '@/lib/motionTier';
