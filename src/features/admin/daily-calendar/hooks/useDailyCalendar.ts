'use client';

/**
 * DOSYA AMACI: Takvim ekranının durumu: görünen tarih aralığı, boşluk uyarısı,
 * boş gün politikası ve tarihe atama/kaldırma. Kurallar (kilit, onay) worker'dadır.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  assignScheduleDate, fetchCalendar, saveDailySettings, type CalendarResponse, type EmptyDayPolicy,
} from '@/services/api/adminDailyClient';
import { CALENDAR_DAYS, serverErrorKey, shiftDate } from '../lib/candidateFilters';

export function useDailyCalendar(enabled: boolean) {
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchCalendar(from, CALENDAR_DAYS)
      .then((res) => { if (!cancelled) setCalendar(res); })
      .catch((err) => { if (!cancelled) setErrorKey(serverErrorKey(err)); });
    return () => { cancelled = true; };
  }, [enabled, from, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  /** Görünümü `days` gün kaydırır. */
  const shift = useCallback((days: number) => {
    const start = calendar?.days[0]?.date;
    if (start) setFrom(shiftDate(start, days));
  }, [calendar]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true);
    setErrorKey(null);
    try {
      await action();
      reload();
    } catch (err) {
      setErrorKey(serverErrorKey(err));
    } finally {
      setBusy(false);
    }
  }, [reload]);

  const assign = useCallback((date: string, puzzleId: string | null) => run(() => assignScheduleDate(date, puzzleId)), [run]);
  const setPolicy = useCallback((policy: EmptyDayPolicy) => run(() => saveDailySettings(policy)), [run]);

  return { calendar, errorKey, busy, reload, shift, assign, setPolicy };
}
