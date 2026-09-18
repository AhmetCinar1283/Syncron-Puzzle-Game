'use client';

/**
 * DOSYA AMACI: "Bugünün bulmacası" kartı: numara, başlık, par; oynandıysa resmî
 * sonuç + paylaş, oynanmadıysa büyük "Oyna" butonu. Bugün bulmaca yoksa bilgi metni.
 */
import { useT } from '@/contexts/LanguageContext';
import { Badge, Button, Card } from '@/components/ui';
import type { DailyPuzzleResponse } from '@/services/api/dailyClient';
import { formatDuration } from '../lib/dailyConfig';
import { useDailyShare } from '../hooks/useDailyShare';
import { StarRow } from './StarRow';

interface TodayCardProps {
  today: DailyPuzzleResponse;
  streak: number;
  onPlay: () => void;
}

export function TodayCard({ today, streak, onPlay }: TodayCardProps) {
  const t = useT();
  const { share, busy } = useDailyShare();
  const { puzzle, officialResult } = today;

  if (!puzzle) {
    return (
      <Card accent="amber" className="text-center">
        <p className="m-0 text-sm" style={{ color: '#94a3b8' }}>{t('daily.no_puzzle_today')}</p>
      </Card>
    );
  }

  return (
    <Card accent="amber" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: '#ffd700' }}>
            {t('daily.today')} · #{today.number}
          </span>
          <h2 className="m-0 text-lg font-extrabold text-white">{puzzle.title}</h2>
        </div>
        <Badge color="sky">{t('daily.par', { n: puzzle.par })}</Badge>
      </div>

      {officialResult ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: '#cbd5e1' }}>
            <StarRow stars={officialResult.stars} size={18} />
            <span>{t('daily.moves_count', { n: officialResult.moveCount })}</span>
            <span>{formatDuration(officialResult.timeSpent)}</span>
            {officialResult.hinted && <Badge color="amber">{t('daily.hinted_badge')}</Badge>}
            {today.rank !== null && <Badge color="sky">{t('daily.rank', { n: today.rank })}</Badge>}
          </div>
          <div className="flex gap-2">
            <Button
              color="amber"
              variant="solid"
              fullWidth
              loading={busy}
              onClick={() => share({
                number: today.number,
                stars: officialResult.stars,
                moveCount: officialResult.moveCount,
                streak,
                hinted: officialResult.hinted,
              })}
            >
              {t('daily.share')}
            </Button>
            <Button color="sky" fullWidth onClick={onPlay}>{t('daily.play_again')}</Button>
          </div>
        </div>
      ) : (
        <Button color="amber" variant="solid" size="lg" fullWidth onClick={onPlay}>{t('daily.play_today')}</Button>
      )}
    </Card>
  );
}
