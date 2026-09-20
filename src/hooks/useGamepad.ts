/**
 * DOSYA AMACI: Bu dosya, HTML5 Gamepad API aracılığıyla oyun kumandası (gamepad) girdilerini
 * dinleyen ve yönlendiren bir React hook'u sunar.
 *
 * Özellikler:
 * - Sürekli ve güvenilir tarama (RAF polling loop; gamepadconnected olayının atlanmasını engeller).
 * - Hold-to-repeat desteği (D-pad ve sol analog çubuk tutulduğunda akıcı gezinme).
 * - Donanımsal analog çubuk drift'ine karşı güvenli deadzone (ölü bölge) filtresi.
 * - Standart konsol tuş eşlemeleri (A: Onay, B: İptal/Geri/Menü, Y: Hızlı eylem, X/Select: Yeniden başlat).
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
  onCancel?: () => void;
  onQuickAction?: () => void;
  onButtonPress?: (buttonIndex: number, pressed: boolean) => void;
  onAxisMove?: (axisIndex: number, value: number) => void;
  enabled?: boolean;
}

const AXIS_DEADZONE_TRIGGER = 0.38;
const AXIS_DEADZONE_RELEASE = 0.20;
const INITIAL_REPEAT_DELAY_MS = 280;
const REPEAT_INTERVAL_MS = 120;

/**
 * useGamepad - Oyun kumandası (gamepad) girdilerini dinleyen ve ilgili callback'leri tetikleyen hook.
 */
export function useGamepad({
  onMove,
  onRestart,
  onMenu,
  onConfirm,
  onCancel,
  onQuickAction,
  onButtonPress,
  onAxisMove,
  enabled = true,
}: UseGamepadProps = {}) {
  // Bağlı olan aktif gamepad durumunu tutar
  const [connectedGamepad, setConnectedGamepad] = useState<Gamepad | null>(null);

  // RAF döngüsünün callback güncellemelerinde sıfırlanmaması için callback referanslarını tutar
  const callbacksRef = useRef({
    onMove,
    onRestart,
    onMenu,
    onConfirm,
    onCancel,
    onQuickAction,
    onButtonPress,
    onAxisMove,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMove,
      onRestart,
      onMenu,
      onConfirm,
      onCancel,
      onQuickAction,
      onButtonPress,
      onAxisMove,
    };
  }, [onMove, onRestart, onMenu, onConfirm, onCancel, onQuickAction, onButtonPress, onAxisMove]);

  // Tekil tuş/eksen hareketlerini algılamak için bir önceki karedeki durumu saklar
  const prevStateRef = useRef<{
    buttons: boolean[];
    axes: number[];
  }>({
    buttons: [],
    axes: [],
  });

  // Hold-to-repeat durum takibi
  const repeatStateRef = useRef<{
    direction: GamepadDirection | null;
    startTime: number;
    lastRepeatTime: number;
  }>({
    direction: null,
    startTime: 0,
    lastRepeatTime: 0,
  });

  // Analog eksen basılı olma durumları (threshold üstü)
  const axisActiveRef = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  // Gamepad bağlantı ve ayrılma olaylarını dinler
  useEffect(() => {
    if (!enabled) {
      setConnectedGamepad(null);
      return;
    }

    const handleConnect = (e: GamepadEvent) => {
      setConnectedGamepad(e.gamepad);
    };

    const handleDisconnect = (e: GamepadEvent) => {
      setConnectedGamepad((current) => (current?.index === e.gamepad.index ? null : current));
    };

    window.addEventListener('gamepadconnected', handleConnect);
    window.addEventListener('gamepaddisconnected', handleDisconnect);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnect);
      window.removeEventListener('gamepaddisconnected', handleDisconnect);
    };
  }, [enabled]);

  // Gamepad girdilerini sürekli olarak tarayan (polling) kesintisiz RAF döngüsü
  useEffect(() => {
    if (!enabled) return;

    let rAFId: number;

    const pollGamepad = (timestamp: number) => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) {
        rAFId = requestAnimationFrame(pollGamepad);
        return;
      }

      const gamepads = navigator.getGamepads();
      let gp: Gamepad | null = null;

      // 1. Önce halihazırda bağlı kabul edilen gamepad'e bak
      if (connectedGamepad && gamepads[connectedGamepad.index]) {
        gp = gamepads[connectedGamepad.index];
      } else {
        // 2. Yoksa bağlı ilk geçerli gamepad'i bul
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i]) {
            gp = gamepads[i];
            break;
          }
        }
      }

      if (gp && (!connectedGamepad || connectedGamepad.index !== gp.index)) {
        setConnectedGamepad(gp);
      } else if (!gp && connectedGamepad) {
        setConnectedGamepad(null);
      }

      if (!gp) {
        rAFId = requestAnimationFrame(pollGamepad);
        return;
      }

      const prev = prevStateRef.current;
      const currentButtons = gp.buttons.map((b) => b.pressed);
      const currentAxes = [...gp.axes];

      if (prev.buttons.length === 0) {
        prev.buttons = new Array(gp.buttons.length).fill(false);
      }
      if (prev.axes.length === 0) {
        prev.axes = new Array(gp.axes.length).fill(0);
      }

      const {
        onMove: triggerMove,
        onRestart: triggerRestart,
        onMenu: triggerMenu,
        onConfirm: triggerConfirm,
        onCancel: triggerCancel,
        onQuickAction: triggerQuickAction,
        onButtonPress: triggerButtonPress,
        onAxisMove: triggerAxisMove,
      } = callbacksRef.current;

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

            // İptal / Menü Tuşu (B / Circle)
            if (i === 1) {
              triggerCancel?.();
              triggerMenu?.();
            }

            // X / Square Tuşu
            if (i === 2) {
              triggerRestart?.();
            }

            // Hızlı Eylem / Y / Triangle Tuşu
            if (i === 3) {
              triggerQuickAction?.();
              triggerRestart?.();
            }

            // Select / Share Tuşu
            if (i === 8) {
              triggerRestart?.();
            }

            // Start / Options Tuşu
            if (i === 9) {
              triggerMenu?.();
            }
          }
        }
      }

      // 2. D-pad ve Analog Çubuk yön tespiti (Hold-to-repeat ile)
      // D-Pad butonları: 12: up, 13: down, 14: left, 15: right
      const dpadUp = gp.buttons[12]?.pressed ?? false;
      const dpadDown = gp.buttons[13]?.pressed ?? false;
      const dpadLeft = gp.buttons[14]?.pressed ?? false;
      const dpadRight = gp.buttons[15]?.pressed ?? false;

      // Sol Çubuk Eksenleri (0: Yatay, 1: Dikey)
      const axisX = gp.axes[0] ?? 0;
      const axisY = gp.axes[1] ?? 0;

      // Eksen durumlarını deadzone ile güncelle
      const activeAxes = axisActiveRef.current;

      if (axisX < -AXIS_DEADZONE_TRIGGER) activeAxes.left = true;
      else if (axisX > -AXIS_DEADZONE_RELEASE) activeAxes.left = false;

      if (axisX > AXIS_DEADZONE_TRIGGER) activeAxes.right = true;
      else if (axisX < AXIS_DEADZONE_RELEASE) activeAxes.right = false;

      if (axisY < -AXIS_DEADZONE_TRIGGER) activeAxes.up = true;
      else if (axisY > -AXIS_DEADZONE_RELEASE) activeAxes.up = false;

      if (axisY > AXIS_DEADZONE_TRIGGER) activeAxes.down = true;
      else if (axisY < AXIS_DEADZONE_RELEASE) activeAxes.down = false;

      // Analog hareket callback'ini çağır
      for (let i = 0; i < gp.axes.length; i++) {
        if (gp.axes[i] !== prev.axes[i]) {
          triggerAxisMove?.(i, gp.axes[i]);
        }
      }

      // Aktif yönü belirle (öncelik: son basılan veya belirgin eksen)
      let activeDir: GamepadDirection | null = null;
      if (dpadUp || activeAxes.up) activeDir = 'up';
      else if (dpadDown || activeAxes.down) activeDir = 'down';
      else if (dpadLeft || activeAxes.left) activeDir = 'left';
      else if (dpadRight || activeAxes.right) activeDir = 'right';

      const repeat = repeatStateRef.current;
      const now = timestamp || performance.now();

      if (activeDir) {
        if (repeat.direction !== activeDir) {
          // Yeni yön ilk basış
          repeat.direction = activeDir;
          repeat.startTime = now;
          repeat.lastRepeatTime = now;
          triggerMove?.(activeDir);
        } else {
          // Basılı tutuluyor (Hold-to-repeat)
          const heldDuration = now - repeat.startTime;
          if (heldDuration >= INITIAL_REPEAT_DELAY_MS) {
            const timeSinceLastRepeat = now - repeat.lastRepeatTime;
            if (timeSinceLastRepeat >= REPEAT_INTERVAL_MS) {
              repeat.lastRepeatTime = now;
              triggerMove?.(activeDir);
            }
          }
        }
      } else {
        // Yön tuşları bırakıldı
        repeat.direction = null;
        repeat.startTime = 0;
        repeat.lastRepeatTime = 0;
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
