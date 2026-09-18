'use client';

/**
 * DOSYA AMACI: Takvim paneli: boşluk uyarısı, boş gün politikası ve gün gün atama
 * listesi. Kilitli günler (geçmiş / sonucu olan bugün) salt okunurdur.
 */
import { useT } from '@/contexts/LanguageContext';
import { Badge, Button, Card, Select } from '@/components/ui';
import type { AdminPuzzleSummary, CalendarResponse, EmptyDayPolicy } from '@/services/api/adminDailyClient';

interface CalendarPanelProps {
  calendar: CalendarResponse;
  puzzles: AdminPuzzleSummary[];
  busy: boolean;
  canWrite: boolean;
  onAssign: (date: string, puzzleId: string | null) => void;
  onPolicy: (policy: EmptyDayPolicy) => void;
  onShift: (days: number) => void;
}

export function CalendarPanel({ calendar, puzzles, busy, canWrite, onAssign, onPolicy, onShift }: CalendarPanelProps) {
  const t = useT();
  const approved = puzzles.filter((p) => p.status === 'approved');
  const gaps = calendar.upcomingGaps;
  const coveredByPool = calendar.emptyDayPolicy === 'pool' && calendar.poolSize > 0;

  return (
    <Card accent="amber" padding="sm" className="flex flex-col gap-4">
      {gaps.length > 0 && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24' }}>
          <strong>{t('daily_admin.gap_warning', { n: gaps.length, days: calendar.gapWindowDays })}</strong>
          <div className="mt-1 text-xs" style={{ color: '#fcd34d' }}>{gaps.join(', ')}</div>
          <div className="mt-1 text-xs" style={{ color: '#94a3b8' }}>
            {coveredByPool ? t('daily_admin.gap_pool_covers', { n: calendar.poolSize }) : t('daily_admin.gap_no_cover')}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <Select
            label={t('daily_admin.empty_day_policy')}
            value={calendar.emptyDayPolicy}
            disabled={!canWrite || busy}
            onChange={(e) => onPolicy(e.target.value as EmptyDayPolicy)}
          >
            <option value="pool">{t('daily_admin.policy_pool')}</option>
            <option value="none">{t('daily_admin.policy_none')}</option>
          </Select>
        </div>
        <span className="text-xs" style={{ color: '#64748b' }}>{t('daily_admin.pool_size', { n: calendar.poolSize })}</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" color="neutral" onClick={() => onShift(-14)}>← 14</Button>
          <Button size="sm" color="neutral" onClick={() => onShift(14)}>14 →</Button>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {calendar.days.map((day) => {
          const isToday = day.date === calendar.today;
          return (
            <li
              key={day.date}
              className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{
                background: isToday ? 'rgba(255,215,0,0.07)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${day.isGap ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.05)'}`,
                color: day.date < calendar.today ? '#64748b' : '#e2e8f0',
              }}
            >
              <span className="w-24 tabular-nums">{day.date}</span>
              <span className="w-12 text-xs" style={{ color: '#ffd700' }}>#{day.number}</span>
              {isToday && <Badge color="amber">{t('daily.today')}</Badge>}
              <span className="min-w-0 flex-1 truncate">
                {day.entry ? day.entry.title : <em style={{ color: '#475569' }}>{t('daily_admin.empty_day')}</em>}
              </span>
              {day.entry?.assigned_by === 'fallback' && <Badge color="purple">{t('daily_admin.from_pool')}</Badge>}
              {day.entry && day.entry.results > 0 && <Badge color="sky">{t('daily.players_count', { n: day.entry.results })}</Badge>}
              {canWrite && !day.locked && (
                <select
                  value={day.entry?.puzzle_id ?? ''}
                  disabled={busy}
                  onChange={(e) => onAssign(day.date, e.target.value || null)}
                  className="max-w-[200px] rounded-md px-2 py-1 text-xs"
                  style={{ background: '#060d1a', border: '1px solid rgba(30,58,95,0.6)', color: '#94a3b8' }}
                  aria-label={t('daily_admin.assign_for', { date: day.date })}
                >
                  <option value="">{t('daily_admin.unassigned')}</option>
                  {approved.map((p) => <option key={p.id} value={p.id}>{p.title} · par {p.par}</option>)}
                </select>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
