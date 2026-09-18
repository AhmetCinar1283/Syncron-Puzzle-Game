'use client';

/**
 * DOSYA AMACI: `/admin/daily-calendar` ekranı: takvim (boşluk uyarısı + atama),
 * bulmaca kütüphanesi ve aday üretici. AdminGuard ile korunur; yazma işlemleri
 * yalnızca admin rolünde gösterilir (worker da aynı kuralı uygular).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { AdminGuard } from '@/components/common/AdminGuard';
import { Button, PageShell, Spinner, Tabs } from '@/components/ui';
import { editorUrlForDailyPuzzle } from '@/lib/dailyDraftHandoff';
import { useDailyCalendar } from '../hooks/useDailyCalendar';
import { usePuzzleLibrary } from '../hooks/usePuzzleLibrary';
import { useCandidateGenerator } from '../hooks/useCandidateGenerator';
import { CalendarPanel } from './CalendarPanel';
import { PuzzleLibrary } from './PuzzleLibrary';
import { CandidateGenerator } from './CandidateGenerator';

type Section = 'library' | 'generator';

function DailyCalendarContent() {
  const t = useT();
  const router = useRouter();
  const { role } = useAuth();
  const canWrite = role === 'admin';
  const [section, setSection] = useState<Section>('library');

  const calendar = useDailyCalendar(true);
  const library = usePuzzleLibrary(true, calendar.reload);
  const generator = useCandidateGenerator(() => { library.reload(); calendar.reload(); }, (url) => router.push(url));
  const errorKey = calendar.errorKey ?? library.errorKey;

  const header = (
    <div className="flex items-center justify-between gap-3">
      <Button size="sm" variant="ghost" color="neutral" onClick={() => router.push('/admin')}>← Admin</Button>
      <h1 className="m-0 text-base font-extrabold uppercase tracking-[0.18em]" style={{ color: '#ffd700' }}>{t('daily_admin.title')}</h1>
      <Button size="sm" color="sky" onClick={() => router.push('/editor')}>{t('daily_admin.design_new')}</Button>
    </div>
  );

  return (
    <PageShell header={header} maxWidth="max-w-4xl">
      <div className="flex flex-col gap-6">
        {errorKey && <p className="m-0 text-sm" style={{ color: '#f87171' }}>{t(errorKey)}</p>}
        {!canWrite && <p className="m-0 text-xs" style={{ color: '#64748b' }}>{t('daily_admin.read_only')}</p>}

        {calendar.calendar ? (
          <CalendarPanel
            calendar={calendar.calendar}
            puzzles={library.puzzles}
            busy={calendar.busy}
            canWrite={canWrite}
            onAssign={calendar.assign}
            onPolicy={calendar.setPolicy}
            onShift={calendar.shift}
          />
        ) : (
          <div className="flex justify-center py-8"><Spinner color="amber" /></div>
        )}

        <div className="flex flex-col gap-3">
          <Tabs
            color="amber"
            value={section}
            onChange={(v) => setSection(v as Section)}
            items={[
              { value: 'library', label: t('daily_admin.tab_library') },
              ...(canWrite ? [{ value: 'generator', label: t('daily_admin.tab_generator') }] : []),
            ]}
          />
          {section === 'library' || !canWrite ? (
            <PuzzleLibrary
              puzzles={library.puzzles}
              busyId={library.busyId}
              canWrite={canWrite}
              onOpenInEditor={(id) => router.push(editorUrlForDailyPuzzle(id))}
              onStatus={library.setStatus}
              onPool={library.setInPool}
              onDelete={library.remove}
            />
          ) : (
            <CandidateGenerator generator={generator} />
          )}
        </div>
      </div>
    </PageShell>
  );
}

export default function DailyCalendarPage() {
  return (
    <AdminGuard>
      <DailyCalendarContent />
    </AdminGuard>
  );
}
