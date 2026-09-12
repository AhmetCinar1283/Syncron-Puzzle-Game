'use client';
import { HomePage } from '@/features/home';
import { PortalShell } from './_portal/PortalShell';
import { CURRENT_PLATFORM, getCapabilities } from '@/services/monetization';

// Portal build'lerinde (CrazyGames/GameDistribution) statik export tek bir
// index.html üretir; PortalShell URL değişmeden bellek içi router ile tüm
// ekranları bu kökten render eder (bkz. src/app/_portal, 02-portal-buildleri.md).
const IN_MEMORY_ROUTING = getCapabilities(CURRENT_PLATFORM).inMemoryRouting;

export default function Home() {
  return IN_MEMORY_ROUTING ? <PortalShell /> : <HomePage />;
}
