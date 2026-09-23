# services/auth

Native (Capacitor/Android) giriş eklentilerinin sarmalandığı yer. React yok, Firebase yok.

```ts
signInWithGoogleNative(): Promise<string>  // Google ID token
```

Eklenti: `@capgo/capacitor-social-login` (dinamik import — web/Electron/portal paketlerine girmez).
Android tarafı Google'ın güncel **Credential Manager** API'sini kullanır; eski
`@codetrix-studio/capacitor-google-auth` (Capacitor 6 peer, 2024'ten beri terk edilmiş,
kullanımdan kaldırılmış `GoogleSignIn` API'si) bunun yerine bırakıldı. Gerekçe ve elenen
alternatifler `nativeGoogleSignIn.ts` başındaki blokta; rapor:
`.plans/yayin-hazirlik/raporlar/13-google-auth-uyumluluk.md`.

Bu servis yalnızca **ID token** döndürür. Token'ı Firebase kimlik bilgisine çevirip oturum
açan/bağlayan taraf `contexts/AuthContext.tsx`'tir; web/Electron'da oraya hiç uğranmaz
(`signInWithPopup` kullanılır).

Yapılandırma:

- `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` (yoksa kod içindeki genel web client ID'ye düşer).
- `capacitor.config.ts` → `plugins.SocialLogin.providers`: yalnızca `google: true`;
  Facebook/Apple/Twitter SDK'ları APK'ya girmez.
- Eklenti değişikliği sonrası `npx cap sync android` gerekir.

## verification.ts

E-posta doğrulama akışının istemci yapılandırması: `getActionCodeSettings()` (continue URL =
`NEXT_PUBLIC_SITE_URL` + `/auth/verified`, `handleCodeInApp: false`) ve yeniden gönderme kotası
(`verificationCooldownRemaining`, `markVerificationSent`; 60 sn bekleme, günde en fazla 5).
Kota anahtarı oturumluyken uid, oturumsuz bekleyişte e-postadır. Bu bir güvenlik sınırı değil,
Firebase'in proje başına e-posta kotasını korumaktır. Bütünsel tasarım: `docs/auth.md` →
*Email Verification*.
