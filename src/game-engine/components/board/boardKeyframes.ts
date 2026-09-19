/**
 * DOSYA AMACI: Tahta animasyonlarının @keyframes tanımlarını belgeye BİR KEZ
 * enjekte etmek.
 *
 * NEDEN: GameBoard her render'da `<style dangerouslySetInnerHTML>` döndürüyordu.
 * Bu, kare başına (saniyede ~12-50 kez) stil metninin yeniden birleştirilmesi
 * ve tarayıcının stil sayfasını yeniden ayrıştırması demekti — animasyonun
 * kendisinden daha pahalı. Tanımlar statik olduğu için tek sefer yeterli.
 */

import { GAME_ANIMATION_KEYFRAMES } from '../effects/animationStyles';

const STYLE_ID = 'syncron-board-keyframes';

const EDGE_KEYFRAMES = `
    @keyframes lava-flow-horiz {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    @keyframes lava-flow-vert {
        0% { background-position: 50% 0%; }
        50% { background-position: 50% 100%; }
        100% { background-position: 50% 0%; }
    }
    @keyframes portal-shift-horiz {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    @keyframes portal-shift-vert {
        0% { background-position: 50% 0%; }
        50% { background-position: 50% 100%; }
        100% { background-position: 50% 0%; }
    }
    @keyframes edge-glow-pulse {
        0% { opacity: 0.85; }
        50% { opacity: 1; }
        100% { opacity: 0.85; }
    }
    @keyframes label-breath {
        0% { transform: scale(1); }
        50% { transform: scale(1.15); filter: brightness(1.2); }
        100% { transform: scale(1); }
    }
    @keyframes portal-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    @keyframes crawlPath {
        to { stroke-dashoffset: -20; }
    }
`;

/** Stil etiketini (yoksa) `document.head`'e ekler. Tekrar çağrılması zararsız. */
export function ensureBoardKeyframes(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = EDGE_KEYFRAMES + GAME_ANIMATION_KEYFRAMES;
    document.head.appendChild(style);
}
