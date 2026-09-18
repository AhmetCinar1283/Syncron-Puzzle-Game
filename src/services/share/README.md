# services/share

Platformdan bağımsız "metin paylaş" servisi (React yok).

```ts
shareText({ text, url?, title? }): Promise<'shared' | 'copied' | 'cancelled' | 'failed'>
```

Sıra:

1. **Capacitor yerel** (`@capacitor/share`, dinamik import — web paketine girmez) — Android paylaşım menüsü.
2. **`navigator.share`** — mobil tarayıcılar. Kullanıcı kapatırsa `cancelled`.
3. **Pano** — `navigator.clipboard.writeText`, olmazsa `execCommand('copy')` yedeği → `copied`.

Link eklenip eklenmeyeceğine çağıran karar verir (`capabilities.externalLinks`); bu servis
platform adını bilmez. İlk kullanıcı: `features/daily/hooks/useDailyShare.ts`.

Android'de eklenti için `npx cap sync android` gerekir.
