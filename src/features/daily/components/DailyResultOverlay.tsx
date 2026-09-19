'use client';

/**
 * DOSYA AMACI: Günlük bulmaca kazanma kartı: sunucunun doğruladığı yıldız/hamle/par,
 * resmî sonuç mu (yoksa tekrar oynama / arşiv mi), seri, sıra, XP, ipucu işareti
 * ve paylaşım butonu. Sonuç sunucudan gelmeden yıldız gösterilmez.
 */
import { useT } from '@/contexts/LanguageContext';
import { Badge, Button, Spinner } from '@/components/ui';
import type { DailyCompletionState } from '../hooks/useDailyCompletion';
import { useDailyShare } from '../hooks/useDailyShare';
import { StarRow } from './StarRow';

interface DailyResultOverlayProps {
  completion: DailyCompletionState;
  onRestart: () => void;
  onHub: () => void;
  onRetry?: () => void;
}

export function DailyResultOverlay({ completion, onRestart, onHub, onRetry }: DailyResultOverlayProps) {
  const t = useT();
  const { share, busy: shareBusy } = useDailyShare();
  const result = completion.kind === 'done' ? completion.result : null;
  const official = result?.officialResult ?? null;

  let notice: string | null = null;
  if (result?.isArchive) notice = t('daily.result_archive');
  else if (result && !result.isOfficial && official) notice = t('daily.result_replay', { n: official.moveCount });

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      // backdrop-filter yok: WebView'de pahalı tam ekran blur geçişi.
      style={{ background: 'rgba(2,5,14,0.92)' }}
    >
      <div
        className="flex w-full max-w-[340px] flex-col items-center gap-3 rounded-2xl p-6 text-center"
        style={{ background: 'rgba(4,9,20,0.96)', border: '1px solid rgba(255,215,0,0.35)', boxShadow: '0 0 35px rgba(255,215,0,0.1)' }}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: '#ffd700' }}>
          {result ? `${t('daily.title')} #${result.number}` : t('daily.title')}
        </span>

        {completion.kind === 'pending' || completion.kind === 'idle' ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <StarRow stars={0} size={30} />
            <Spinner color="amber" />
          </div>
        ) : null}

        {completion.kind === 'failed' && (
          <div className="flex flex-col items-center gap-3 py-2">
            <span className="text-sm" style={{ color: '#f87171' }}>
              {t(
                completion.reason === 'offline'
                  ? 'daily.result_offline'
                  : completion.reason === 'rate_limited'
                    ? 'common.rate_limited'
                    : 'daily.result_error',
              )}
            </span>
            {onRetry && <Button size="sm" color="amber" onClick={onRetry}>{t('daily.retry')}</Button>}
          </div>
        )}

        {result && (
          <>
            <StarRow stars={result.stars} size={30} />
            <h2 className="m-0 text-xl font-extrabold" style={{ color: '#00ff88' }}>{t('win.title')}</h2>
            <span className="text-sm" style={{ color: '#94a3b8' }}>
              {t('daily.result_moves', { n: result.moveCount, par: result.par })}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {result.hinted && <Badge color="amber">{t('daily.hinted_badge')}</Badge>}
              {result.xpDelta > 0 && <Badge color="emerald">+{result.xpDelta} XP</Badge>}
              {!result.isArchive && result.streak.current > 0 && <Badge color="orange">🔥 {result.streak.current}</Badge>}
              {!result.isArchive && result.rank !== null && <Badge color="sky">{t('daily.rank', { n: result.rank })}</Badge>}
            </div>
            {notice && <span className="text-xs" style={{ color: '#64748b' }}>{notice}</span>}
          </>
        )}

        <div className="mt-2 flex w-full flex-col gap-2">
          {result && official && !result.isArchive && (
            <Button
              color="amber"
              variant="solid"
              fullWidth
              loading={shareBusy}
              onClick={() => share({
                number: result.number,
                stars: official.stars,
                moveCount: official.moveCount,
                streak: result.streak.current,
                hinted: official.hinted,
              })}
            >
              {t('daily.share')}
            </Button>
          )}
          <div className="flex gap-2">
            <Button color="sky" fullWidth onClick={onRestart}>{t('daily.play_again')}</Button>
            <Button color="neutral" fullWidth onClick={onHub}>{t('daily.back_to_hub')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
