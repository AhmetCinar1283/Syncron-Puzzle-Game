'use client';

/**
 * DOSYA AMACI: Geçmiş günlerin bulmacaları. Arşiv oynanışı seriyi, günlük liderliği
 * ve XP'yi etkilemez; o gün resmî olarak çözüldüyse yıldızı gösterilir.
 */
import { useT } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/ui';
import type { DailyArchiveEntry } from '@/services/api/dailyClient';
import { StarRow } from './StarRow';

export function ArchiveList({ entries, onOpen }: { entries: DailyArchiveEntry[]; onOpen: (date: string) => void }) {
  const t = useT();
  if (entries.length === 0) return <EmptyState title={t('daily.archive_empty')} />;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs" style={{ color: '#64748b' }}>{t('daily.archive_notice')}</span>
      {entries.map((e) => (
        <button
          key={e.date}
          type="button"
          onClick={() => onOpen(e.date)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0', cursor: 'pointer' }}
        >
          <span className="w-12 font-bold" style={{ color: '#ffd700' }}>#{e.number}</span>
          <span className="min-w-0 flex-1 truncate">{e.title}</span>
          <span className="text-xs" style={{ color: '#64748b' }}>{e.date}</span>
          {e.officialStars !== null ? <StarRow stars={e.officialStars} size={12} /> : <span style={{ width: 42 }} />}
        </button>
      ))}
    </div>
  );
}
