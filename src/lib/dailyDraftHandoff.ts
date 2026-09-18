/**
 * DOSYA AMACI: Admin Günlük Bulmaca Takvimi'nden editöre "bu level'ı günlük bulmaca
 * olarak düzenle" aktarımının tek sözleşmesi (sessionStorage anahtarı + URL). İki
 * feature (admin/daily-calendar ve editor) birbirinin iç dosyasını import etmez;
 * ikisi de bu küçük sözleşmeyi kullanır.
 */

const DRAFT_KEY = 'dailyPuzzleDraft';

export interface DailyDraft {
  level: Record<string, unknown>;
  source: 'designed' | 'generated';
}

/** Kayıtlı bir günlük bulmacayı editörde açan URL. */
export function editorUrlForDailyPuzzle(puzzleId: string): string {
  return `/editor?dailyPuzzleId=${encodeURIComponent(puzzleId)}`;
}

/** Henüz kaydedilmemiş bir adayı editöre aktarır ve açılacak URL'yi döner. */
export function stashDailyDraft(draft: DailyDraft): string {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return '/editor?dailyDraft=1';
}

/** Editör: aktarılan adayı bir kez okur ve siler. */
export function takeDailyDraft(): DailyDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    sessionStorage.removeItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DailyDraft) : null;
  } catch {
    return null;
  }
}
