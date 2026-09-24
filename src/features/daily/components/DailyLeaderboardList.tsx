'use client';

/**
 * DOSYA AMACI: Günlük liderlik listesi (az hamle → az süre). İpucu kullanılan
 * sonuçlar işaretlidir ve ipuçsuzların arkasında sıralanır (sunucu kuralı).
 */
import { useT } from '@/contexts/LanguageContext';
import { EmptyState, Spinner } from '@/components/ui';
import { formatDuration } from '../lib/dailyConfig';
import { useDailyLeaderboard } from '../hooks/useDailyLeaderboard';

export function DailyLeaderboardList({ date }: { date: string }) {
  const t = useT();
  const { data, loading, failed, currentUid } = useDailyLeaderboard(date);

  if (loading) return <div className="flex justify-center py-6"><Spinner color="amber" /></div>;
  if (failed || !data) return <p className="py-4 text-center text-sm" style={{ color: '#f87171' }}>{t('daily.load_error')}</p>;
  if (data.entries.length === 0) return <EmptyState mascot={{ playerIndex: 1, greet: 'wink' }} title={t('daily.leaderboard_empty')} />;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs" style={{ color: '#64748b' }}>{t('daily.players_count', { n: data.total })}</span>
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {data.entries.map((e) => {
          const mine = e.uid === currentUid;
          return (
            <li
              key={e.uid}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
              style={{
                background: mine ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${mine ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.05)'}`,
                color: '#e2e8f0',
              }}
            >
              <span className="w-7 text-right font-bold" style={{ color: e.rank <= 3 ? '#ffd700' : '#64748b' }}>{e.rank}</span>
              <span className="min-w-0 flex-1 truncate">
                {e.displayName ?? t('daily.anonymous_player')}
                {e.tag && <span style={{ color: '#475569' }}> #{e.tag}</span>}
              </span>
              {e.hinted && <span title={t('daily.hinted_badge')} aria-label={t('daily.hinted_badge')}>💡</span>}
              <span className="tabular-nums">{t('daily.moves_count', { n: e.moveCount })}</span>
              <span className="w-12 text-right tabular-nums" style={{ color: '#64748b' }}>{formatDuration(e.timeSpent)}</span>
            </li>
          );
        })}
      </ol>
      {data.me && data.me.rank !== null && data.me.rank > data.entries.length && (
        <p className="m-0 text-center text-xs" style={{ color: '#ffd700' }}>{t('daily.rank', { n: data.me.rank })}</p>
      )}
    </div>
  );
}
