/**
 * DOSYA AMACI: Çok satır etkileyen yıkıcı/onarıcı admin işlemleri için "önce
 * say, sonra onayla" kapısı. Saf fonksiyondur: veritabanı, HTTP ve Hono bilmez.
 * bkz. .plans/yayin-hazirlik/02-veri-dayanikliligi.md §3.1
 */

export interface DestructiveGateInput {
  /** İşlem uygulanırsa etkilenecek satır sayısı — ÇAĞRIDAN ÖNCE ölçülmüş olmalı. */
  affectedRows: number;
  /**
   * İstemcinin ikinci adımda gönderdiği onay. Beklenen değer, ilk adımda
   * dönülen `affectedRows` sayısının aynısıdır.
   */
  confirm?: number | null;
}

export interface DestructiveGateAllowed {
  allowed: true;
  affectedRows: number;
}

export interface DestructiveGateBlocked {
  allowed: false;
  /** `confirmation-required`: hiç onay gelmedi. `confirmation-mismatch`: sayı tutmuyor. */
  reason: 'confirmation-required' | 'confirmation-mismatch';
  /** İstemcinin bir sonraki çağrıda `confirm` olarak göndermesi gereken sayı. */
  affectedRows: number;
  /** Mismatch durumunda istemcinin gönderdiği (artık geçersiz) sayı. */
  submitted: number | null;
}

export type DestructiveGateResult = DestructiveGateAllowed | DestructiveGateBlocked;

/**
 * İki adımlı onay kapısı.
 *
 * 1. adım — `confirm` yok  → `confirmation-required` + etkilenecek satır sayısı.
 * 2. adım — `confirm` = o sayı → izin verilir.
 *
 * Sayı, ilk adımdan beri değiştiyse (başka bir admin araya girdi, oyuncular
 * oynamaya devam etti) onay TUTMAZ ve işlem yeniden onaylanmak zorunda kalır.
 * Onayın "true" gibi bir bayrak değil de SAYI olmasının tek sebebi budur.
 *
 * Alternatifi neydi ve neden reddettim? `{ confirm: true }` bayrağı. Reddedildi:
 *   admin 3 satır silmeyi onaylarken 30.000 satır silmiş olabilir; bayrak bu
 *   farkı yakalayamaz. Ayrıca "yanlışlıkla true gönderme" riski yüksektir.
 * Yeni bir yıkıcı uç nokta eklenince bu dosya değişmek zorunda mı? Hayır —
 *   fonksiyon yalnızca iki sayı karşılaştırır, işin ne olduğunu bilmez.
 * Değer eksik/null gelirse? `confirm` undefined/null → 1. adım sayılır (izin
 *   verilmez). `affectedRows` 0 ise onaya gerek yoktur: yapılacak iş yoktur,
 *   işlem idempotent biçimde "başarılı ama etkisiz" geçer.
 */
export function evaluateDestructiveGate(input: DestructiveGateInput): DestructiveGateResult {
  const affectedRows = Number.isFinite(input.affectedRows) ? Math.max(0, Math.trunc(input.affectedRows)) : 0;

  if (affectedRows === 0) {
    return { allowed: true, affectedRows: 0 };
  }

  const confirm = input.confirm ?? null;
  if (confirm === null) {
    return { allowed: false, reason: 'confirmation-required', affectedRows, submitted: null };
  }

  if (confirm !== affectedRows) {
    return { allowed: false, reason: 'confirmation-mismatch', affectedRows, submitted: confirm };
  }

  return { allowed: true, affectedRows };
}
