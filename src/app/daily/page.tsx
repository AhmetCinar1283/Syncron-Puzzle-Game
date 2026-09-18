import type { Metadata } from 'next';
import { DailyHubPage } from '@/features/daily';

// Paylaşılan link (`/daily/`) açıldığında görünen sosyal önizleme. Statik export
// olduğu için günlük değişen görsel yoktur; genel OG görseli kullanılır.
export const metadata: Metadata = {
  title: 'Daily Puzzle',
  description: 'A new Syncron puzzle every day. Same puzzle for everyone — solve it in as few moves as you can and share your streak.',
  alternates: { canonical: '/daily/' },
  openGraph: {
    type: 'website',
    url: '/daily/',
    siteName: 'Syncron',
    title: 'Syncron Daily Puzzle',
    description: 'One puzzle a day, the same for everyone. How few moves can you solve it in?',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Syncron Daily Puzzle' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Syncron Daily Puzzle',
    description: 'One puzzle a day, the same for everyone. How few moves can you solve it in?',
    images: ['/og-image.png'],
  },
};

export default function DailyPage() {
  return <DailyHubPage />;
}
