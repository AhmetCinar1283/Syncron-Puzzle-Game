/**
 * DOSYA AMACI: Bu dosya, HTML5 Gamepad API aracılığıyla oyun kumandası (gamepad) girdilerini
 * dinleyen ve yönlendiren bir React hook'u sunar.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

// Yön tanımlamaları
export type GamepadDirection = 'up' | 'down' | 'left' | 'right';

// Hook parametre tipleri
interface UseGamepadProps {
  onMove?: (direction: GamepadDirection) => void;
  onRestart?: () => void;
  onMenu?: () => void;
  onConfirm?: () => void;
  onButtonPress?: (buttonIndex: number, pressed: boolean) => void;
  onAxisMove?: (axisIndex: number, value: number) => void;
  enabled?: boolean;
}

/**
 * useGamepad - Oyun kumandası (gamepad) girdilerini dinleyen ve ilgili callback'leri tetikleyen hook.
 */
export function useGamepad({
  onMove,
  onRestart,
  onMenu,
  onConfirm,
  onButtonPress,
  onAxisMove,
  enabled = true,
}: UseGamepadProps = {}) {
  // Bağlı olan aktif gamepad durumunu tutar
  const [connectedGamepad, setConnectedGamepad] = useState<Gamepad | null>(null);

  // RAF (requestAnimationFrame) döngüsünün callback güncellemelerinde sıfırlanmaması için callback referanslarını tutar
  const callbacksRef = useRef({ onMove, onRestart, onMenu, onConfirm, onButtonPress, onAxisMove });
  useEffect(() => {
    callbacksRef.current = { onMove, onRestart, onMenu, onConfirm, onButtonPress, onAxisMove };
  }, [onMove, onRestart, onMenu, onConfirm, onButtonPress, onAxisMove]);

  // Tekil tuş/eksen hareketlerini algılamak için bir önceki karedeki durumu saklar
  const prevStateRef = useRef<{
    buttons: boolean[];
    axes: number[];
  }>({
    buttons: [],
    axes: [],
  });

  // Gamepad bağlantı ve ayrılma olaylarını dinler
  useEffect(() => {
    if (!enabled) {
      setConnectedGamepad(null);
      return;
    }

    // Sayfa yüklendiğinde halihazırda bağlı olan bir gamepad varsa kontrol eder
    const checkInitialGamepads = () => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      const gps = navigator.getGamepads();
      for (let i = 0; i < gps.length; i++) {
        if (gps[i]) {
          setConnectedGamepad(gps[i]);
          break;
        }
      }
    };

    checkInitialGamepads();

    // Gamepad bağlandığında tetiklenir
    const handleConnect = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
      setConnectedGamepad(e.gamepad);
    };

    // Gamepad bağlantısı koptuğunda tetiklenir
    const handleDisconnect = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      setConnectedGamepad(null);
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, [enabled]);

  // Gamepad girdilerini sürekli olarak tarayan (polling) RAF döngüsünü başlatır
  useEffect(() => {
    if (!enabled || !connectedGamepad) return;

    let rAFId: number;

    // Gamepad verilerini tarayan ana döngü
    const pollGamepad = () => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      
      const gamepads = navigator.getGamepads();
      // Takip ettiğimiz gamepad'i dizin değerinden bulur
      const gp = gamepads[connectedGamepad.index];
      if (!gp) {
        rAFId = requestAnimationFrame(pollGamepad);
        return;
      }

      const prev = prevStateRef.current;
      const currentButtons = gp.buttons.map(b => b.pressed);
      const currentAxes = [...gp.axes];

      // İlk çalıştırmada önceki durum dizilerini sıfırlar
      if (prev.buttons.length === 0) {
        prev.buttons = new Array(gp.buttons.length).fill(false);
      }
      if (prev.axes.length === 0) {
        prev.axes = new Array(gp.axes.length).fill(0);
      }

      const { onMove: triggerMove, onRestart: triggerRestart, onMenu: triggerMenu, onConfirm: triggerConfirm, onButtonPress: triggerButtonPress, onAxisMove: triggerAxisMove } = callbacksRef.current;

      // 1. Buton Girdilerini İşle
      for (let i = 0; i < gp.buttons.length; i++) {
        const pressed = gp.buttons[i].pressed;
        const prevPressed = prev.buttons[i];

        if (pressed !== prevPressed) {
          triggerButtonPress?.(i, pressed);

          // Tuşa basıldığı an (false -> true geçişi)
          if (pressed && !prevPressed) {
            // Onay Tuşu (A / Cross)
            if (i === 0) triggerConfirm?.();

            // D-Pad Yön Tuşları
            if (i === 12) triggerMove?.('up');
            if (i === 13) triggerMove?.('down');
            if (i === 14) triggerMove?.('left');
            if (i === 15) triggerMove?.('right');

            // Yeniden Başlatma Tuşları: Y / Triangle (3), X / Square (2) veya Select (8)
            if (i === 2 || i === 3 || i === 8) {
              triggerRestart?.();
            }

            // Menü Tuşları: B / Circle (1) veya Start (9)
            if (i === 1 || i === 9) {
              triggerMenu?.();
            }
          }
        }
      }

      // 2. Analog Çubuk Girdilerini İşle (Eksenler)
      // Sol Çubuk Yatay: eksen 0, Sol Çubuk Dikey: eksen 1
      const AXIS_THRESHOLD = 0.5; // Eksen hareketi eşiği

      for (let i = 0; i < gp.axes.length; i++) {
        const val = gp.axes[i];
        const prevVal = prev.axes[i];

        if (val !== prevVal) {
          triggerAxisMove?.(i, val);
        }

        // Yatay Eksen (Sol/Sağ)
        if (i === 0) {
          if (val < -AXIS_THRESHOLD && prevVal >= -AXIS_THRESHOLD) {
            triggerMove?.('left');
          } else if (val > AXIS_THRESHOLD && prevVal <= AXIS_THRESHOLD) {
            triggerMove?.('right');
          }
        }

        // Dikey Eksen (Yukarı/Aşağı)
        if (i === 1) {
          if (val < -AXIS_THRESHOLD && prevVal >= -AXIS_THRESHOLD) {
            triggerMove?.('up');
          } else if (val > AXIS_THRESHOLD && prevVal <= AXIS_THRESHOLD) {
            triggerMove?.('down');
          }
        }
      }

      // Durumu bir sonraki kare için sakla
      prevStateRef.current = {
        buttons: currentButtons,
        axes: currentAxes,
      };

      rAFId = requestAnimationFrame(pollGamepad);
    };

    rAFId = requestAnimationFrame(pollGamepad);

    return () => {
      cancelAnimationFrame(rAFId);
    };
  }, [enabled, connectedGamepad]);

  return {
    gamepad: connectedGamepad,
    isConnected: !!connectedGamepad,
  };
}

