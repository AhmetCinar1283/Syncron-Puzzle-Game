import React from 'react';
import { IconSvgProps } from '../../types';

export const MenuIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M4 6h16M4 12h16M4 18h16" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const CloseIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowRightIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M5 12h14M13 6l6 6-6 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowLeftIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M19 12H5M11 18l-6-6 6-6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowUpIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M12 19V5M6 11l6-6 6 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowDownIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M12 5v14M18 13l-6 6-6-6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2.2" fill={`${color}10`} />
    <path d="M21 21l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const PinIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7Z"
      stroke={color}
      strokeWidth="2"
      fill={`${color}20`}
    />
    <circle cx="12" cy="9" r="2.5" fill={color} />
  </svg>
);

export const MapIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" stroke={color} strokeWidth="2" fill={`${color}12`} strokeLinejoin="round" />
    <line x1="8" y1="2" x2="8" y2="18" stroke={color} strokeWidth="2" />
    <line x1="16" y1="6" x2="16" y2="22" stroke={color} strokeWidth="2" />
  </svg>
);

export const FullscreenIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MinimizeIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RefreshIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M21.5 2v6h-6M21.34 15.57a9 9 0 1 1-.57-8.38l6.73-1.19" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RepeatIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polyline points="17 1 21 5 17 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <polyline points="7 23 3 19 7 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const BackspaceIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M21 4H8l-6 8 6 8h13a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1Z" stroke={color} strokeWidth="2" fill={`${color}12`} strokeLinejoin="round" />
    <path d="M16 10l-4 4M12 10l4 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ExternalLinkIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
