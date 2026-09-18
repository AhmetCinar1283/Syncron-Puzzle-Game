'use client';

/**
 * DOSYA AMACI: `/daily` ekranı: seri, bugünün bulmacası, günlük liderlik ve arşiv.
 * Veri `useDailyHub`'dan gelir; özellik bu build'de kapalıysa ana menüye yönlendirir.
 */
import { useEffect, useState } from 'react';
import { useAppRouter } from '@/lib/navigation';
import { useT } from '@/contexts/LanguageContext';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { Badge, Button, PageShell, Spinner, Tabs } from '@/components/ui';
import { isDailyAvailable } from '../lib/dailyConfig';
import { useDailyHub } from '../hooks/useDailyHub';
import { TodayCard } from './TodayCard';
import { DailyLeaderboardList } from './DailyLeaderboardList';
import { ArchiveList } from './ArchiveList';

type HubTab = 'leaderboard' | 'archive';

export function DailyHubPage() {
  const t = useT();
  const router = useAppRouter();
  const available = isDailyAvailable(useCapabilities());
  const { today, streak, archive, status, reload } = useDailyHub();
  const [tab, setTab] = useState<HubTab>('leaderboard');

  useEffect(() => {
    if (!available) router.replace('/');
  }, [available, router]);

  const openDate = (date: string) => router.push(`/daily/play?date=${date}`);
  const streakCount = streak?.current ?? 0;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <Button size="sm" variant="ghost" color="neutral" onClick={() => router.push('/')}>← {t('common.back_menu')}</Button>
      <h1 className="m-0 text-base font-extrabold uppercase tracking-[0.18em]" style={{ color: '#ffd700' }}>{t('daily.title')}</h1>
      <Badge color="orange" size="md" title={t('daily.streak_best', { n: streak?.best ?? 0 })}>🔥 {streakCount}</Badge>
    </div>
  );

  return (
    <PageShell header={header} maxWidth="max-w-xl">
      {status === 'loading' && <div className="flex justify-center py-12"><Spinner color="amber" size={28} /></div>}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="m-0 text-sm" style={{ color: '#f87171' }}>{t('daily.load_error')}</p>
          <Button size="sm" color="amber" onClick={reload}>{t('daily.retry')}</Button>
        </div>
      )}

      {status === 'ready' && today && (
        <div className="flex flex-col gap-6">
          <TodayCard today={today} streak={streakCount} onPlay={() => openDate(today.date)} />
          {streak && streak.best > 0 && (
            <p className="m-0 text-center text-xs" style={{ color: '#64748b' }}>{t('daily.streak_best', { n: streak.best })}</p>
          )}

          <div className="flex flex-col gap-3">
            <Tabs
              color="amber"
              value={tab}
              onChange={(v) => setTab(v as HubTab)}
              items={[
                { value: 'leaderboard', label: t('daily.tab_leaderboard') },
                { value: 'archive', label: t('daily.tab_archive') },
              ]}
            />
            {tab === 'leaderboard'
              ? <DailyLeaderboardList date={today.date} />
              : <ArchiveList entries={archive} onOpen={openDate} />}
          </div>
        </div>
      )}
    </PageShell>
  );
}
