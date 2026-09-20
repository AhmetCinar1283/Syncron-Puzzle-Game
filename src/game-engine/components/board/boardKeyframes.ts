/**
 * DOSYA AMACI: Tahta animasyonlarının @keyframes tanımlarını ve dekoratif
 * ("ambient") animasyon bütçesini yöneten kuralları belgeye BİR KEZ enjekte
 * etmek.
 *
 * NEDEN (enjeksiyon): GameBoard her render'da `<style dangerouslySetInnerHTML>`
 * döndürüyordu. Kare başına stil metninin yeniden birleştirilmesi ve stil
 * sayfasının yeniden ayrıştırılması animasyonun kendisinden pahalıydı.
 *
 * NEDEN (ambient bütçe): Tahtadaki buz/portal/güç/hedef/toggle/konveyör
 * hücreleri sonsuz döngüde animasyon çalıştırıyor — oyuncu hiç kıpırdamasa
 * bile. Giriş seviyesi Android WebView'de bu, ana iş parçacığını ve GPU'yu
 * sürekli meşgul tutuyor; parmak ekrana değdiğinde girdi ve tick oynatması
 * birikmiş boyama işinin arkasında kuyruğa giriyor. Çözüm iki katmanlı:
 *
 *   1. `data-board-ambient="paused"` — bir hamle oynatılırken süsler durur.
 *      Oyuncu zaten kendi taşına bakıyor; tüm kare bütçesi harekete kalır.
 *   2. `data-board-ambient="off"`    — zayıf cihazlarda (motionTier `lite`)
 *      süsler hiç çalışmaz.
 *
 * İŞLEVSEL animasyonlar (hareket, ölüm, zafer, teleport) bu listede YOKTUR;
 * onlar oyunun okunabilirliği için şart ve bazıları `animationend` olayına
 * bağlı — durdurulursa oyun kilitlenir.
 */

import { GAME_ANIMATION_KEYFRAMES } from '../effects/animationStyles';

const STYLE_ID = 'syncron-board-keyframes';

/** Tahta kökündeki `data-board-ambient` niteliğinin alabileceği değerler. */
export type BoardAmbientMode = 'on' | 'paused' | 'off';

/**
 * Yalnızca dekoratif olan, durdurulabilir animasyon sınıfları. Buraya bir sınıf
 * eklemeden önce sor: bu animasyon dursa oyuncu bir bilgi kaybeder mi? Kaybeder
 * ise (ör. elektrik akışı göstergesi) listeye girmemeli.
 */
const AMBIENT_CLASSES = [
    'ice-icon-animated',
    'portal-pulse-ring-active',
    'portal-vortex-active',
    'portal-vortex-inner-active',
    'power-ring-active',
    'power-bolt-active',
    'target-pulse-anim',
    'target-rotate-anim',
    'target-pulse-green',
    'target-pulse-blue',
    'toggle-symbol-active',
    'conveyor-arrow-1-active',
    'conveyor-arrow-2-active',
    'conveyor-arrow-3-active',
    'box-container-active',
    'player-outer-ring-reversed',
    // GameBoard'un satır içi stilleri bu sınıfları elle veriyor.
    'board-edge-flow',
    'board-edge-glow',
    'board-edge-label',
    'board-portal-crawl',
];

function ambientRules(): string {
    const paused = AMBIENT_CLASSES.map(c => `[data-board-ambient="paused"] .${c}`).join(',\n    ');
    const off = AMBIENT_CLASSES.map(c => `[data-board-ambient="off"] .${c}`).join(',\n    ');
    // `!important` şart: kenar şeritleri/etiketleri animasyonlarını satır içi
    // `style` ile alıyor ve satır içi stil, özgüllükten bağımsız olarak stil
    // sayfası kurallarını ezer. Tek istisnası `!important`.
    return `
    ${paused} {
        animation-play-state: paused !important;
    }
    ${off} {
        animation: none !important;
    }
    /*
     * Zafer koreografisi 1.75 boyunca oyuncu grafiğinin 4 kopyasını (1 ana + 3
     * hayalet iz) her karede taşır. Bu kopyaların HEPSİ bir \`blur()\` +
     * \`drop-shadow()\` zincirinin arkasında. Filtrelenmiş bir katmanın
     * rasterizasyonu, içeriği değişmediği sürece bir kez yapılıp saklanır —
     * ama PlayerGraphic içindeki \`playerBlink\`/\`playerPulse\` her göz kırpma
     * karesinde içeriği kirletiyor ve 64x64'lük Gauss bulanıklığı baştan
     * hesaplanıyor. Koreografi boyunca göz kırpmayı dondurmak katmanı
     * önbelleğe alınabilir kılar; oyuncu zaten dönen ve bulanık bir siluete
     * bakıyor, göz kırpmadığı fark edilmez.
     */
    [data-victory-freeze] * {
        animation: none !important;
    }
`;
}

/**
 * Kenar şeritleri ve portal bağlantıları.
 *
 * Eski sürüm `background-position` animasyonluyordu; bu, gradient'i her karede
 * yeniden boyamak demek. Aynı görüntü, 3 kat genişlikte bir iç katmanı
 * `transform` ile kaydırarak elde ediliyor — compositor işi, sıfır boyama.
 */
const EDGE_KEYFRAMES = `
    @keyframes edge-slide-horiz {
        0% { transform: translateX(0); }
        50% { transform: translateX(-66.667%); }
        100% { transform: translateX(0); }
    }
    @keyframes edge-slide-vert {
        0% { transform: translateY(0); }
        50% { transform: translateY(-66.667%); }
        100% { transform: translateY(0); }
    }
    @keyframes edge-glow-pulse {
        0% { opacity: 0.85; }
        50% { opacity: 1; }
        100% { opacity: 0.85; }
    }
    /* Eskiden \`filter: brightness()\` de animasyonlanıyordu — her karede yeniden
       boyama. Aynı "nefes alma" hissini ölçek + opaklık ücretsiz veriyor. */
    @keyframes label-breath {
        0% { transform: scale(1); opacity: 0.82; }
        50% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); opacity: 0.82; }
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
    style.textContent = EDGE_KEYFRAMES + GAME_ANIMATION_KEYFRAMES + ambientRules();
    document.head.appendChild(style);
}
