/**
 * DOSYA AMACI: AdMob eklentisinin olay tabanlı API'sini tek seferlik bir
 * `Promise`'e çevirir. Tam ekran reklamlar "yüklendi / gösterilemedi / kapandı"
 * olaylarıyla ilerler; her bekleyiş kendi dinleyicilerini mutlaka temizler ve
 * dışarıdan (ör. `show()` çağrısı reddederse) sonlandırılabilir.
 */
import { AdMob } from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';

/** Beklenen olaylardan hangisinin geldiğini taşıyan etiket. */
export type AdEventOutcome = string;

export interface AdEventRace {
  /** İlk gelen olayın etiketiyle çözülür; asla reject etmez. */
  readonly settled: Promise<AdEventOutcome>;
  /** Yarışı dışarıdan bitirir (olay hiç gelmeyecekse asılı kalmasın). */
  finish(outcome: AdEventOutcome): void;
}

type ListenerSetup = (finish: (outcome: AdEventOutcome) => void) => Promise<PluginListenerHandle>[];

/**
 * `timeoutMs` dolarsa `'timeout'` ile çözülür. `timeoutMs: null` = süre sınırı
 * yok; reklam ekrandayken kullanıcının izleme süresi sınırlanmaz.
 */
export function raceAdEvents(setup: ListenerSetup, timeoutMs: number | null): AdEventRace {
  let settle: (outcome: AdEventOutcome) => void = () => {};
  const settled = new Promise<AdEventOutcome>((resolve) => {
    settle = resolve;
  });

  let done = false;
  let handles: PluginListenerHandle[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const removeAll = () => {
    for (const handle of handles) handle.remove().catch(() => {});
    handles = [];
  };

  const finish = (outcome: AdEventOutcome) => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    removeAll();
    settle(outcome);
  };

  if (timeoutMs !== null) {
    timer = setTimeout(() => finish('timeout'), timeoutMs);
  }

  Promise.all(setup(finish))
    .then((resolved) => {
      handles = resolved;
      // Dinleyiciler bağlanmadan önce yarış bittiyse hemen temizle.
      if (done) removeAll();
    })
    .catch((err) => {
      console.warn('[admob] Olay dinleyicileri bağlanamadı:', err);
      finish('error');
    });

  return { settled, finish };
}

/** Tek bir eklenti olayına abone olur; `raceAdEvents`'in `setup`'ında kullanılır. */
export function listen(eventName: string, onEvent: () => void): Promise<PluginListenerHandle> {
  // Eklentinin addListener imzaları olay adı başına aşırı yüklü; jenerik bir
  // sarmalayıcı istediğimiz için tip gevşetmesi TEK bu noktada yapılıyor.
  const addListener = AdMob.addListener.bind(AdMob) as unknown as (
    name: string,
    fn: () => void,
  ) => Promise<PluginListenerHandle>;
  return addListener(eventName, onEvent);
}
