/**
 * DOSYA AMACI: Günlük bulmacanın tek tarih referansı (UTC) için saf yardımcılar:
 * bugünün tarihi, gün ekleme/çıkarma, tarih doğrulama ve bulmaca numarası (#N).
 */

import { DAILY_POLICY } from './dailyPolicy';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/** 'YYYY-MM-DD' biçiminde ve takvimde gerçekten var olan bir tarih mi. */
export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Verilen andaki UTC günü ('YYYY-MM-DD'). */
export function utcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  return new Date(d.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** `b - a` gün farkı. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

/** Paylaşım metnindeki bulmaca numarası: başlangıç tarihi #1'dir. */
export function puzzleNumber(date: string): number {
  return daysBetween(DAILY_POLICY.epochDate, date) + 1;
}
