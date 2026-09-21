/**
 * DOSYA AMACI: Tick anlık görüntülerini (`TickSnapshot[]`) bir "film" gibi
 * oynatmak: kare ilerletme ve zamanlama, kare başına ses, dokunsal geri bildirim
 * ve bitişte `onAnimationEnd`. Çizimle ilgisi yoktur — hangi karenin ekranda
 * olduğuna karar verir, o kareyi kimin çizdiğine karışmaz.
 *
 * NEDEN AYRI DOSYA: Bu mantık Faz 01'de `BoardCanvas`'a bilinçli olarak
 * KOPYALANMIŞTI (01-rapor §3.7): `GameBoard` o sırada tek üretim yoluydu, tek
 * değişiklikle iki yolu birden riske atmamak için tekrar kabul edilmişti. İki yol
 * da çalışır hâle geldiğinde (Faz 08 §2.6) ortak kısım buraya çıkarıldı; artık
 * kare zamanlaması, ses eşlemesi ve titreşim eşiği TEK yerde tanımlı.
 *
 * `GameBoard` hâlâ kaçış yolu olduğu için silinmiyor (00-ilkeler §5); ikisi de
 * bu hook'u kullanır.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { TickSnapshot, VFXEvent } from '../logic/types';
import type { SoundName } from './useSoundManager';
import { soundEngine } from '../audio/soundEngine';
import { hapticImpact, hapticNotify } from '@/lib/haptics';
import { VICTORY_CELEBRATION_DURATION } from '../components/effects/VictoryCelebration';

/**
 * Bir tick'in ekranda kalma süresi (ms). Kare süresi aynı anda DOM yolunda CSS
 * geçiş süresidir. Eski alt sınır 20ms idi: 60Hz'de bir ekran karesinden az,
 * yani geçiş hiç tamamlanmadan bir sonraki tick geliyordu — hareket akmak yerine
 * "zıplıyor" gibi görünüyordu. MIN_FRAME_MS ~3.5 ekran karesine denk gelir.
 */
const MIN_FRAME_MS = 55;
const MAX_FRAME_MS = 90;

/** Ölüm karesinden sonra `onAnimationEnd` gecikmesi (ms). */
const DEATH_HOLD_MS = 800;

const VFX_TO_SOUND: Partial<Record<string, SoundName>> = {
    sound_move:         'move',
    sound_push:         'box_push',
    sound_ice_slide:    'ice',
    sound_ice_break:    'ice',
    sound_portal_enter: 'portal',
    sound_portal_exit:  'teleport',
    sound_boing:        'boing',
    sound_conveyor:     'conveyor',
    sound_toggle:       'toggle',
    sound_win:          'win',
    sound_lose:         'lose',
};

interface FilmPlaybackOptions {
    snapshots: TickSnapshot[] | null;
    onAnimationEnd?: () => void;
    onPlaySound?: (sound: SoundName) => void;
    muted?: boolean;
}

export interface FilmPlayback {
    /** Oynatılan karenin dizini (anlık görüntü dizisinde). */
    currentFrame: number;
    /** Bu karenin ekranda kalma süresi; DOM yolunda CSS geçiş süresi. */
    frameMs: number;
    /** Ekranda olan kare. */
    snapshot: TickSnapshot | null;
    /** Bir önceki kare (hareket interpolasyonu için); ilk karede `null`. */
    prevSnapshot: TickSnapshot | null;
    /** Dizinin son karesi — zafer/ölüm kararları buna bakar. */
    finalSnapshot: TickSnapshot | null;
    /** Film sürüyor mu (son kareye gelinmedi). */
    isPlaying: boolean;
    /** Son karedeyiz ve orada bir zafer var: koreografi oynuyor. */
    isVictoryActive: boolean;
}

/**
 * Filmi oynatır ve o anki kareyi döndürür. Yan etkileri (ses, titreşim,
 * `onAnimationEnd`) kendi içinde yürütür — bu hook'u bir ağaçta İKİ KEZ
 * kullanmak sesi ve bitiş geri çağrısını çiftler.
 */
export function useFilmPlayback({ snapshots, onAnimationEnd, onPlaySound, muted }: FilmPlaybackOptions): FilmPlayback {
    const [prevSnapshots, setPrevSnapshots] = useState<TickSnapshot[] | null>(snapshots);
    const [currentFrame, setCurrentFrame] = useState(0);

    // Yeni bir dizi geldi: baştan oynat. Tek istisna, aynı filmin UZATILMASI
    // (ör. zincirleme hamle) — o zaman kaldığı yerden sürer.
    if (snapshots !== prevSnapshots) {
        setPrevSnapshots(snapshots);
        const isExtension = prevSnapshots &&
                            prevSnapshots.length > 0 &&
                            snapshots &&
                            snapshots.length > prevSnapshots.length &&
                            prevSnapshots[0] === snapshots[0];
        if (!isExtension) {
            setCurrentFrame(0);
        }
    }

    // Bitiş geri çağrısı bir ref'te tutulur ki kimliği değiştiğinde kare
    // ilerletme efekti yeniden kurulmasın. Ref'e render sırasında değil,
    // efektte yazılır; bu efekt aşağıdaki ilerletme efektinden ÖNCE tanımlı
    // olduğu için değer, kullanılmadan önce günceldir.
    const onAnimationEndRef = useRef(onAnimationEnd);
    useEffect(() => { onAnimationEndRef.current = onAnimationEnd; });

    const remainingFrames = snapshots ? snapshots.length - 1 - currentFrame : 0;
    const frameMs = snapshots
        ? remainingFrames > 3
            ? Math.max(MIN_FRAME_MS, Math.min(MAX_FRAME_MS, 420 / remainingFrames))
            : Math.max(60, Math.min(110, 300 / snapshots.length))
        : 80;

    const frameIndex = snapshots && snapshots.length > 0 ? Math.min(currentFrame, snapshots.length - 1) : 0;
    const snapshot: TickSnapshot | null = snapshots?.[frameIndex] ?? null;
    const prevSnapshot: TickSnapshot | null = (snapshots && frameIndex > 0 ? snapshots[frameIndex - 1] : null) ?? null;
    const finalSnapshot: TickSnapshot | null = snapshots?.[snapshots.length - 1] ?? null;

    // Kare ilerletme.
    useEffect(() => {
        if (!snapshots || snapshots.length === 0) return;
        if (snapshots.length === 1) return;

        if (currentFrame >= snapshots.length - 1) {
            const last = snapshots[snapshots.length - 1];
            const hasDeath = last?.entities.some(e => e.customData.deathReason) ?? false;
            const hasWin = last?.entities.some(e => e.customData.isVictory) ?? false;

            if (hasDeath) {
                const timer = setTimeout(() => { onAnimationEndRef.current?.(); }, DEATH_HOLD_MS);
                return () => clearTimeout(timer);
            } else if (hasWin) {
                const timer = setTimeout(() => { onAnimationEndRef.current?.(); }, VICTORY_CELEBRATION_DURATION);
                return () => clearTimeout(timer);
            } else {
                onAnimationEndRef.current?.();
            }
            return;
        }

        let start: number | null = null;
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            if (timestamp - start >= frameMs) {
                setCurrentFrame(c => c + 1);
            } else {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        animationFrameId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrameId);
    }, [currentFrame, snapshots, frameMs]);

    // Kare başına ses.
    useEffect(() => {
        if (muted) return;
        if (!snapshots) return;
        const frame = snapshots[currentFrame];
        if (!frame) return;
        frame.vfxEvents.forEach((vfx: VFXEvent) => {
            const soundName = VFX_TO_SOUND[vfx];
            if (!soundName) return;
            if (onPlaySound) {
                onPlaySound(soundName);
            } else {
                // PlayScreen dışındaki kullanımlar (ör. editör önizleme) için
                // aynı Web Audio motoru — HTMLAudioElement gecikmesi yok.
                soundEngine.play(soundName);
            }
        });
    }, [currentFrame, snapshots, muted, onPlaySound]);

    // Dokunsal geri bildirim: çarpma / ölüm / zafer. Sesle aynı karede verilir
    // ki görüntü-ses-titreşim üçlüsü senkron kalsın.
    useEffect(() => {
        if (!snapshots) return;
        const frame = snapshots[currentFrame];
        if (!frame) return;

        let strongest: 'none' | 'bump' | 'death' | 'victory' = 'none';
        for (const entity of frame.entities) {
            if (entity.customData.deathReason) { strongest = 'death'; break; }
            if (entity.customData.isVictory) { strongest = 'victory'; break; }
            if (entity.customData.bumpDirection) strongest = 'bump';
        }

        if (strongest === 'death') hapticNotify('error');
        else if (strongest === 'victory') hapticNotify('success');
        else if (strongest === 'bump') hapticImpact('medium');
    }, [currentFrame, snapshots]);

    const isPlaying = !!snapshots && snapshots.length > 1 && currentFrame < snapshots.length - 1;
    const hasVictory = finalSnapshot?.entities.some(e => e.customData.isVictory) ?? false;
    const isVictoryActive = !!snapshots && snapshots.length > 0 && currentFrame >= snapshots.length - 1 && hasVictory;

    return { currentFrame, frameMs, snapshot, prevSnapshot, finalSnapshot, isPlaying, isVictoryActive };
}
