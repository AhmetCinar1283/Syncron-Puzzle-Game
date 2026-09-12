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
    // !! DİKKAT !!
    // Bu seçenek, proje build edilirken TypeScript hatalarını görmezden gelmenizi sağlar.
    // Projenizde tip hataları olsa bile build işlemi başarılı olur.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;