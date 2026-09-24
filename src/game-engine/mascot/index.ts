/**
 * DOSYA AMACI: Maskot (oyuncu karakteri) ifade sisteminin dışa açık yüzü.
 *
 * Katmanlar:
 *   - `pose.ts`       — poz VERİSİ (yüz / gövde / süs) ve nicemleme
 *   - `timeline.ts`   — anahtar kare → an örnekleyici (saf, deterministik)
 *   - `emotes.ts`     — ifade kataloğu (yalnızca veri)
 *   - `idle.ts`       — boşta kırpma/bakınma (saf, deterministik)
 *   - `controller.ts` — dışarıdan tetikleme + öncelik
 *
 * Çizim burada DEĞİL: canvas çizicisi `render/entities/player.ts` (yüz sprite'ı)
 * ve `render/entities/mascot.ts` (gövde dönüşümü + süsler). DOM'da kullanmak
 * için `components/entities/MascotView.tsx`.
 */

export * from './pose';
export type { Ease, EmoteDef, EmoteKey, FaceDelta, CompiledEmote } from './timeline';
export { compileEmote, emoteFinished, sampleEmote } from './timeline';
export { EMOTES, EMOTE_NAMES } from './emotes';
export type { EmoteName } from './emotes';
export { BLINK_MS, blinkClosedAt, idleFaceAt } from './idle';
export { compiledEmote, createMascotController } from './controller';
export type { ActiveEmote, MascotController, TriggerOptions } from './controller';
export * from './reactions';
