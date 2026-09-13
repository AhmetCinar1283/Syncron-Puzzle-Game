import React from 'react';
import { IconSvgProps } from '../../types';

export const UserIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2.2" fill={`${color}15`} />
  </svg>
);

export const FriendsIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M17 21v-2a4 4 0 0 0-3-3.87M9 20H3v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="9" cy="7" r="3.5" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <path d="M16 3.13a3.5 3.5 0 0 1 0 6.74" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ChatIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      stroke={color}
      strokeWidth="2"
      fill={`${color}15`}
      strokeLinejoin="round"
    />
    <circle cx="8" cy="12" r="1" fill={color} />
    <circle cx="12" cy="12" r="1" fill={color} />
    <circle cx="16" cy="12" r="1" fill={color} />
  </svg>
);

export const MailIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const HeartIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566a5 5 0 1 1 7.5 6.572"
      stroke={color}
      strokeWidth="2"
      fill={color}
      strokeLinejoin="round"
    />
  </svg>
);

export const ShieldIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth="2" fill={`${color}15`} strokeLinejoin="round" />
  </svg>
);

export const AwardIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="12" cy="8" r="6" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CoffeeIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke={color} strokeWidth="2" fill={`${color}15`} strokeLinejoin="round" />
    <line x1="6" y1="1" x2="6" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="10" y1="1" x2="10" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="14" y1="1" x2="14" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ThumbsUpIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M7 10v12M15 10.5V6a3 3 0 0 0-3-3l-5 7v12h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
      stroke={color}
      strokeWidth="2"
      fill={`${color}15`}
      strokeLinejoin="round"
    />
  </svg>
);

export const ThumbsDownIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M17 14V2M9 13.5V18a3 3 0 0 0 3 3l5-7V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm8-12h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"
      stroke={color}
      strokeWidth="2"
      fill={`${color}15`}
      strokeLinejoin="round"
    />
  </svg>
);

export const CreditCardIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth="2" fill={`${color}12`} />
    <line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth="2" />
    <circle cx="6" cy="15" r="1" fill={color} />
  </svg>
);

export const TagIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
      stroke={color}
      strokeWidth="2"
      fill={`${color}15`}
      strokeLinejoin="round"
    />
    <line x1="7" y1="7" x2="7.01" y2="7" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const GlobeIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill={`${color}10`} />
    <line x1="2" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={color} strokeWidth="2" />
  </svg>
);

export const CoinsIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" fill={`${color}20`} />
    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" stroke={color} strokeWidth="2" />
    <path d="M7 6h2v4H7z" fill={color} />
  </svg>
);
