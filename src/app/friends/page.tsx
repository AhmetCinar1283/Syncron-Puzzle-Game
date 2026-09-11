import { Metadata } from 'next';
import { Suspense } from 'react';
import { FriendsPage } from '@/features/friends';

export const metadata: Metadata = {
  title: 'Arkadaşlar | Syncron',
  description: 'Syncron arkadaş listesi, arama ve istek yönetimi.',
};

export default function Page() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#030712' }} />}>
      <FriendsPage />
    </Suspense>
  );
}
