import React from 'react';
import { IconSvgProps } from '../../types';

export const WarningIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={`${color}15`}
    />
    <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="17" r="1.2" fill={color} />
  </svg>
);

export const CheckIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polyline points="20 6 9 17 4 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ErrorIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const SettingsIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill={`${color}20`} />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

export const LockIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.5" fill={color} />
  </svg>
);

export const UnlockIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="16" r="1.5" fill={color} />
  </svg>
);

export const VolumeOnIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke={color} strokeWidth="2" fill={`${color}15`} strokeLinejoin="round" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const VolumeOffIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke={color} strokeWidth="2" fill={`${color}15`} strokeLinejoin="round" />
    <line x1="23" y1="9" x2="17" y2="15" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <line x1="17" y1="9" x2="23" y2="15" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const EyeIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="2" fill={`${color}12`} />
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill={color} />
  </svg>
);

export const EyeOffIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BarChartIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const TrendUpIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17 6 23 6 23 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LightbulbIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 5.5v1.5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V14.5c1.5-1 3-3 3-5.5a7 7 0 0 0-7-7z"
      stroke={color}
      strokeWidth="2"
      fill={`${color}15`}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BanIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.2" fill={`${color}12`} />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const LoaderIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const KeyboardIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="2" fill={`${color}12`} />
    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
