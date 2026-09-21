/**
 * DOSYA AMACI: Bir hücre sprite'ının KARARTILMIŞ varyantı — sis altında
 * keşfedilmiş ama şu an görünmeyen hücrenin görüntüsü (`BoardCell.tsx`:
 * `filter: brightness(0.3) contrast(0.8)`).
 *
 * NEDEN sprite varyantı, blit üstüne `globalAlpha`'lı siyah dikdörtgen değil
 * (07-rapor §5): `contrast(0.8)` siyahı %10 griye KALDIRIR
 * (`((c*0,3) - 0,5) * 0,8 + 0,5 = 0,24c + 0,1`). Siyah dikdörtgen yalnızca
 * `c * (1 - a)` verir; koyu hücreler DOM'dan bariz ayrılırdı (00-ilkeler §4).
 * Bedeli yalnızca sisli ve karartılmış hücrelerde ödenir: sissiz bir seviyede
 * varyant hiç üretilmez.
 *
 * Rasterizasyon `variants.ts`'te (Faz 10'da genelleştirildi); `ctx.filter` orada.
 * Filtre desteği yoksa (eski WebView) karartma `source-atop` siyah örtüyle
 * taklit edilir; hangisinin kullanıldığı 07-rapor §5'te.
 */

import type { SpritePainter } from '../types';
import { filterVariantOf } from '../variants';

export const DIM_FILTER = 'brightness(0.3) contrast(0.8)';

/** Filtre desteği olmayan bağlamda sprite'ın üstüne bindirilen siyah. */
const DIM_FALLBACK_SHADE = 'rgba(0, 0, 0, 0.7)';

export function dimVariantOf<T>(base: SpritePainter<T>): SpritePainter<T> {
    return filterVariantOf(base, { filter: DIM_FILTER, suffix: 'dim', fallbackShade: DIM_FALLBACK_SHADE });
}
