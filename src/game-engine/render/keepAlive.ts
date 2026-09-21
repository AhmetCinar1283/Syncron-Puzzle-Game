/**
 * DOSYA AMACI: "Şu katman şu ana kadar kirli kalsın" diyen TEK yer.
 *
 * NEDEN: Bir katmanı kirletmek onu bir kez çizdirir; oysa süresi olan geçişler
 * (sis 300ms, buz 200ms, teleport 600ms, oda 250ms, trambolin ezilmesi 500ms)
 * her karede yeniden çizim ister. Zamanlayıcı yalnızca kirli bayrağa bakar
 * (00-ilkeler §2.2); geçişin süresini bilen çizici bunu dönüş değeriyle
 * söyleyemez, çünkü geçiş sahne değişince BAŞLAR, çizim sırasında değil.
 * Bu yüzden başlatan taraf bitiş damgasını buraya yazar; `BoardCanvas` her
 * çizimden sonra `active`e bakıp katmanı yeniden kirletir. Faz 07'de sis geçişi
 * için ayrıca kurulmuştu; Faz 10 onu genelleştirdi.
 *
 * Saf dosya: `performance`/`Date` okumaz, `now` dışarıdan gelir.
 */

import type { LayerName } from './types';

export interface KeepAlive {
    /** Katmanları `until` damgasına (ms) kadar kirli tutar. Daha erken bir bitiş mevcut olanı KISALTMAZ. */
    hold(layers: readonly LayerName[], until: number): void;
    /** `now` anında bu katmanın tutulması sürüyor mu. */
    active(layer: LayerName, now: number): boolean;
    clear(): void;
}

export function createKeepAlive(): KeepAlive {
    const until: Record<LayerName, number> = { static: -Infinity, ambient: -Infinity, actors: -Infinity };

    return {
        hold(layers, end) {
            for (const layer of layers) until[layer] = Math.max(until[layer], end);
        },

        active(layer, now) {
            return now < until[layer];
        },

        clear() {
            until.static = -Infinity;
            until.ambient = -Infinity;
            until.actors = -Infinity;
        },
    };
}
