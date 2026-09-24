import { Metadata } from 'next';
import { LeaderboardPage } from '@/features/leaderboard';

export const metadata: Metadata = {
  title: 'Lider Tablosu | Syncron',
  description: 'Syncron bulmaca oyununda en iyi oyuncuları, bölüm fatihlerini, rekortmenleri ve mimarları görün.',
};

export default function LeaderboardRoute() {
  return <LeaderboardPage />;
}
