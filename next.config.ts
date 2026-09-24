import type { NextConfig } from "next";

// Portal build'leri (CrazyGames/GameDistribution) oyunu bilinmeyen bir alt
// dizinden, iframe içinde sunar — mutlak `/_next/...` yolları orada 404 verir.
// Bu iki platform için asset'ler göreli yoldan yüklenir (bkz. 02-portal-buildleri.md §1).
const IS_PORTAL_BUILD =
  process.env.NEXT_PUBLIC_PLATFORM === 'crazygames' || process.env.NEXT_PUBLIC_PLATFORM === 'gamedistribution';

// Liderlik tablosu yayında kapalı: `src/app/leaderboard/*.leaderboard.tsx` dosyaları
// yalnızca bu bayrakla route sayılır. Bayraksız build'de rota hiç üretilmez ve
// `/leaderboard` var olmayan bir sayfa gibi 404 verir. Açmak için:
// `cross-env ENABLE_LEADERBOARD=true npm run dev`. Worker tarafındaki karşılığı
// `LEADERBOARD_ENABLED` (syncron-worker/src/types.ts).
const ENABLE_LEADERBOARD = process.env.ENABLE_LEADERBOARD === 'true';

const nextConfig: NextConfig = {
  output: 'export',
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', ...(ENABLE_LEADERBOARD ? ['leaderboard.tsx'] : [])],
  // trailingSlash: routes generate as /route/index.html — required for Capacitor WebView routing
  trailingSlash: true,
  ...(IS_PORTAL_BUILD ? { assetPrefix: './' } : {}),
  images: {
    unoptimized: true,
  },
  typescript: {
    // Tip hataları build'i DURDURUR. Daha önce `true` idi; `npx tsc --noEmit`
    // zaten temiz olduğu için bir şey gizlemiyordu, ama bir regresyonun sessizce
    // yayına çıkmasına açık kapı bırakıyordu (bkz. 04-yayin-kimlik-dogrulama.md §3.2).
    // Bu değeri geri açmak, tip denetimini kapatmak anlamına gelir — açma, hatayı düzelt.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;