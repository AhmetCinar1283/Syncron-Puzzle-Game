# lib/navigation

`next/navigation`/`next/link` etrafında ince bir adaptör. Amaç: portal build'lerinde
(CrazyGames/GameDistribution) tek statik `index.html` dağıtılıyor olsa bile,
sayfa bileşenlerinin `useRouter`/`useSearchParams`/`usePathname`/`Link` kodunu
değiştirmeden çalışmasını sağlamak.

- `useAppRouter()`, `useAppSearchParams()`, `useAppPathname()`, `AppLink` — bu
  dosyadan import edilir, `next/navigation`'dan değil.
- Hangi uygulamanın aktif olacağı `capabilities.inMemoryRouting` alanına göre
  `index.ts` içinde **build zamanında bir kez** seçilir:
  - `false` (web/android/electron): `nextNavigation.ts` — doğrudan Next'e delege.
  - `true` (crazygames/gamedistribution): `memoryNavigation.ts` — URL hiç
    değişmez, aktif ekran saf React state (`useSyncExternalStore`) ile tutulur.

Bu adaptör yalnızca **portal'da erişilebilen** ekranlara (ana menü, kampanya,
oyun, kontroller, gizlilik/şartlar/kvkk) uygulanmıştır — admin, editör, profil,
arkadaşlar, liderlik tablosu, destek ve bağış gibi portalda hiç render
edilmeyen ekranlar `next/navigation`'ı doğrudan kullanmaya devam eder; onlar
için davranış değişmez.
