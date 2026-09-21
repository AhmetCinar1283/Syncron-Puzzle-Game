'use client';

/**
 * GEÇİCİ — Faz 02/03 karar sayfası. Karar verilince SİLİNECEK (src/app/dev-cell-compare/).
 * DOM hücre çizicileri ile canvas rasterleyicilerini yan yana (veya üst üste
 * "göz kırpma" modunda) gösterir. Oyun kodunu değiştirmez.
 *
 * Faz 03'te on iki hücre tipinin hepsi eklendi. Üç tipin (`conveyor`,
 * `teleport`, `trampoline`) GEÇİCİ "çalışıyor" hâli zamanlayıcıyla sönüyor;
 * "etkin durum" düğmesi açıkken DOM tarafı varlığı 300 ms'de bir gidip gelen
 * bir varlıkla sürekli tetiklenir (zamanlayıcılar 500–800 ms), canvas tarafına
 * da `isActive: true` verilir — böylece iki taraf aynı anda etkin görünür.
 *
 * Sağ üstteki `cache.size()` okuması, sayfadaki BÜTÜN hücrelerin PAYLAŞTIĞI tek
 * sprite önbelleğinin doluluğudur (faz planı §4 ölçütü).
 *
 * YALNIZCA `NEXT_PUBLIC_PLATFORM=web` BUILD'İNDE AÇILIR (Faz 08 §2.5c). Android
 * ve portal build'lerinde route dosyası yine üretilir ama sayfa hiçbir şey
 * render etmez — geliştirme yüzeyi oyuncunun eline geçmez. Bu, her `dev-*`
 * route'u için geçerli kuraldır (bkz. src/game-engine/render/README.md).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { ALL_THEMES, type GameTheme } from '@/game-engine/themes/themeConfig';
import { CELL_RENDERERS } from '@/game-engine/components/cells/CELL_RENDERERS';
import { ensureBoardKeyframes } from '@/game-engine/components/board/boardKeyframes';
import { CELL_AMBIENT_SPRITES, CELL_SPRITES } from '@/game-engine/render/cells';
import { BASE_PHASE } from '@/game-engine/render/cells/ice';
import { createSpriteCache, type SpriteCache } from '@/game-engine/render/spriteCache';
import { onIconsReady } from '@/game-engine/render/icons';
import { currentDpr } from '@/game-engine/render/surface';
import { PHASES } from '@/game-engine/render/types';
import type { Cell, CellTypes } from '@/game-engine/logic/cellTypes';
import type { Entity } from '@/game-engine/logic/entityTypes';
import { CURRENT_PLATFORM } from '@/services/monetization/platform';

const PAD = 12;
const CELL = 64;

interface CellCase {
    label: string;
    type: CellTypes;
    occupied?: boolean;
    electrified?: boolean;
    customData?: Record<string, unknown>;
    /** Geçici "çalışıyor" hâli olan tipler — "etkin durum" düğmesi bunları sürer. */
    canActivate?: boolean;
}

const CASES: CellCase[] = [
    { label: 'normal', type: 'normal' },
    { label: 'obstacle', type: 'obstacle' },
    { label: 'forbidden', type: 'forbidden' },
    { label: 'ice (boş)', type: 'ice' },
    { label: 'ice (dolu)', type: 'ice', occupied: true },
    { label: 'power (boş)', type: 'power' },
    { label: 'power (dolu)', type: 'power', occupied: true },
    { label: 'toggle (boş)', type: 'toggle' },
    { label: 'toggle (dolu)', type: 'toggle', occupied: true },
    { label: 'conveyor (sönük)', type: 'conveyor', customData: { direction: 'right' } },
    { label: 'conveyor (elektrikli)', type: 'conveyor', electrified: true, customData: { direction: 'right' }, canActivate: true },
    { label: 'conveyor (aşağı)', type: 'conveyor', electrified: true, customData: { direction: 'down' } },
    { label: 'trampoline (yukarı)', type: 'trampoline', customData: { direction: 'up' }, canActivate: true },
    { label: 'trampoline (sol)', type: 'trampoline', customData: { direction: 'left' } },
    { label: 'teleport (A, giriş)', type: 'teleport', customData: { group: 'A', isIn: true }, canActivate: true },
    { label: 'teleport (B, çıkış)', type: 'teleport', customData: { group: 'B', isIn: false } },
    { label: 'teleport (C, giriş)', type: 'teleport', customData: { group: 'C', isIn: true } },
    { label: 'target (oyuncu 0)', type: 'target', customData: { playerIndex: 0 } },
    { label: 'target (oyuncu 1)', type: 'target', customData: { playerIndex: 1 } },
    { label: 'control_switch (boş)', type: 'control_switch', customData: { action: 'cycle' } },
    { label: 'control_switch (dolu)', type: 'control_switch', occupied: true, customData: { action: 'swap' } },
    { label: 'direction_deflector (boş)', type: 'direction_deflector' },
    {
        label: 'direction_deflector (dolu)', type: 'direction_deflector', occupied: true,
        customData: { mapping: { up: 'left', right: 'up', down: 'right', left: 'down' } },
    },
];

const ZOOMS = [1, 2, 4, 6];
const FAKE_ENTITY = { id: 1 } as unknown as Entity;
/** DOM zamanlayıcılarından (500–800 ms) kısa: etkin hâl sürekli tazelenir. */
const RETRIGGER_MS = 300;

function makeCell(c: CellCase): Cell {
    return {
        id: `cmp-${c.label}`,
        type: c.type,
        position: { row: 0, col: 0 },
        def: { friction: 1, isWalkable: true },
        isElectrified: c.electrified ?? false,
        customData: c.customData ?? {},
    };
}

function DomCell({ c, driven, pulse }: { c: CellCase; driven: boolean; pulse: boolean }) {
    const Renderer = CELL_RENDERERS[c.type];
    // Etkin sürüşte varlık gidip gelir: hem `justArrived` hem `justLeft` tetiklenir.
    const [entity, prev] = driven
        ? (pulse ? [FAKE_ENTITY, null] : [null, FAKE_ENTITY])
        : [c.occupied ? FAKE_ENTITY : null, null];
    return (
        <div style={{ width: CELL, height: CELL, backgroundColor: '#020617', position: 'relative' }}>
            <Renderer cell={makeCell(c)} entityOnCell={entity} prevEntityOnCell={prev} />
        </div>
    );
}

function CanvasCell({ c, theme, zoom, animate, isActive, cache }: {
    c: CellCase; theme: GameTheme; zoom: number; animate: boolean; isActive: boolean; cache: SpriteCache;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const [iconTick, setIconTick] = useState(0);
    useEffect(() => onIconsReady(() => setIconTick(t => t + 1)), []);

    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const scale = currentDpr() * zoom;
        const size = CELL + PAD * 2;
        canvas.width = Math.round(size * scale);
        canvas.height = Math.round(size * scale);
        canvas.style.width = `${size * zoom}px`;
        canvas.style.height = `${size * zoom}px`;

        const blit = (sprite: HTMLCanvasElement, w: number, h: number) =>
            ctx.drawImage(sprite, PAD - (w - CELL) / 2, PAD - (h - CELL) / 2, w, h);

        let raf = 0;
        const paint = (now: number) => {
            ctx.setTransform(scale, 0, 0, scale, 0, 0);
            ctx.clearRect(0, 0, size, size);
            ctx.fillStyle = '#020617';
            ctx.fillRect(PAD, PAD, CELL, CELL);
            const input = { cell: makeCell(c), theme, isOccupied: c.occupied ?? false, isActive, phase: 0 };
            const painter = CELL_SPRITES[c.type];
            const { w, h } = painter.size(input);
            blit(cache.get(painter, input), w, h);

            const ambient = CELL_AMBIENT_SPRITES[c.type];
            if (ambient?.isAnimated(input)) {
                const phase = animate
                    ? Math.floor(((now % ambient.periodMs) / ambient.periodMs) * PHASES) % PHASES
                    : BASE_PHASE;
                const withPhase = { ...input, phase };
                const s = ambient.painter.size(withPhase);
                blit(cache.get(ambient.painter, withPhase), s.w, s.h);
                if (animate) raf = requestAnimationFrame(paint);
            }
        };
        raf = requestAnimationFrame(paint);
        return () => cancelAnimationFrame(raf);
    }, [c, theme, zoom, animate, isActive, cache, iconTick]);

    return <canvas ref={ref} style={{ display: 'block' }} />;
}

const btn = (active: boolean): CSSProperties => ({
    padding: '6px 12px', borderRadius: 6, border: '1px solid #475569', cursor: 'pointer',
    background: active ? '#0ea5e9' : '#0f172a', color: '#fff', fontSize: 13,
});

export default function Page() {
    // Build-time sabit: web dışı platformlarda ağaç hiç kurulmaz.
    if (CURRENT_PLATFORM !== 'web') return null;
    return <CellCompare />;
}

function CellCompare() {
    const { theme, setTheme } = useGameTheme();
    const [zoom, setZoom] = useState(1);
    const [animate, setAnimate] = useState(true);
    const [blink, setBlink] = useState(false);
    const [showCanvas, setShowCanvas] = useState(false);
    const [active, setActive] = useState(false);
    const [pulse, setPulse] = useState(false);
    const [cacheSize, setCacheSize] = useState(0);
    useEffect(() => { ensureBoardKeyframes(); }, []);

    // Sayfadaki bütün hücreler TEK önbelleği paylaşır ki `cache.size()` okuması
    // tahtadaki gerçek doluluğa karşılık gelsin.
    const cache = useMemo(() => createSpriteCache(currentDpr() * zoom), [zoom]);
    useEffect(() => { cache.clear(); }, [cache, theme]);

    useEffect(() => {
        const id = setInterval(() => setCacheSize(cache.size()), 500);
        return () => clearInterval(id);
    }, [cache]);

    useEffect(() => {
        // `active` kapalıyken `pulse` hiç okunmaz (bkz. `driven`), sıfırlamaya gerek yok.
        if (!active) return;
        const id = setInterval(() => setPulse(p => !p), RETRIGGER_MS);
        return () => clearInterval(id);
    }, [active]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Space') { e.preventDefault(); setShowCanvas(v => !v); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const box = (extra?: CSSProperties): CSSProperties => ({
        padding: PAD * zoom, background: '#020617', ...extra,
    });
    const domScaled = (c: CellCase) => (
        <div style={{ width: (CELL + PAD * 2) * zoom, height: (CELL + PAD * 2) * zoom, position: 'relative' }}>
            <div style={{ position: 'absolute', left: PAD * zoom, top: PAD * zoom, transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
                <DomCell c={c} driven={active && !!c.canActivate} pulse={pulse} />
            </div>
        </div>
    );

    return (
        <div data-board-ambient={animate ? 'on' : 'off'} style={{ minHeight: '100vh', background: '#0b1220', color: '#e2e8f0', padding: 16, fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: 18, marginBottom: 4 }}>Hücre karşılaştırma (GEÇİCİ — Faz 02/03)</h1>
            <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                Sol: DOM · Sağ: Canvas. Göz kırpma modunda Boşluk tuşu veya düğme ikisi arasında geçer.
                {' '}Paylaşılan önbellek: <strong>{cacheSize}</strong> sprite.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {ALL_THEMES.map(t => (
                    <button key={t.id} style={btn(theme === t.id)} onClick={() => setTheme(t.id)}>{t.id}</button>
                ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {ZOOMS.map(z => <button key={z} style={btn(zoom === z)} onClick={() => setZoom(z)}>{z}x</button>)}
                <button style={btn(animate)} onClick={() => setAnimate(a => !a)}>animasyon: {animate ? 'açık (on)' : 'kapalı (off)'}</button>
                <button style={btn(active)} onClick={() => setActive(a => !a)}>etkin durum: {active ? 'açık' : 'kapalı'}</button>
                <button style={btn(blink)} onClick={() => setBlink(b => !b)}>göz kırpma modu</button>
                {blink && <button style={btn(showCanvas)} onClick={() => setShowCanvas(v => !v)}>gösterilen: {showCanvas ? 'CANVAS' : 'DOM'}</button>}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
                {CASES.map(c => {
                    const isActive = active && !!c.canActivate;
                    const canvasCell = (
                        <CanvasCell c={c} theme={theme} zoom={zoom} animate={animate} isActive={isActive} cache={cache} />
                    );
                    return (
                        <div key={c.label} style={{ background: '#0f172a', borderRadius: 8, padding: 6 }}>
                            <div style={{ fontSize: 12, marginBottom: 4 }}>
                                {c.label}
                                {c.canActivate && <span style={{ color: '#38bdf8' }}> ⏱</span>}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {blink ? (
                                    <div style={box({ padding: 0 })}>
                                        {showCanvas ? canvasCell : domScaled(c)}
                                    </div>
                                ) : (
                                    <>
                                        <div style={box({ padding: 0 })}>{domScaled(c)}</div>
                                        <div style={box({ padding: 0 })}>{canvasCell}</div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
