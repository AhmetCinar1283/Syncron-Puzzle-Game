'use client';

/**
 * Maskot ifade önizlemesi (geliştirme sayfası). İfadeleri ayarlamak, temalar
 * arasında karşılaştırmak ve kapak/ikon için poz seçmek içindir. Oyun kodunu
 * değiştirmez; yalnızca `mascot/` çekirdeğini ve `MascotView`'u kullanır.
 *
 * Bölümler:
 *   1. Canlı    — büyük maskot + her ifade için tetikleme düğmesi (dışarıdan
 *                 tetikleme API'sinin gerçek kullanımı: `ref.emote(...)`).
 *   2. Galeri   — bütün ifadeler döngüde, tek paylaşılan denetleyiciyle.
 *   3. Zaman    — bir ifadeyi kare kare kaydır (`pose` girişi — şablon/video yolu).
 *   4. Temalar  — beş tema × altı renk, boşta; nötr görünüşün karşılaştırması.
 *
 * YALNIZCA `NEXT_PUBLIC_PLATFORM=web` BUILD'İNDE AÇILIR (bkz. render/README.md,
 * her `dev-*` route'u için geçerli kural).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ALL_THEMES, type GameTheme } from '@/game-engine/themes/themeConfig';
import { EMOTES, EMOTE_NAMES, compiledEmote, createMascotController, sampleEmote } from '@/game-engine/mascot';
import type { EmoteName } from '@/game-engine/mascot';
import { MascotView, mascotCacheSize, type MascotHandle } from '@/game-engine/components/entities/MascotView';
import { CURRENT_PLATFORM } from '@/services/monetization/platform';

const PLAYER_INDICES = [0, 1, 2, 3, 4, 5];
const ZOOMS = [1, 2, 3, 4];
/** Galeride bir ifade bitince yeniden başlamadan önceki bekleme. */
const GALLERY_GAP_MS = 700;

const btn = (active: boolean): CSSProperties => ({
    padding: '6px 12px', borderRadius: 6, border: '1px solid #475569', cursor: 'pointer',
    background: active ? '#0ea5e9' : '#0f172a', color: '#fff', fontSize: 13,
});

const card: CSSProperties = { background: '#0f172a', borderRadius: 10, padding: 10 };

/** CSS olarak büyütür; `MascotView`'a aynı `zoom` verilir ki raster keskin kalsın. */
function Scaled({ zoom, children }: { zoom: number; children: ReactNode }) {
    return (
        <div style={{ width: 64 * zoom, height: 64 * zoom, margin: 32 * zoom * 0.6 }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', width: 64, height: 64 }}>{children}</div>
        </div>
    );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
    return (
        <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 15, margin: '0 0 4px' }}>{title}</h2>
            {hint && <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>{hint}</p>}
            {children}
        </section>
    );
}

export default function Page() {
    // Build-time sabit: web dışı platformlarda ağaç hiç kurulmaz.
    if (CURRENT_PLATFORM !== 'web') return null;
    return <MascotPreview />;
}

function MascotPreview() {
    const [theme, setTheme] = useState<GameTheme>('neon');
    const [playerIndex, setPlayerIndex] = useState(0);
    const [reversed, setReversed] = useState(false);
    const [locked, setLocked] = useState(false);
    const [idle, setIdle] = useState(true);
    const [zoom, setZoom] = useState(3);
    const [cacheSize, setCacheSize] = useState(0);
    const mode = reversed ? 'reversed' : 'normal';
    const common = { theme, playerIndex, mode, locked, idle } as const;

    useEffect(() => {
        const id = setInterval(() => setCacheSize(mascotCacheSize()), 500);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#0b1220', color: '#e2e8f0', padding: 16, fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: 18, margin: '0 0 4px' }}>Maskot ifadeleri</h1>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px' }}>
                Kaynak: <code>src/game-engine/mascot/emotes.ts</code> — yeni ifade = oraya bir kayıt.
                {' '}Paylaşılan önbellek: <strong>{cacheSize}</strong> sprite.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {ALL_THEMES.map(t => <button key={t.id} style={btn(theme === t.id)} onClick={() => setTheme(t.id)}>{t.id}</button>)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {PLAYER_INDICES.map(i => <button key={i} style={btn(playerIndex === i)} onClick={() => setPlayerIndex(i)}>oyuncu {i}</button>)}
                <button style={btn(reversed)} onClick={() => setReversed(v => !v)}>ters mod</button>
                <button style={btn(locked)} onClick={() => setLocked(v => !v)}>kilitli</button>
                <button style={btn(idle)} onClick={() => setIdle(v => !v)}>boşta davranış</button>
                {ZOOMS.map(z => <button key={z} style={btn(zoom === z)} onClick={() => setZoom(z)}>{z}x</button>)}
            </div>

            <LiveSection common={common} zoom={zoom} />
            <GallerySection common={common} />
            <ScrubSection common={common} zoom={zoom} />
            <ThemesSection mode={mode} />
        </div>
    );
}

type Common = { theme: GameTheme; playerIndex: number; mode: 'normal' | 'reversed'; locked: boolean; idle: boolean };

function LiveSection({ common, zoom }: { common: Common; zoom: number }) {
    const ref = useRef<MascotHandle>(null);
    const [last, setLast] = useState<string>('');
    const fire = (name: EmoteName) => {
        const ok = ref.current?.emote(name) ?? false;
        setLast(ok ? name : `${name} (reddedildi — daha öncelikli ifade sürüyor)`);
    };
    return (
        <Section title="1. Canlı" hint="Düğme = ref.current.emote(ad). Öncelik kuralı geçerli; 'sleepy' döngülüdür, 'durdur' ile biter.">
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={card}>
                    <Scaled zoom={zoom}><MascotView ref={ref} {...common} zoom={zoom} /></Scaled>
                </div>
                <div style={{ maxWidth: 520 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {EMOTE_NAMES.map(n => (
                            <button key={n} style={btn(false)} onClick={() => fire(n)}>
                                {n} <span style={{ color: '#64748b' }}>p{EMOTES[n].priority}</span>
                            </button>
                        ))}
                        <button style={{ ...btn(false), borderColor: '#f87171' }} onClick={() => ref.current?.stop()}>durdur</button>
                    </div>
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>Son: {last || '—'}</p>
                </div>
            </div>
        </Section>
    );
}

function GallerySection({ common }: { common: Common }) {
    const ctl = useMemo(() => createMascotController(), []);

    // Biten her ifadeyi kısa bir aradan sonra yeniden başlat (döngülüler zaten sürer).
    useEffect(() => {
        const endedAt = new Map<number, number>();
        const tick = () => {
            const now = performance.now();
            EMOTE_NAMES.forEach((name, i) => {
                if (ctl.active(i, now)) return;
                const ended = endedAt.get(i);
                if (ended === undefined) { endedAt.set(i, now); return; }
                if (now - ended < GALLERY_GAP_MS) return;
                endedAt.delete(i);
                ctl.trigger(i, name, now);
            });
        };
        const id = setInterval(tick, 100);
        return () => { clearInterval(id); ctl.clear(); };
    }, [ctl]);

    return (
        <Section title="2. Galeri" hint="Her ifade döngüde; tek paylaşılan denetleyici (controller + id).">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {EMOTE_NAMES.map((name, i) => (
                    <div key={name} style={{ ...card, textAlign: 'center' }}>
                        <Scaled zoom={1.5}><MascotView {...common} controller={ctl} id={i} zoom={1.5} /></Scaled>
                        <div style={{ fontSize: 12 }}>{name}</div>
                    </div>
                ))}
            </div>
        </Section>
    );
}

function ScrubSection({ common, zoom }: { common: Common; zoom: number }) {
    const [name, setName] = useState<EmoteName>('celebrate');
    const [ms, setMs] = useState(0);
    const duration = EMOTES[name].duration;
    const pose = useMemo(() => sampleEmote(compiledEmote(name), ms), [name, ms]);

    return (
        <Section title="3. Zaman" hint="pose={sampleEmote(compiledEmote(ad), ms)} — portal şablonları ve video bu yolu kullanacak.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {EMOTE_NAMES.map(n => (
                    <button key={n} style={btn(name === n)} onClick={() => { setName(n); setMs(Math.min(ms, EMOTES[n].duration)); }}>{n}</button>
                ))}
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={card}>
                    <Scaled zoom={zoom}><MascotView {...common} pose={pose} time={ms} zoom={zoom} /></Scaled>
                </div>
                <div style={{ minWidth: 280 }}>
                    <input type="range" min={0} max={duration} value={ms} onChange={e => setMs(Number(e.target.value))} style={{ width: '100%' }} />
                    <pre style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>
                        {`${ms} / ${duration} ms\n`}
                        {`yüz: ${pose.face.left.shape}/${pose.face.right.shape} · ağız ${pose.face.mouth}${pose.face.blush ? ' · yanak' : ''}\n`}
                        {`gövde: dy ${pose.body.dy.toFixed(1)} · s ${pose.body.sx.toFixed(2)}×${pose.body.sy.toFixed(2)} · rot ${pose.body.rot.toFixed(2)}\n`}
                        {`süs: ${pose.fx ? `${pose.fx.kind} @${Math.round(pose.fx.ms)}ms` : '—'}`}
                    </pre>
                </div>
            </div>
        </Section>
    );
}

function ThemesSection({ mode }: { mode: 'normal' | 'reversed' }) {
    return (
        <Section title="4. Temalar" hint="Beş tema × altı renk, boşta (kırpma + ara sıra bakınma).">
            <div style={{ display: 'grid', gap: 8 }}>
                {ALL_THEMES.map(t => (
                    <div key={t.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 80, fontSize: 12 }}>{t.id}</div>
                        {PLAYER_INDICES.map(i => (
                            <div key={i} style={{ margin: 6 }}>
                                <MascotView theme={t.id} playerIndex={i} mode={mode} id={i * 7 + 1} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </Section>
    );
}
