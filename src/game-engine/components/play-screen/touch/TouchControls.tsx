'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import {
    ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp,
    ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Undo2,
} from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { useGameTheme } from '../../../contexts/GameThemeContext';
import type { Direction } from '../../../logic/types';
import type { PadSide } from '@/services/settings';
import { TOUCH_PAD_SKINS, type TouchPadSkin } from './touchControlStyles';

/** Basılı tutunca tekrar: ilk gecikme, sonra aralık (ms). Klavye tekrarına yakın his. */
const REPEAT_DELAY_MS = 280;
const REPEAT_INTERVAL_MS = 150;

const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 540px)';

function subscribeLandscape(onChange: () => void): () => void {
    const q = window.matchMedia(LANDSCAPE_QUERY);
    q.addEventListener('change', onChange);
    return () => q.removeEventListener('change', onChange);
}
const isLandscapeShort = () => window.matchMedia(LANDSCAPE_QUERY).matches;

const GLYPHS = {
    chevron: { up: ChevronUp, down: ChevronDown, left: ChevronLeft, right: ChevronRight },
    arrow: { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight },
} as const;

interface PadButtonProps {
    skin: TouchPadSkin;
    label: string;
    onPress: () => void;
    /** Basılı tutunca tekrarla (yön tuşları). */
    repeat?: boolean;
    disabled?: boolean;
    color?: string;
    style?: CSSProperties;
    children: ReactNode;
}

/**
 * Tek dokunmatik tuş. `pointerdown`'da anında tetiklenir (click'in parmak
 * kalkmasını beklemesi yok); her tuşun kendi işaretçisi olduğundan iki başparmak
 * aynı anda farklı tuşlara basabilir.
 */
function PadButton({ skin, label, onPress, repeat, disabled, color, style, children }: PadButtonProps) {
    const [pressed, setPressed] = useState(false);
    const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Zamanlayıcı en güncel handler'ı çağırsın (triggerMove her render'da yenilenir).
    const onPressRef = useRef(onPress);
    useEffect(() => { onPressRef.current = onPress; });

    const stop = useCallback(() => {
        if (delayRef.current) clearTimeout(delayRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        delayRef.current = null;
        intervalRef.current = null;
        setPressed(false);
    }, []);

    useEffect(() => stop, [stop]);

    const handleDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
        if (disabled) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setPressed(true);
        onPressRef.current();
        if (repeat) {
            delayRef.current = setTimeout(() => {
                intervalRef.current = setInterval(() => onPressRef.current(), REPEAT_INTERVAL_MS);
            }, REPEAT_DELAY_MS);
        }
    };

    return (
        <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onPointerDown={handleDown}
            onPointerUp={stop}
            onPointerCancel={stop}
            onContextMenu={(e) => e.preventDefault()}
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                borderRadius: skin.radius,
                color: color ?? skin.accent,
                cursor: 'pointer',
                opacity: disabled ? 0.35 : 1,
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitTapHighlightColor: 'transparent',
                outline: 'none',
                ...skin.idle,
                ...(pressed && !disabled ? skin.pressed : null),
                ...style,
            }}
        >
            {children}
        </button>
    );
}

interface TouchControlsLayoutProps {
    /** `false` iken yalnızca `children` (board) çizilir; DOM yapısı değişmez, tahta yeniden kurulmaz. */
    enabled: boolean;
    /** Yön tuşlarının durduğu taraf; geri al / oda tuşları karşı tarafa geçer. */
    padSide: PadSide;
    onDirection: (direction: Direction) => void;
    onUndo: () => void;
    undoDisabled: boolean;
    /** Verilirse (yalnızca seçili-oda modunda, birden çok oda varken) oda değiştirme tuşu çıkar. */
    onSwitchRoom?: () => void;
    children: ReactNode;
}

/**
 * Board'u saran yerleşim + dokunmatik tuşlar.
 *  - Dikey: board üstte, altında tek şerit (solda geri al / oda, sağda yön tuşları).
 *    Başparmağın doğal bölgesi; board kalan alana ölçeklenir, ekrandan taşmaz.
 *  - Yatay (kısa ekran): tuşlar board'un iki yanına geçer, dikey alan board'a kalır.
 * Tuş boyutu `--tc` ile ekran genişlik/yüksekliğine göre sınırlanır.
 */
export function TouchControlsLayout({
    enabled, padSide, onDirection, onUndo, undoDisabled, onSwitchRoom, children,
}: TouchControlsLayoutProps) {
    const t = useT();
    const { theme } = useGameTheme();
    const skin = TOUCH_PAD_SKINS[theme];
    const landscape = useSyncExternalStore(subscribeLandscape, isLandscapeShort, () => false);

    const glyphs = GLYPHS[skin.glyph];
    const iconSize = 'calc(var(--tc) * 0.5)';
    const dir = (d: Direction, label: string, area: string) => {
        const Icon = glyphs[d];
        return (
            <div style={{ gridArea: area, minWidth: 0, minHeight: 0 }}>
                <PadButton skin={skin} label={label} repeat onPress={() => onDirection(d)}>
                    <Icon style={{ width: iconSize, height: iconSize, filter: `drop-shadow(0 0 4px ${skin.accent}66)` }} strokeWidth={skin.iconStroke} />
                </PadButton>
            </div>
        );
    };

    const wrapperStyle: CSSProperties = {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        gridTemplateRows: landscape ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
        gridTemplateAreas: landscape
            ? (padSide === 'left' ? '"pad board side"' : '"side board pad"')
            : (padSide === 'left' ? '"board board board" "pad . side"' : '"board board board" "side . pad"'),
        // Yatayda yükseklik kıt: tuş boyu yüksekliğe bağlı; dikeyde genişliğe de.
        ['--tc' as string]: landscape ? 'clamp(40px, 15vh, 58px)' : 'clamp(44px, min(14.5vw, 8.2vh), 62px)',
    };

    const cluster: CSSProperties = {
        display: 'flex',
        gap: 'calc(var(--tc) * 0.16)',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: landscape ? 'column' : 'row',
        padding: landscape ? '0 10px' : '4px 10px 10px',
        boxSizing: 'border-box',
        alignSelf: landscape ? 'center' : 'end',
    };

    const gap = 'calc(var(--tc) * 0.08)';

    return (
        <div style={wrapperStyle}>
            <div style={{ gridArea: 'board', minWidth: 0, minHeight: 0, display: 'flex' }}>
                {children}
            </div>

            {enabled && (
                <>
                    {/* Sol başparmak: geri al (+ oda değiştir) */}
                    <div style={{ ...cluster, gridArea: 'side' }}>
                        <div style={{ width: 'calc(var(--tc) * 1.1)', height: 'calc(var(--tc) * 1.1)' }}>
                            <PadButton
                                skin={skin}
                                label={t('hud.undo')}
                                disabled={undoDisabled}
                                color={skin.secondary}
                                onPress={onUndo}
                            >
                                <Undo2 style={{ width: 'calc(var(--tc) * 0.5)', height: 'calc(var(--tc) * 0.5)' }} strokeWidth={skin.iconStroke} />
                            </PadButton>
                        </div>
                        {onSwitchRoom && (
                            <div style={{ width: 'calc(var(--tc) * 1.1)', height: 'calc(var(--tc) * 1.1)' }}>
                                <PadButton
                                    skin={skin}
                                    label={t('hud.switch_room')}
                                    color={skin.secondary}
                                    onPress={onSwitchRoom}
                                >
                                    <ArrowLeftRight style={{ width: 'calc(var(--tc) * 0.5)', height: 'calc(var(--tc) * 0.5)' }} strokeWidth={skin.iconStroke} />
                                </PadButton>
                            </div>
                        )}
                    </div>

                    {/* Sağ başparmak: yön tuşları (artı düzeni) */}
                    <div
                        style={{
                            gridArea: 'pad',
                            display: 'grid',
                            gridTemplate: 'repeat(3, var(--tc)) / repeat(3, var(--tc))',
                            gridTemplateAreas: '". u ." "l h r" ". d ."',
                            gap,
                            padding: landscape ? '0 10px' : '4px 10px 10px',
                            alignSelf: landscape ? 'center' : 'end',
                        }}
                    >
                        {dir('up', t('hud.move_up'), 'u')}
                        {dir('left', t('hud.move_left'), 'l')}
                        <div aria-hidden style={{ gridArea: 'h', ...skin.hub }} />
                        {dir('right', t('hud.move_right'), 'r')}
                        {dir('down', t('hud.move_down'), 'd')}
                    </div>
                </>
            )}
        </div>
    );
}
