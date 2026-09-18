/**
 * DOSYA AMACI: Güvenlik olay tiplerinin VERİ tablosu — hangi olay tipi var,
 * ne kadar ciddi ve istek parmak izi (IP/UA) toplanıyor mu.
 * Kod değil veri; tek doğruluk kaynağı burasıdır.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.2
 */

/**
 * Hassasiyet düzeyi = "bu olaya istek parmak izi (karma IP + UA) eklenir mi?"
 *
 * - `fingerprint`: saldırı/dolandırıcılık soruşturmasında ilişkilendirme gerekir.
 *   IP/UA YALNIZCA bu düzeydeki olaylara eklenir.
 * - `identity-only`: olay kayda değer ama kişisel veri eklemeye gerek yok.
 *   (Veri minimizasyonunun kaçış kapısı: yeni bir olay tipi "acaba?" ise buraya konur.)
 */
export type SecuritySensitivity = 'fingerprint' | 'identity-only';

/** Operatörün triyaj sırası — otomatik hiçbir şey tetiklemez (§4: karar insanda). */
export type SecuritySeverity = 'info' | 'warn' | 'critical';

export interface SecurityEventDefinition {
  sensitivity: SecuritySensitivity;
  severity: SecuritySeverity;
  /** Bu olayın neden var olduğunu operatöre anlatan tek cümle. */
  purpose: string;
}

/**
 * Olay kataloğu.
 *
 * Alternatifi neydi ve neden reddettim? Her çağrı yerinde serbest string
 *   (`recordSecurityEvent(db, 'auth.failed', ...)`) kullanmak. Reddedildi: yazım
 *   hatası sessizce yeni bir olay tipi yaratır, saklama/hassasiyet politikası
 *   olayın kendisiyle birlikte yaşamaz ve "hangi olaylarda IP tutuyoruz?"
 *   sorusunun KVKK'ya gösterilebilecek tek cevabı kalmazdı.
 * Yeni bir olay tipi eklenince bu dosya değişmek zorunda mı? EVET — ve bu
 *   bilinçlidir: burası zaten verinin kendisi. Değişmemesi gereken yerler
 *   `recordSecurityEvent.ts`, `securityEventStore.ts` ve admin okuma yoludur;
 *   onlarda hiçbir olay adı geçmez.
 * Değer eksik/null gelirse? Katalogda olmayan bir tip `isSecurityEventType` ile
 *   reddedilir; tip sistemi de derleme anında engeller.
 */
export const SECURITY_EVENTS = {
  /** Geçersiz/süresi geçmiş token ile istek — kimlik henüz yok. */
  'auth.failed': {
    sensitivity: 'fingerprint',
    severity: 'warn',
    purpose: 'Kimlik doğrulama başarısızlığı; token deneme saldırısının tek izi.',
  },
  /** Kimliği geçerli ama yetkisi olmayan çağıran (admin/moderatör reddi). */
  'auth.forbidden': {
    sensitivity: 'fingerprint',
    severity: 'critical',
    purpose: 'Yetkisiz hesabın admin yüzeyine erişim denemesi.',
  },
  /** `verifyMoves` doğrulamayı geçmedi — sunucuda reddedilen çözüm iddiası. */
  'solution.invalid': {
    sensitivity: 'fingerprint',
    severity: 'warn',
    purpose: 'Doğrulanamayan çözüm gönderimi; skor manipülasyonu denemesinin izi.',
  },
  /** Yasaklı hesabın istek denemesi. */
  'ban.blocked': {
    sensitivity: 'fingerprint',
    severity: 'warn',
    purpose: 'Yasaklı hesabın devam eden istekleri; ban kaçırma denemesinin izi.',
  },
  /** Hız limiti aşıldı (03'ten gelen middleware). */
  'ratelimit.exceeded': {
    sensitivity: 'fingerprint',
    severity: 'warn',
    purpose: 'Hız limiti aşımı; dağıtık kötüye kullanımın kaynak ilişkilendirmesi.',
  },
  /**
   * İstemci uzlaştırmasında doğrulanamayan iddia (02 Katman C).
   *
   * ÇAĞRI YERİ HENÜZ YOK: Katman C ertelendi (`.plans/yayin-hazirlik/notlar.md` §1),
   * uzlaştırma uç noktası mevcut değil. Tip burada tanımlıdır ki Katman C
   * uygulandığında yazma yolu hazır olsun; uydurma bir çağrı yeri EKLENMEDİ.
   */
  'reconcile.rejected': {
    sensitivity: 'fingerprint',
    severity: 'warn',
    purpose: 'İstemci uzlaştırma iddiası sunucu kanıtıyla çelişti (02 Katman C).',
  },
  /** Webhook imzası doğrulanamadı. */
  'webhook.invalid_signature': {
    sensitivity: 'fingerprint',
    severity: 'critical',
    purpose: 'İmzasız/sahte ödeme webhook denemesi.',
  },
  /** Çok satır etkileyen admin işlemi — meşru ama geri dönüşü pahalı. */
  'admin.destructive': {
    sensitivity: 'identity-only',
    severity: 'critical',
    purpose:
      'Yıkıcı admin işlemi. Çağıran zaten kimlikli ve yetkili olduğu için IP/UA EKLENMEZ; ' +
      'kim-ne-zaman sorusuna uid + zaman damgası yeter (veri minimizasyonu).',
  },
} as const satisfies Record<string, SecurityEventDefinition>;

export type SecurityEventType = keyof typeof SECURITY_EVENTS;

/** Katalogda tanımlı mı? (Dışarıdan gelen string'lerin tek kapısı.) */
export function isSecurityEventType(value: string): value is SecurityEventType {
  return Object.prototype.hasOwnProperty.call(SECURITY_EVENTS, value);
}

/** Bu olaya istek parmak izi (karma IP + UA) eklenir mi? */
export function collectsFingerprint(type: SecurityEventType): boolean {
  return SECURITY_EVENTS[type].sensitivity === 'fingerprint';
}

/** Katalogdaki tüm olay tipleri — testler ve admin filtreleri için. */
export const SECURITY_EVENT_TYPES = Object.keys(SECURITY_EVENTS) as SecurityEventType[];
