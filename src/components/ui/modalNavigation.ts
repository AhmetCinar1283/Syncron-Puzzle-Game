/**
 * DOSYA AMACI: `Modal`'ın `keyboardNav` modunda kullandığı odak (focus) gezintisi
 * yardımcıları. Gezinti DOM odağı üzerinden yapılır; böylece butonlar, girdiler,
 * onay kutuları ve bağlantılar için ayrı bir "aktif indeks" durumu tutmaya gerek
 * kalmaz ve Enter/Space yerel (native) davranışıyla çalışır.
 *
 * Bir öğeyi gezintiden çıkarmak için `data-nav-skip` verin.
 */

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type NavStep = 'prev' | 'next';

/** Panel içinde (başlık hariç) görünür ve gezinilebilir öğeler, DOM sırasıyla. */
export function getNavItems(panel: HTMLElement | null): HTMLElement[] {
  if (!panel) return [];
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.closest('.home-sheet__header') &&
      !el.closest('[data-nav-skip]') &&
      el.getClientRects().length > 0,
  );
}

/** Metin yazılan alan mı? (Bu alanlarda yalnızca ↑/↓ gezinti sayılır.) */
export function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(el.type);
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

/** Odağı bir adım kaydırır (uçlarda başa/sona sarar). Odaklanan öğeyi döndürür. */
export function stepFocus(panel: HTMLElement | null, step: NavStep): HTMLElement | null {
  const items = getNavItems(panel);
  if (items.length === 0) return null;
  const current = items.indexOf(document.activeElement as HTMLElement);
  let next: number;
  if (current === -1) next = step === 'next' ? 0 : items.length - 1;
  else next = (current + (step === 'next' ? 1 : -1) + items.length) % items.length;
  items[next].focus();
  return items[next];
}

/** Açılışta odaklanacak öğe: `data-autofocus` varsa o, yoksa ilk gezinilebilir öğe. */
export function focusInitial(panel: HTMLElement | null): void {
  if (!panel) return;
  const preferred = panel.querySelector<HTMLElement>('[data-autofocus]');
  (preferred ?? getNavItems(panel)[0])?.focus({ preventScroll: true });
}

/** Odaktaki öğeyi "onayla" (d-pad A tuşu). Metin alanlarında bir şey yapmaz. */
export function activateFocused(panel: HTMLElement | null): void {
  const el = document.activeElement as HTMLElement | null;
  if (!panel || !el || !panel.contains(el)) {
    focusInitial(panel);
    return;
  }
  if (isTextEntry(el)) return;
  el.click();
}
