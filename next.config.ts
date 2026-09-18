import type { NextConfig } from "next";

// Portal build'leri (CrazyGames/GameDistribution) oyunu bilinmeyen bir alt
// dizinden, iframe içinde sunar — mutlak `/_next/...` yolları orada 404 verir.
// Bu iki platform için asset'ler göreli yoldan yüklenir (bkz. 02-portal-buildleri.md §1).
const IS_PORTAL_BUILD =
  process.env.NEXT_PUBLIC_PLATFORM === 'crazygames' || process.env.NEXT_PUBLIC_PLATFORM === 'gamedistribution';

const nextConfig: NextConfig = {
  output: 'export',
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