/**
 * DOSYA AMACI: Ödüllü level atlama (05) için `/play` tarafı yapılandırması ve
 * "oyuncu takıldı mı" kararını veren saf fonksiyonlar (birim testli).
 *
 * Buradaki değerler yalnızca butonun NE ZAMAN öne çıkacağını belirler. Bağlayıcı
 * kurallar (bölüm sonu, açık atlama sınırı, reklam zorunluluğu) sunucudadır:
 * `syncron-worker/src/services/skipLevel/skipLevelPolicy.ts`.
 */

export interface SkipLevelUiConfig {
  /** Bu kadar başarısız deneme (yeniden başlatma + ölüm) sonrası buton görünür. */
  minFailedAttempts: number;
  /** Level'da bu kadar saniye geçirildikten sonra buton görünür (yeniden başlatmada sıfırlanmaz). */
  minSecondsInLevel: number;
  /**
   * Bölümün son level'ında buton gösterilsin mi. Sunucudaki
   * `SKIP_LEVEL_POLICY.allowChapterEnd` ile aynı tutulmalıdır (sunucu kapalıysa reddeder).
   */
  allowChapterEnd: boolean;
}

export const SKIP_LEVEL_UI_CONFIG: SkipLevelUiConfig = {
  minFailedAttempts: 3,
  minSecondsInLevel: 180,
  allowChapterEnd: false,
};

export interface StuckSignals {
  failedAttempts: number;
  /** Level'ın ilk yüklenmesinden beri geçen süre (ms). */
  elapsedMs: number;
}

/** Oyuncu takıldı sayılır mı: eşiklerden BİRİ yeterlidir. */
export function isPlayerStuck(signals: StuckSignals, config: SkipLevelUiConfig = SKIP_LEVEL_UI_CONFIG): boolean {
  return (
    signals.failedAttempts >= config.minFailedAttempts ||
    signals.elapsedMs >= config.minSecondsInLevel * 1000
  );
}

/** Süre eşiğine kalan ms (eşik geçildiyse 0). */
export function msUntilTimeThreshold(elapsedMs: number, config: SkipLevelUiConfig = SKIP_LEVEL_UI_CONFIG): number {
  return Math.max(0, config.minSecondsInLevel * 1000 - elapsedMs);
}

export interface SkipEligibility {
  /** Kampanya level'ı (Firestore id + bölüm id). Kullanıcı level'larında atlama yok. */
  isCampaignLevel: boolean;
  /** Worker yapılandırılmış mı (atlama sunucusuz sunulmaz). */
  serverConfigured: boolean;
  /** Level zaten gerçekten çözülmüş ya da atlanmış. */
  alreadyProgressed: boolean;
  isChapterEnd: boolean;
}

/** Level bu oyuncu için atlanabilir mi (takılma eşiğinden bağımsız). */
export function canOfferSkip(e: SkipEligibility, config: SkipLevelUiConfig = SKIP_LEVEL_UI_CONFIG): boolean {
  if (!e.isCampaignLevel || !e.serverConfigured || e.alreadyProgressed) return false;
  return !e.isChapterEnd || config.allowChapterEnd;
}
