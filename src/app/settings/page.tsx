/**
 * DOSYA AMACI: Next.js `/settings` rotası. Yalnızca `SettingsPage` bileşenini
 * kompoze eder (00-mimari-ilkeler.md Kural 1).
 */

'use client';

import { SettingsPage } from '@/features/settings';

export default function Page() {
  return <SettingsPage />;
}
