/**
 * DOSYA AMACI: Tüm seslerin tek kayıt defteri. Yeni ses eklemek ya da silmek
 * burada tek satırdır; motor ve çağıranlar `SoundId`'yi buradan türetir.
 *
 * İsimler namespace'lidir: `ui.*`, `modal.*`, `notify.*`, `game.*`.
 * Basit/tonal sesler `synth`, dokusal/karmaşık sesler `file` (mp3) olarak tanımlanır.
 */

import type { SoundChannel, SoundDef, SynthRecipe } from './types';
import * as ui from './synth/recipes/ui';
import * as notify from './synth/recipes/notify';
import * as game from './synth/recipes/game';

const file = (
  url: string,
  channel: SoundChannel,
  volume: number,
  extra: Partial<Pick<SoundDef, 'pitchJitter'>> = {},
): SoundDef => ({ channel, volume, source: { kind: 'file', url }, ...extra });

const synth = (
  recipe: SynthRecipe,
  channel: SoundChannel,
  volume: number,
  extra: Partial<Pick<SoundDef, 'pitchJitter'>> = {},
): SoundDef => ({ channel, volume, source: { kind: 'synth', recipe }, ...extra });

export const SOUNDS = {
  // — Arayüz —
  'ui.tick':      synth(ui.tick, 'menu', 0.32, { pitchJitter: 0.04 }),
  'ui.navigate':  synth(ui.navigate, 'menu', 0.5),
  'ui.confirm':   synth(ui.confirm, 'menu', 0.55),
  'ui.back':      synth(ui.back, 'menu', 0.5),
  'ui.denied':    synth(ui.denied, 'menu', 0.5),
  'ui.toggleOn':  synth(ui.toggleOn, 'menu', 0.5),
  'ui.toggleOff': synth(ui.toggleOff, 'menu', 0.5),
  'ui.slider':    synth(ui.slider, 'menu', 0.35, { pitchJitter: 0.03 }),

  // — Modal —
  'modal.open':   synth(ui.modalOpen, 'menu', 0.5),
  'modal.close':  synth(ui.modalClose, 'menu', 0.45),

  // — Bildirim —
  'notify.success': synth(notify.success, 'menu', 0.5),
  'notify.error':   synth(notify.error, 'menu', 0.5),
  'notify.warning': synth(notify.warning, 'menu', 0.5),
  'notify.info':    synth(notify.info, 'menu', 0.45),
  'notify.message': synth(notify.message, 'menu', 0.45),

  // — Oyun (sentez) —
  'game.boing':    synth(game.boing, 'game', 0.5),
  'game.bump':     synth(game.bump, 'game', 0.28, { pitchJitter: 0.05 }),
  'game.toggle':   synth(ui.toggleOn, 'game', 0.45),

  // — Oyun (mp3) —
  'game.move':     file('/sounds/move.mp3', 'game', 0.4),
  'game.teleport': file('/sounds/teleport.mp3', 'game', 0.55),
  'game.ice':      file('/sounds/ice.mp3', 'game', 0.45),
  'game.conveyor': file('/sounds/conveyor.mp3', 'game', 0.5),
  'game.win':      file('/sounds/win.mp3', 'game', 0.65),
  'game.lose':     file('/sounds/lose.mp3', 'game', 0.6),
  'game.boxPush':  file('/sounds/box_push.mp3', 'game', 0.4),
} satisfies Record<string, SoundDef>;

export type SoundId = keyof typeof SOUNDS;

export const SOUND_IDS = Object.keys(SOUNDS) as SoundId[];
