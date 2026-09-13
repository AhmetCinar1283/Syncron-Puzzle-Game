import React from 'react';
import { IconSvgProps } from '../../types';

export const TrophyIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path
      d="M6 3h12v4c0 3.314-2.686 6-6 6s-6-2.686-6-6V3Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={`${color}18`}
    />
    <path
      d="M6 6H3c0 2.5 1.5 4 4 4.8M18 6h3c0 2.5-1.5 4-4 4.8M12 13v4M8 21h8M9 17h6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M12 6.5l.8 1.6 1.8.3-1.3 1.2.3 1.8-1.6-.8-1.6.8.3-1.8-1.3-1.2 1.8-.3z" fill={color} />
  </svg>
);

export const GamepadIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="2" y="6" width="20" height="12" rx="4" stroke={color} strokeWidth="2" fill={`${color}12`} />
    <path d="M6 12h4M8 10v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="15.5" cy="13" r="1.2" fill={color} />
    <circle cx="18" cy="10.5" r="1.2" fill={color} />
  </svg>
);

export const JoystickIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="3" y="15" width="18" height="6" rx="2" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <path d="M12 15V8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="6" r="3" stroke={color} strokeWidth="2" fill={color} />
    <circle cx="17" cy="18" r="1" fill={color} />
  </svg>
);

export const StarIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polygon
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
    />
  </svg>
);

export const SkullIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path
      d="M5 11c0-4.418 3.134-8 7-8s7 3.582 7 8c0 2.7-1 4.7-2.5 5.8V19H7.5v-2.2C6 15.7 5 13.7 5 11Z"
      stroke={color}
      strokeWidth="2"
      fill={`${color}18`}
    />
    <circle cx="9" cy="11" r="1.5" fill={color} />
    <circle cx="15" cy="11" r="1.5" fill={color} />
    <path d="M10 19v2M14 19v2M12 15v1" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PortalIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <ellipse cx="12" cy="12" rx="9" ry="9" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
    <ellipse cx="12" cy="12" rx="6" ry="6" stroke={color} strokeWidth="2" />
    <path d="M12 3a9 9 0 0 1 7.8 13.5M12 21a9 9 0 0 1-7.8-13.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2.5" fill={color} />
  </svg>
);

export const IceIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2" fill={color} />
    <circle cx="12" cy="4" r="1" fill={color} />
    <circle cx="12" cy="20" r="1" fill={color} />
    <circle cx="4" cy="12" r="1" fill={color} />
    <circle cx="20" cy="12" r="1" fill={color} />
  </svg>
);

export const LightningIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polygon
      points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
    />
  </svg>
);

export const SwitchIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polygon points="12 2 22 12 12 22 2 12" stroke={color} strokeWidth="2" fill={`${color}20`} strokeLinejoin="round" />
    <polygon points="12 6 18 12 12 18 6 12" stroke={color} strokeWidth="1.5" fill={color} strokeLinejoin="round" />
  </svg>
);

export const BoxIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <rect x="7" y="7" width="10" height="10" stroke={color} strokeWidth="1.5" fill={`${color}25`} />
  </svg>
);

export const TargetIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="1.5" fill={`${color}20`} />
    <circle cx="12" cy="12" r="2" fill={color} />
  </svg>
);

export const ClockIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill={`${color}10`} />
    <polyline points="12 7 12 12 16 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const HourglassIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M5 2h14M5 22h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M6 2v5l4 5-4 5v5M18 2v5l-4 5 4 5v5" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <polygon points="12 12 9 17 15 17" fill={color} />
  </svg>
);

export const FootstepsIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M4 16c0 2 1.5 3 3.5 3s3.5-1 3.5-3v-4c0-2-1.5-3-3.5-3S4 10 4 12v4Z" stroke={color} strokeWidth="2" fill={`${color}20`} />
    <path d="M13 11c0 2 1.5 3 3.5 3s3.5-1 3.5-3V7c0-2-1.5-3-3.5-3S13 5 13 7v4Z" stroke={color} strokeWidth="2" fill={`${color}20`} />
  </svg>
);

export const FlagIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M4 22V3" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M4 4h14l-3 5 3 5H4V4Z" stroke={color} strokeWidth="2" fill={`${color}20`} strokeLinejoin="round" />
  </svg>
);

export const PartyIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polygon points="3 21 7 7 21 17 3 21" stroke={color} strokeWidth="2" fill={`${color}20`} strokeLinejoin="round" />
    <circle cx="16" cy="6" r="1.5" fill={color} />
    <circle cx="21" cy="9" r="1.5" fill={color} />
    <circle cx="18" cy="2" r="1.5" fill={color} />
    <path d="M11 4l2 2M16 11l2-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const ExplosionIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path
      d="M12 2l2.5 5.5L20 4.5l-2.5 6 6 1.5-5.5 3.5 4 5.5-6.5-1.5-2 6-3-5.5-6 3.5 2.5-6-5.5-2.5 6-2.5-3-6 6 2.5L12 2z"
      stroke={color}
      strokeWidth="1.75"
      fill={`${color}25`}
      strokeLinejoin="round"
    />
  </svg>
);

export const PlugIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-6 6v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const KeyIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="8" cy="15" r="5" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <path d="M12 11l9-9M17 6l2 2M19 4l2 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const MountainIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M3 20L10 6l4 8 2-4 5 10H3z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={`${color}15`} />
    <path d="M8 10l2 4 4-2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const MedalIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M7 2l3 9M17 2l-3 9M12 2v9" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="5.5" stroke={color} strokeWidth="2" fill={`${color}20`} />
    <polygon points="12 13.5 13 15.5 15.5 16 13.5 17.5 14 20 12 18.5 10 20 10.5 17.5 8.5 16 11 15.5 12 13.5" fill={color} />
  </svg>
);

export const ArchitectIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <rect x="8.5" y="3" width="7" height="7" stroke={color} strokeWidth="2" fill={`${color}25`} />
    <path d="M12 10v4M6.5 14l3.5-4M17.5 14l-3.5-4" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
  </svg>
);

export const CrownIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M3 18l2-11 5 5 2-8 2 8 5-5 2 11H3z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={`${color}25`} />
    <circle cx="5" cy="7" r="1" fill={color} />
    <circle cx="12" cy="4" r="1" fill={color} />
    <circle cx="19" cy="7" r="1" fill={color} />
    <rect x="3" y="18" width="18" height="3" rx="1" stroke={color} strokeWidth="1.5" fill={color} />
  </svg>
);

export const RetroBlockIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polygon points="12 2 22 7.5 12 13 2 7.5 12 2" stroke={color} strokeWidth="2" fill={`${color}25`} />
    <polygon points="2 7.5 12 13 12 22 2 16.5 2 7.5" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <polygon points="22 7.5 12 13 12 22 22 16.5 22 7.5" stroke={color} strokeWidth="2" fill={`${color}35`} />
  </svg>
);

export const GalaxyIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="3" fill={color} />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)" stroke={color} strokeWidth="1.75" />
    <circle cx="6" cy="8" r="1" fill={color} />
    <circle cx="18" cy="16" r="1" fill={color} />
  </svg>
);

export const RulerIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M4 20L20 4" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M7 15l2 2M11 11l2 2M15 7l2 2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);
