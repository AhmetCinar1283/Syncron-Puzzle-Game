import { IconName } from './types';

export const EMOJI_TO_ICON: Record<string, IconName> = {
  // Gameplay & Engine
  '🏆': 'trophy',
  '🎮': 'gamepad',
  '🕹': 'joystick',
  '🕹️': 'joystick',
  '★': 'star',
  '⭐': 'star',
  '☠': 'skull',
  '🌀': 'portal',
  '❄': 'ice',
  '⚡': 'lightning',
  '❖': 'switch',
  '🎯': 'target',
  '🕦': 'clock',
  '⏱': 'timer',
  '⏱️': 'timer',
  '⏳': 'hourglass',
  '👟': 'footsteps',
  '🏁': 'flag',
  '🎉': 'party',
  '💥': 'explosion',
  '🔌': 'plug',
  '🔑': 'key',
  '🏔': 'mountain',
  '🏅': 'medal',
  '🏗': 'architect',
  '👑': 'crown',
  '🗺': 'map',
  '🗺️': 'map',
  '🟦': 'retro-block',
  '📐': 'ruler',
  '🌌': 'galaxy',

  // Navigation & UI
  '☰': 'menu',
  '✕': 'close',
  '✗': 'close',
  '❌': 'error',
  '➔': 'arrow-right',
  '↩': 'arrow-left',
  '↪': 'arrow-right',
  '←': 'arrow-left',
  '→': 'arrow-right',
  '↑': 'arrow-up',
  '↓': 'arrow-down',
  '⚲': 'search',
  '📍': 'pin',
  '🗖': 'fullscreen',
  '🗗': 'minimize',
  '🔄': 'refresh',
  '🔁': 'repeat',
  '⌫': 'backspace',

  // Editor & Tools
  '✎': 'pencil',
  '🎨': 'palette',
  '💾': 'save',
  '➕': 'plus',
  '🗑': 'trash',
  '📋': 'clipboard',
  '📥': 'import',
  '📂': 'folder',
  '🪵': 'wood',
  '✦': 'sparkles',
  '✨': 'sparkles',
  '🟢': 'dot',
  '🤖': 'robot',
  '📚': 'book',
  '📝': 'template',
  '🛠': 'tools',
  '🛠️': 'tools',

  // Social & Monetization
  '👤': 'user',
  '👥': 'friends',
  '💬': 'chat',
  '✉': 'mail',
  '✉️': 'mail',
  '💳': 'credit-card',
  '🏷': 'tag',
  '🏷️': 'tag',
  '🌐': 'globe',
  '☕': 'coffee',
  '👍': 'thumbs-up',
  '👎': 'thumbs-down',

  // System & Status
  '⚠': 'warning',
  '⚠️': 'warning',
  '✓': 'check',
  '⚙': 'settings',
  '⚙️': 'settings',
  '🔒': 'lock',
  '🔓': 'unlock',
  '🔇': 'volume-off',
  '🔊': 'volume-on',
  '👁': 'eye',
  '👁️': 'eye',
  '📊': 'bar-chart',
  '📈': 'trend-up',
  '💡': 'lightbulb',
  '🚫': 'ban',
  '⌨': 'keyboard',
};

/**
 * Normalizes input name or emoji to an IconName if known
 */
export function resolveIconName(input: string): IconName | null {
  if (EMOJI_TO_ICON[input]) {
    return EMOJI_TO_ICON[input];
  }
  // Strip variation selector if present
  const clean = input.replace(/\uFE0F/g, '');
  if (EMOJI_TO_ICON[clean]) {
    return EMOJI_TO_ICON[clean];
  }
  return null;
}
