import React from 'react';
import { GameIcon } from './GameIcon';
import { resolveIconName } from './emojiMap';
import { GameIconProps } from './types';

// Regex matching unicode emojis supported by our icon system
const EMOJI_REGEX = /([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{200D}\u{FE0F}\u{2713}\u{2714}\u{2715}\u{2716}\u{2717}\u{2718}\u{26A0}\u{260E}\u{2709}\u{2699}\u{267B}\u{25C8}\u{26A1}\u{2605}\u{2728}\u{27A1}\u{270E}\u{2630}\u{232B}\u{267E}\u{2620}\u{23F1}\u{23F2}\u{23F3}]+)/u;

export function renderWithIcons(
  text: string,
  iconProps?: Partial<GameIconProps>
): React.ReactNode {
  if (!text) return text;

  const parts = text.split(EMOJI_REGEX);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    const iconName = resolveIconName(part.trim());
    if (iconName) {
      return (
        <GameIcon
          key={index}
          name={iconName}
          size={iconProps?.size ?? '1.1em'}
          style={{
            marginRight: index < parts.length - 1 ? '4px' : undefined,
            marginLeft: index > 0 ? '4px' : undefined,
            ...iconProps?.style,
          }}
          {...iconProps}
        />
      );
    }
    return part;
  });
}
