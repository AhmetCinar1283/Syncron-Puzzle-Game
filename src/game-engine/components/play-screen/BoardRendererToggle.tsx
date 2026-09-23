/**
 * DOSYA AMACI: Geliştirme aracı — oynanış tahtasının DOM mu canvas mı çizileceğini
 * oyun ekranından tek dokunuşla değiştiren küçük anahtar.
 *
 * NEDEN: Faz 08 kararı (canvas varsayılan olsun mu) gerçek cihazda yan yana
 * karşılaştırma istiyor. Bugüne kadar geçiş yalnızca DevTools konsolundan
 * `localStorage` yazarak yapılabiliyordu; telefonda bu pratik değil. Proje
 * sahibinin isteğiyle seçim oyun ekranına taşındı.
 *
 * YALNIZCA GELİŞTİRME: `BoardArea` bunu yalnızca `NODE_ENV !== 'production'`
 * iken render eder (09-kapanis §2.5). Silinmez: tahta görüntüsünü etkileyen her
 * değişiklik iki yolda da denenir (render/README.md). Kullanıcıya dönük seçim ayarlar ekranındadır
 * (Faz 11); bu anahtar yalnızca geliştirme aracıdır.
 *
 * Seçim anında uygulanır (sayfa yenilenmez) ve `userStorage`'a yazıldığı için
 * sonraki açılışta da geçerlidir.
 */

'use client';

import type { BoardRenderer } from '../../render/boardRenderer';

const OPTIONS: BoardRenderer[] = ['dom', 'hybrid', 'canvas'];

interface BoardRendererToggleProps {
    renderer: BoardRenderer;
    onChange: (r: BoardRenderer) => void;
}

export function BoardRendererToggle({ renderer, onChange }: BoardRendererToggleProps) {
    return (
        <div
            style={{
                position: 'absolute',
                top: 4,
                right: 6,
                zIndex: 120,
                display: 'flex',
                gap: 2,
                padding: 2,
                borderRadius: 6,
                background: 'rgba(2, 6, 23, 0.72)',
                border: '1px solid rgba(148, 163, 184, 0.25)',
            }}
        >
            {OPTIONS.map(option => {
                const active = renderer === option;
                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onChange(option)}
                        style={{
                            padding: '2px 7px',
                            borderRadius: 4,
                            border: 'none',
                            font: '700 10px/1.4 ui-monospace, monospace',
                            letterSpacing: 0.4,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            color: active ? '#022c22' : '#94a3b8',
                            background: active ? '#34d399' : 'transparent',
                        }}
                    >
                        {option}
                    </button>
                );
            })}
        </div>
    );
}
