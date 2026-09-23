/**
 * DOSYA AMACI: Bu dosya, e-posta sahipliği doğrulama akışının istemci tarafındaki
 * yapılandırmasını (actionCodeSettings) ve yeniden gönderme kotasını (cooldown +
 * günlük sınır) yönetir.
 */

/**
 * `sendEmailVerification` için devam (continue) URL'i.
 *
 * `handleCodeInApp: false` BİLİNÇLİ: `true` yolu Firebase Dynamic Links'e
 * (android/ios paket yapılandırması ile) dayanıyordu ve Dynamic Links
 * Ağustos 2025'te kapatıldı. `false` ile link, projenin authDomain'indeki
 * Firebase barındırmalı `/__/auth/action` işleyicisinde açılır, `oobCode`
 * sunucu tarafında uygulanır ve kullanıcıya buradaki URL'e dönen bir
 * "Devam" butonu sunulur.
 *
 * Bu yüzden hedef sayfanın (`/auth/verified`) hiçbir işi yoktur —
 * yalnızca "doğrulandı, uygulamaya dön" der.
 *
 * NOT: URL'in host'u Firebase Console → Authentication → Settings →
 * Authorized domains listesinde OLMAK ZORUNDA.
 */
export function getActionCodeSettings() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return {
    url: `${base}/auth/verified`,
    handleCodeInApp: false,
  };
}

// ─── Yeniden gönderme kotası ──────────────────────────────────────────────────
//
// Firebase Auth'un e-posta gönderimi proje başına hız limitlidir. Tek bir
// kullanıcının butona basması diğer herkesin (şifre sıfırlama dahil) günlük
// bütçesini tüketebilir, bu yüzden istemcide de frenliyoruz. Bu bir güvenlik
// sınırı DEĞİL, kota koruması — gerçek sınır sunucu tarafında zaten var
// (auth/too-many-requests).

const COOLDOWN_MS = 60_000;
const DAILY_MAX = 5;

interface SentRecord {
  /** Son gönderimin epoch ms değeri */
  last: number;
  /** `day` içindeki gönderim sayısı */
  count: number;
  /** YYYY-MM-DD — gün değişince count sıfırlanır */
  day: string;
}

/**
 * Kota anahtarı. `subject` oturumluyken uid, oturumsuz bekleyişte (kayıt
 * sonrası signOut edilmiş kullanıcı) e-posta adresidir — o anda uid elimizde
 * olmaz. İkisi de aynı kişiyi temsil ettiği için kota tek yerde tutulur.
 */
function storageKey(subject: string): string {
  return `verify_sent:${subject}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readRecord(subject: string): SentRecord | null {
  try {
    const raw = localStorage.getItem(storageKey(subject));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SentRecord;
    if (typeof parsed?.last !== 'number') return null;
    // Gün değiştiyse sayaç geçersiz
    if (parsed.day !== today()) return { ...parsed, count: 0, day: today() };
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Yeniden göndermeye kaç ms kaldığını döner; hazırsa 0.
 * Günlük sınır dolmuşsa `Infinity` döner (buton kalıcı olarak kapalı kalır).
 */
export function verificationCooldownRemaining(subject: string): number {
  const rec = readRecord(subject);
  if (!rec) return 0;
  if (rec.count >= DAILY_MAX) return Infinity;
  return Math.max(0, rec.last + COOLDOWN_MS - Date.now());
}

/** Günlük sınırın dolup dolmadığını söyler. */
export function verificationDailyLimitReached(subject: string): boolean {
  return verificationCooldownRemaining(subject) === Infinity;
}

/** Başarılı bir gönderimden SONRA çağrılır; sayacı ve zaman damgasını yazar. */
export function markVerificationSent(subject: string): void {
  try {
    const rec = readRecord(subject);
    const next: SentRecord = {
      last: Date.now(),
      count: (rec?.count ?? 0) + 1,
      day: today(),
    };
    localStorage.setItem(storageKey(subject), JSON.stringify(next));
  } catch {
    /* localStorage yoksa kota takibi yapılmaz — akış yine de çalışır */
  }
}
