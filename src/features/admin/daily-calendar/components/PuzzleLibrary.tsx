'use client';

/**
 * DOSYA AMACI: Günlük bulmaca kütüphanesi: onay durumu, par kaynağı, yedek havuz,
 * atandığı tarihler; editörde aç / onayla-taslağa çek / havuza al / sil.
 */
import { useT } from '@/contexts/LanguageContext';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import type { AdminPuzzleSummary, DailyPuzzleStatus } from '@/services/api/adminDailyClient';

interface PuzzleLibraryProps {
  puzzles: AdminPuzzleSummary[];
  busyId: string | null;
  canWrite: boolean;
  onOpenInEditor: (id: string) => void;
  onStatus: (id: string, status: DailyPuzzleStatus) => void;
  onPool: (id: string, inPool: boolean) => void;
  onDelete: (id: string) => void;
}

export function PuzzleLibrary({ puzzles, busyId, canWrite, onOpenInEditor, onStatus, onPool, onDelete }: PuzzleLibraryProps) {
  const t = useT();
  if (puzzles.length === 0) return <EmptyState title={t('daily_admin.library_empty')} description={t('daily_admin.library_empty_hint')} />;

  return (
    <div className="flex flex-col gap-2">
      {puzzles.map((p) => {
        const busy = busyId === p.id;
        const approved = p.status === 'approved';
        return (
          <Card key={p.id} padding="sm" className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-bold text-white">{p.title}</span>
            <Badge color={approved ? 'emerald' : 'neutral'}>{t(approved ? 'daily_admin.status_approved' : 'daily_admin.status_draft')}</Badge>
            <Badge color="sky">par {p.par}</Badge>
            {p.par_source === 'admin' && <Badge color="amber" title={t('daily_admin.par_not_optimal')}>{t('daily_admin.par_admin')}</Badge>}
            <Badge color="purple">{t(p.source === 'generated' ? 'daily_admin.source_generated' : 'daily_admin.source_designed')}</Badge>
            {p.in_pool === 1 && <Badge color="orange">{t('daily_admin.in_pool')}</Badge>}
            <span className="w-full text-xs" style={{ color: '#64748b' }}>
              {p.dates.length > 0 ? t('daily_admin.assigned_dates', { dates: p.dates.join(', ') }) : t('daily_admin.not_assigned')}
            </span>
            {canWrite && (
              <div className="flex w-full flex-wrap gap-2">
                <Button size="sm" color="sky" onClick={() => onOpenInEditor(p.id)}>{t('daily_admin.open_in_editor')}</Button>
                <Button size="sm" color={approved ? 'neutral' : 'emerald'} disabled={busy} onClick={() => onStatus(p.id, approved ? 'draft' : 'approved')}>
                  {t(approved ? 'daily_admin.unapprove' : 'daily_admin.approve')}
                </Button>
                <Button size="sm" color="orange" disabled={busy || !approved} onClick={() => onPool(p.id, p.in_pool !== 1)}>
                  {t(p.in_pool === 1 ? 'daily_admin.remove_from_pool' : 'daily_admin.add_to_pool')}
                </Button>
                <Button
                  size="sm"
                  color="red"
                  variant="ghost"
                  disabled={busy || p.dates.length > 0}
                  onClick={() => { if (window.confirm(t('daily_admin.delete_confirm', { title: p.title }))) onDelete(p.id); }}
                >
                  {t('daily_admin.delete')}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
