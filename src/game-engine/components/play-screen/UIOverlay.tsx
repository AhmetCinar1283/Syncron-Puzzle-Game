'use client';

import { useEffect } from 'react';
import type { UIEvent, UIButtonType } from '../../logic/types';
import { useGamepad } from '@/hooks/useGamepad';
import type { LostReason } from './constants';
import { LostOverlay, TestSuccessOverlay, TextOverlay } from './ResultOverlays';

interface UIOverlayProps {
    event: UIEvent;
    uiEvents: UIEvent[];
    onButtonPress: (buttonType: UIButtonType) => void;
    isTestMode?: boolean;
}

/**
 * Motorun ürettiği bekleyen UI event'ine göre overlay seçer ve Enter/gamepad
 * kısayollarını bağlar. Hook'lar (keydown effect + useGamepad) her dalda
 * koşulsuz çağrılır — önceki tek-dosya sürümle aynı sıra ve yaşam döngüsü.
 */
export function UIOverlay({ event, uiEvents, onButtonPress, isTestMode }: UIOverlayProps) {
    const isError = (event.kind === 'button' && event.buttonType === 'restart') || (event.kind === 'text' && event.textType === 'error');
    const isSuccess = isTestMode && event.kind === 'button' && event.buttonType === 'next_level';

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (isError) {
                    onButtonPress('restart');
                } else if (isSuccess) {
                    onButtonPress('menu');
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isError, isSuccess, onButtonPress]);

    useGamepad({
        onConfirm: () => {
            if (isError) {
                onButtonPress('restart');
            } else if (isSuccess) {
                onButtonPress('menu');
            }
        },
        onRestart: () => {
            if (isError || isSuccess) {
                onButtonPress('restart');
            }
        },
        onMenu: () => {
            if (isSuccess) {
                onButtonPress('menu');
            }
        }
    });

    if (isError) {
        const errorTextEvent = [...uiEvents]
            .reverse()
            .find(e => e.kind === 'text' && e.textType === 'error');
        const errMsg = errorTextEvent && errorTextEvent.kind === 'text' ? errorTextEvent.message : (event.kind === 'text' ? event.message : '');

        // Motor mesajları Türkçe üretiliyor; sebep metinden çıkarılır (önceki davranış).
        let reason: LostReason = 'forbidden';
        if (errMsg.includes('Ezildiniz')) {
            reason = 'crushed';
        } else if (errMsg.includes('düştünüz') || errMsg.includes('Lav')) {
            reason = 'lava_edge';
        } else if (errMsg.includes('izini')) {
            reason = 'trail';
        }

        return <LostOverlay reason={reason} message={errMsg} onButtonPress={onButtonPress} />;
    }

    if (isSuccess) {
        return <TestSuccessOverlay onButtonPress={onButtonPress} />;
    }

    if (event.kind === 'text' && !isError) {
        return <TextOverlay message={event.message} textType={event.textType} />;
    }

    return null;
}
