/**
 * DOSYA AMACI: Uygulama arka plana alınıp geri geldiğinde reklam durumunu
 * tutarlı tutar. Android'de tam ekran reklam AYRI BİR ACTIVITY'de açılır; bu
 * sırada WebView `appStateChange(false)` alır. Geri dönüşte banner yeniden
 * görünür kılınır ve bayat bir "reklam açık" bayrağı bırakılmaz.
 */
import { App } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { resumeAdMobBanner } from './admobBanner';

let handle: PluginListenerHandle | null = null;

export async function attachAdMobLifecycle(): Promise<void> {
  if (handle) return;
  try {
    handle = await App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      // Öne dönüldü: banner'ı yeniden göster (bazı cihazlarda gizli kalıyor).
      resumeAdMobBanner().catch((err) =>
        console.warn('[admob] Banner geri getirilemedi:', err),
      );
    });
  } catch (err) {
    console.warn('[admob] Uygulama yaşam döngüsü dinleyicisi bağlanamadı:', err);
  }
}
