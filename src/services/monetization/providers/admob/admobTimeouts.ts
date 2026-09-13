/**
 * DOSYA AMACI: AdMob sağlayıcısının KENDİ iç zaman aşımı değerleri. Yalnızca
 * reklamın YÜKLENMESİ sınırlanır; reklam ekrana geldikten sonra kullanıcının
 * izleme süresi sınırlanmaz (bkz. admobInterstitial / admobRewarded).
 */

/** Reklam yükleme (prepare) için üst sınır — no-fill'de oyuncu beklemesin. */
export const ADMOB_LOAD_TIMEOUT_MS = 8000;
