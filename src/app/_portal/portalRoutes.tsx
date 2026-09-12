/**
 * DOSYA AMACI: Portal build'lerinde (tek statik `index.html`) hangi yolun hangi
 * ekranı render edeceğini tanımlayan tablo. Yeni bir ekranı portala açmak = bu
 * tabloya bir satır eklemek (bkz. 00-mimari-ilkeler.md §3). Admin, editör,
 * profil, arkadaşlar, liderlik tablosu, destek ve bağış gibi ekranlar bu
 * tabloda YOKTUR — `PortalShell` bilinmeyen her yolu ana menüye yönlendirir.
 */
import { Suspense, type ComponentType } from 'react';
import { HomePage } from '@/features/home';
import { LevelsPage } from '@/features/levels';
import { ControlsPage } from '@/features/controls';
import { PlayContent, LoadingScreen } from '@/features/play';
import PrivacyPage from '@/app/privacy/page';
import TermsPage from '@/app/terms/page';
import KvkkPage from '@/app/kvkk/page';

function PlayRoute() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlayContent />
    </Suspense>
  );
}

export const PORTAL_ROUTES: Record<string, ComponentType> = {
  '/': HomePage,
  '/levels': LevelsPage,
  '/play': PlayRoute,
  '/controls': ControlsPage,
  '/privacy': PrivacyPage,
  '/terms': TermsPage,
  '/kvkk': KvkkPage,
};
