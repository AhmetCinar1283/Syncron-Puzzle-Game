/**
 * DOSYA AMACI: Bir metni kullanıcının paylaşım yoluyla dışarı verir: yerel uygulamada
 * Capacitor paylaşım menüsü, destekleyen tarayıcıda Web Share API, aksi hâlde pano.
 * Asla throw etmez; sonucu döner. Capacitor eklentisi yalnızca yerel platformda
 * dinamik import edilir (web/portal bundle'ının açılış yüküne girmez).
 */

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface SharePayload {
  text: string;
  /** Link ayrıca verilirse yerel menüler önizleme için kullanır; metne de eklenmiş olmalıdır. */
  url?: string;
  title?: string;
}

async function isNativePlatform(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function isAbort(err: unknown): boolean {
  const message = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /abort|cancel/i.test(message);
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // iframe (portal) içinde pano izni olmayabilir → eski yönteme düş.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export async function shareText(payload: SharePayload): Promise<ShareOutcome> {
  if (await isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: payload.title, text: payload.text, url: payload.url, dialogTitle: payload.title });
      return 'shared';
    } catch (err) {
      if (isAbort(err)) return 'cancelled';
      console.warn('[Share] native share failed, falling back to clipboard:', err);
    }
  } else if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      // Metin linki zaten içerir; url ayrıca verilirse bazı hedefler linki iki kez yazar.
      await navigator.share({ title: payload.title, text: payload.text });
      return 'shared';
    } catch (err) {
      if (isAbort(err)) return 'cancelled';
    }
  }
  return (await copyToClipboard(payload.text)) ? 'copied' : 'failed';
}
