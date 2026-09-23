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
