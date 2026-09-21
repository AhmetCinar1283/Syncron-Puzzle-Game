/**
 * DOSYA AMACI: Boşta duran oyuncunun animasyonunu (göz kırpma, neon ters mod
 * halkasının nabzı) `ambient` bütçesine bağlamak. Yeni zamanlayıcı yok.
 *
 * NEDEN: `actors` katmanı boştayken çizilmez (00-ilkeler §2.2); bu yüzden karakter
 * "ölü" görünüyordu (08-rapor §7.5 #19). Karar: animasyon ambient'in kadansına
 * ve açık/kapalı durumuna BAĞLANIR. `ambient` bir kare çizince, ekranda boşta
 * animasyonlu bir oyuncu varsa `BoardCanvas` (a) ambient'in kendini yenilemesini
 * sürdürür, (b) kırpma/nabız durumu SON çizimden beri değiştiyse `actors`'ı da
 * kirletir — kırpma iki durumlu olduğu için 4 sn'de iki kez, nabız 12 fazlı.
 *
 * SIFIR ÇİZİM VAADİ: `ambientMode !== 'on'` ise (zayıf cihaz `lite`, zafer
 * koreografisi, hamle sürerken `paused`) hiçbir şey döndürülmez → ne ambient
 * ne actors yeniden kirlenir, RAF planlanmaz. Isınma sorununun cevabı bu satır;
 * `idle.test.ts` kilitliyor.
 *
 * Saf dosya: tuvale dokunmaz, `performance` okumaz (`now` dışarıdan gelir).
 */

import type { BoardScene } from './types';
import { isIdleAnimated, playerInputOf } from './entities/player';

/** Boşta animasyonlu bir oyuncu var ve ambient açık mı. */
export function hasIdleAnimation(scene: BoardScene): boolean {
    if (scene.ambientMode !== 'on') return false;
    return scene.entities.some(e => e.type === 'player' && isIdleAnimated(scene.theme, e.customData));
}

/**
 * Oyuncuların görüntüyü etkileyen boşta durumu (kırpma açık/kapalı, nabız fazı).
 * İki `now` için aynıysa `actors` yeniden çizilse de görüntü değişmez.
 */
export function idleSignature(scene: BoardScene, now: number): string {
    let sig = '';
    for (const e of scene.entities) {
        if (e.type !== 'player') continue;
        const input = playerInputOf(scene.theme, e.customData, now);
        sig += `${input.blinkClosed ? 1 : 0}${input.pulsePhase},`;
    }
    return sig;
}

export interface IdleWake {
    /** Ambient bir kare daha çizilmeli (döngü uyanık kalsın). */
    keepAmbient: boolean;
    /** Kırpma/nabız durumu değişti: `actors` çizilmeli. */
    drawActors: boolean;
}

export interface IdleTracker {
    /** Ambient bir kare ÇİZDİKTEN sonra çağrılır. */
    afterAmbient(scene: BoardScene, now: number): IdleWake;
    /**
     * `actors` her çizildiğinde çağrılır (hamle sırasında da): son çizilen durum
     * bilinmezse, hamleden sonra aynı görünen ama bayat bir kare kalabilirdi.
     */
    drewActors(scene: BoardScene, now: number): void;
    clear(): void;
}

const SLEEP: IdleWake = { keepAmbient: false, drawActors: false };

export function createIdleTracker(): IdleTracker {
    let lastDrawn: string | null = null;

    return {
        afterAmbient(scene, now) {
            if (!hasIdleAnimation(scene)) return SLEEP;
            return { keepAmbient: true, drawActors: idleSignature(scene, now) !== lastDrawn };
        },

        drewActors(scene, now) {
            lastDrawn = idleSignature(scene, now);
        },

        clear() {
            lastDrawn = null;
        },
    };
}
