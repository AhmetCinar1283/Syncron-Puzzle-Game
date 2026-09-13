/**
 * DOSYA AMACI: İpucu işaretleyicisinin ortak renk ve animasyon tanımları
 * (board işareti, HUD vurgusu ve bilgi şeridi aynı görsel dili kullanır).
 */

export const HINT_COLOR = '#facc15';
export const HINT_GLOW = 'rgba(250, 204, 21, 0.55)';

export const HINT_KEYFRAMES = `
    @keyframes hint-ring-pulse {
        0%   { transform: scale(0.92); opacity: 0.95; }
        50%  { transform: scale(1.08); opacity: 0.55; }
        100% { transform: scale(0.92); opacity: 0.95; }
    }
    @keyframes hint-arrow-nudge {
        0%   { transform: translate(0, 0); }
        50%  { transform: translate(var(--hint-dx), var(--hint-dy)); }
        100% { transform: translate(0, 0); }
    }
    @keyframes hint-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }
    @keyframes hint-button-pulse {
        0%   { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.75); }
        70%  { box-shadow: 0 0 0 10px rgba(250, 204, 21, 0); }
        100% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0); }
    }
`;
