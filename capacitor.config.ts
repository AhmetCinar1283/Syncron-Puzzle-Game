import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.polimelo.syncroncap',
  appName: 'Syncron',
  webDir: 'out',
  android: {
    minWebViewVersion: 60,
  },
  plugins: {
    /**
     * Google ile giriş (@capgo/capacitor-social-login).
     *
     * `providers` yalnızca hangi native SDK'nın APK'ya GİRECEĞİNİ belirler; eklenti
     * Google/Facebook/Apple/Twitter'ı varsayılan olarak hepsini `implementation`
     * ile ekler. Oyun sadece Google kullandığı için diğer üçü `false` yapıldı:
     * `false` → gradle'da `compileOnly` + `socialLogin.<p>.include=false`, yani
     * Facebook SDK'sı ve Twitter/Apple bağımlılıkları paketlenmez. Bu hem AAB
     * boyutunu hem de Play veri güvenliği formunda açıklanması gereken SDK
     * yüzeyini küçültür.
     *
     * webClientId burada DEĞİL, çalışma anında `SocialLogin.initialize()` ile
     * verilir (bkz. src/contexts/AuthContext.tsx) — çünkü kimlik ortam
     * değişkeninden okunabilsin diye. Bu dosya build-time sabitidir.
     */
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
    AdMob: {},
  },
};

export default config;