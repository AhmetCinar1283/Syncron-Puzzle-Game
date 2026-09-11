import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ToastProvider } from "@/contexts/ToastContext";
import FirestoreSync from "@/components/common/FirestoreSync";
import UserBadge from "@/components/common/UserBadge";
import BackButtonManager from "@/components/common/BackButtonManager";
import StoreProvider from "@/store/StoreProvider";
import { GameThemeProvider } from "@/game-engine/contexts/GameThemeContext";
import { MonetizationProvider } from "@/contexts/MonetizationContext";
import { MonetizationDebugPanel } from "@/components/common/MonetizationDebugPanel";
import { CURRENT_PLATFORM } from "@/services/monetization";

const BASE_URL = 'https://syncron.polyvoclub.com';

const GA_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? '';

// AdSense hesabı onaylandığında web build'i için tekrar açılacak (bkz.
// src/services/monetization/providers/adsense.draft.ts).
const ADSENSE_ENABLED = false;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Syncron — Grid Puzzle Game',
    template: '%s | Syncron',
  },
  description:
    'Syncron is a free browser puzzle game. Control two objects at once across a neon grid — ice slides, teleporters, conveyors, and more. Can you sync them to their targets?',
  keywords: [
    'puzzle game',
    'grid puzzle',
    'browser game',
    'free puzzle game',
    'logic game',
    'syncron',
    'neon puzzle',
    'two player puzzle',
    'simultaneous movement',
    'level editor',
  ],
  authors: [{ name: 'Polyvo Club', url: BASE_URL }],
  creator: 'Polyvo Club',
  publisher: 'Polyvo Club',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    url: BASE_URL,
    siteName: 'Syncron',
    title: 'Syncron — Grid Puzzle Game',
    description:
      'Move two neon objects to their targets simultaneously. Navigate ice, teleporters, conveyors and more in this free browser puzzle game.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Syncron — Grid Puzzle Game',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Syncron — Grid Puzzle Game',
    description:
      'Move two neon objects to their targets simultaneously. Free browser puzzle game with a built-in level editor.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  icons: {
    icon: '/icon.ico',
  },
  ...(ADSENSE_ENABLED && CURRENT_PLATFORM === 'web'
    ? { other: { "google-adsense-account": "ca-pub-3798429741438186" } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet" />
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
              }}
            />
          </>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Syncron',
              url: 'https://syncron.polyvoclub.com',
              description:
                'Syncron is a free browser-based grid puzzle game where you control two objects simultaneously and navigate them to their targets. Features include ice slides, teleporters, conveyors, power nodes, and a built-in level editor.',
              applicationCategory: 'Game',
              genre: 'Puzzle',
              operatingSystem: 'Any',
              browserRequirements: 'Requires JavaScript',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              author: {
                '@type': 'Organization',
                name: 'Polyvo Club',
                url: 'https://polyvoclub.com',
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <LanguageProvider>
          <StoreProvider>
            <AuthProvider>
              <ToastProvider>
                <GameThemeProvider>
                  <MonetizationProvider>
                    <FirestoreSync />
                    <UserBadge />
                    <BackButtonManager />
                    {children}
                    <MonetizationDebugPanel />
                  </MonetizationProvider>
                </GameThemeProvider>
              </ToastProvider>
            </AuthProvider>
          </StoreProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
