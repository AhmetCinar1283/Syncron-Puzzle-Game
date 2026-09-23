/**
 * DOSYA AMACI: Bu dosya, Capacitor (Android) üzerinde native Google giriş penceresini açıp
 * Firebase'in ihtiyaç duyduğu tek şeyi — Google ID token'ını — döndürür. Firebase ile ilgili
 * hiçbir iş burada yapılmaz; token'ı kimlik bilgisine çeviren taraf `contexts/AuthContext.tsx`'tir.
 */

/*
 * ─── Neden bu eklenti? (geri alınması pahalı karar — 2026-09) ──────────────────
 *
 * Önceki eklenti `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4` idi.
 *
 * ALTERNATİFLER VE NEDEN REDDEDİLDİ:
 *
 * 1. "Aynı eklentinin uyumlu sürümüne geç" — MÜMKÜN DEĞİL. npm'deki en son sürüm
 *    hâlâ `3.4.0-rc.4` (yayın tarihi 2024-05-01) ve peer bağımlılığı `@capacitor/core@^6`.
 *    Projede `@capacitor/core@8.3.0` var; Capacitor 7 ve 8 için hiç sürüm çıkmadı.
 *    Ayrıca eklenti, Google'ın kullanımdan kaldırdığı `GoogleSignIn` (play-services-auth)
 *    API'sine ve `play-services-auth:18.+` gibi dinamik bir sürüm aralığına bağlıydı.
 *
 * 2. `@capacitor-firebase/authentication` (Capawesome) — REDDEDİLDİ. Capacitor 8 ile
 *    uyumlu ve Firebase'in önerdiği yol, ama native Firebase SDK'sını devreye sokuyor:
 *    `android/app/google-services.json` zorunlu hâle geliyor (bu dosya projede YOK,
 *    Firebase Console'dan elle indirilmesi gerekir) ve `skipNativeAuth` yanlış
 *    ayarlanırsa native oturum ile Web SDK oturumu ayrışıyor. Oyunun tüm Firestore
 *    kuralları ve `AuthContext` akışı Web SDK oturumuna dayandığı için bu, cihazda
 *    test edilemeyen bir anda sessizce bozulma riski taşıyordu — yani tam kaçınmak
 *    istediğimiz hata sınıfı.
 *
 * 3. "Bırak, uyumsuzluk sorun çıkarmıyor" — REDDEDİLDİ. `npm ls @capacitor/core`
 *    `ELSPROBLEMS` ile hata veriyordu (bağımlılık ağacı geçersiz). Ayrıca eski
 *    eklentinin Java kodu, Google girişi BAŞARILI olsa bile `AccountManager` üzerinden
 *    bir access token çekmeye çalışıp başarısız olursa çağrının tamamını reddediyordu —
 *    Firebase'in access token'a hiç ihtiyacı olmamasına rağmen.
 *
 * SEÇİLEN: `@capgo/capacitor-social-login@^8.5.11` — peer `@capacitor/core >=8.0.0`,
 * aktif bakımda, Android tarafında Google'ın güncel Credential Manager API'sini
 * kullanıyor ve `idToken` döndürüyor; yani `AuthContext`'teki Firebase akışı aynen kalıyor.
 *
 * "Yeni bir tür/kaynak eklenince bu dosya değişmek zorunda kalır mı?" — Hayır.
 * Bu dosya tek bir soruyu cevaplar: "native Google ID token". Yeni bir giriş sağlayıcısı
 * (Apple, Facebook) eklenirse yanına kardeş bir dosya gelir, bu dosya değişmez.
 */

import type { GoogleLoginResponse } from '@capgo/capacitor-social-login';

/**
 * Google OAuth **Web** client ID (Android istemcisi değil).
 * Credential Manager bunu `serverClientId` olarak ister ve dönen ID token'ın `aud`
 * alanına yazar; Firebase de kimlik bilgisini bu değere göre doğrular.
 *
 * Eksik gelirse ne olur? `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` tanımsızsa aşağıdaki
 * sabite düşülür — bu, önceki eklentinin davranışıyla birebir aynıdır ve değer zaten
 * gizli değildir (OAuth web client ID herkese açık bir tanımlayıcıdır, `android/app/
 * src/main/res/values/strings.xml` içinde de bulunuyordu).
 */
const WEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '1041986277726-9otkut2eqcl61rs3rokmgcqn184g42pu.apps.googleusercontent.com';

/** `initialize()` uygulama ömrü boyunca bir kez çalışsın diye tutulan söz. */
let initPromise: Promise<void> | null = null;

// Eklentiyi tembel yükler; böylece web/Electron/portal bundle'larına native SDK sarmalayıcısı girmez.
async function getPlugin() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  return SocialLogin;
}

/**
 * Native Google giriş penceresini açar ve Google ID token'ını döndürür.
 *
 * Bilerek **scope istenmiyor**: eklentinin Android tarafı, varsayılan OIDC scope'ları
 * dışında bir scope istendiğinde `MainActivity`'nin değiştirilmiş olmasını şart koşar
 * ("You CANNOT use scopes without modifying the main activity") ve kullanıcıya ikinci
 * bir izin ekranı çıkarır. Firebase'in yalnızca ID token'a ihtiyacı var; profil ve
 * e-posta bilgisi zaten token'ın içinde geliyor. Yani oyuncunun gördüğü akış tek
 * ekranda kalıyor.
 *
 * @throws Eklenti hata verirse (kullanıcı vazgeçti dâhil) hata yukarı aktarılır;
 *         mesaj eşlemesi `components/common/AuthModal.tsx` içindedir.
 * @throws ID token boş dönerse `Error` — bu durumda Firebase'e gönderilecek bir şey yoktur.
 */
export async function signInWithGoogleNative(): Promise<string> {
  const SocialLogin = await getPlugin();

  if (!initPromise) {
    initPromise = SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID } });
  }
  try {
    await initPromise;
  } catch (err) {
    // Başarısız initialize'ı önbellekte tutma; kullanıcı tekrar denediğinde yeniden kurulsun.
    initPromise = null;
    throw err;
  }

  const { result } = await SocialLogin.login({ provider: 'google', options: {} });

  // `offline` modu kullanılmıyor, dolayısıyla yanıt her zaman `online` olmalı; yine de
  // tür daraltmasını açıkça yapıyoruz ki eklenti bir gün mod değiştirirse derleme patlasın.
  const idToken = isOnlineResponse(result) ? result.idToken : null;
  if (!idToken) {
    throw new Error('Google Sign-in failed: No ID Token returned.');
  }
  return idToken;
}

// Google yanıtının `online` (idToken içeren) varyant olup olmadığını ayırt eder.
function isOnlineResponse(
  response: GoogleLoginResponse,
): response is Extract<GoogleLoginResponse, { responseType: 'online' }> {
  return response.responseType === 'online';
}
