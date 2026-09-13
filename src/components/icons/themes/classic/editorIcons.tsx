import React from 'react';
import { IconSvgProps } from '../../types';

export const PencilIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={`${color}15`}
    />
    <path d="M15 5l4 4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const PaletteIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 9 9.5 9 1.38 0 2.5-1.12 2.5-2.5 0-.64-.24-1.22-.63-1.66-.4-.44-.62-1-.62-1.59 0-1.24 1.01-2.25 2.25-2.25H17c2.76 0 5-2.24 5-5 0-4.97-4.48-7-10-7z"
      stroke={color}
      strokeWidth="2"
      fill={`${color}15`}
    />
    <circle cx="7.5" cy="11.5" r="1.5" fill={color} />
    <circle cx="10" cy="7.5" r="1.5" fill={color} />
    <circle cx="14.5" cy="7.5" r="1.5" fill={color} />
    <circle cx="17.5" cy="11.5" r="1.5" fill={color} />
  </svg>
);

export const SaveIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
      stroke={color}
      strokeWidth="2"
      fill={`${color}15`}
      strokeLinejoin="round"
    />
    <polyline points="17 21 17 13 7 13 7 21" stroke={color} strokeWidth="2" fill={`${color}25`} />
    <polyline points="7 3 7 8 15 8" stroke={color} strokeWidth="2" />
  </svg>
);

export const PlusIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const TrashIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <polyline points="3 6 5 6 21 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CopyIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ClipboardIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke={color} strokeWidth="2" fill={`${color}10`} />
    <rect x="8" y="2" width="8" height="4" rx="1" stroke={color} strokeWidth="2" fill={`${color}30`} />
    <path d="M9 12h6M9 16h4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const EraseIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={`${color}15`}
    />
    <path d="M22 21H7M5 11l7 7" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ImportIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M12 3v12M8 11l4 4 4-4" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const FolderIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"
      stroke={color}
      strokeWidth="2"
      fill={`${color}15`}
      strokeLinejoin="round"
    />
  </svg>
);

export const WoodIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="3" y="6" width="18" height="12" rx="2" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <path d="M7 6v12M17 6v12M12 9v6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const GridIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth="2" />
    <rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth="2" />
    <rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth="2" />
    <rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth="2" />
  </svg>
);

export const SparklesIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="m12 3-1.9 6.1L4 11l6.1 1.9L12 19l1.9-6.1L20 11l-6.1-1.9L12 3Z" stroke={color} strokeWidth="2" fill={color} />
    <path d="M19 16l-.8 2.2L16 19l2.2.8L19 22l.8-2.2L22 19l-2.2-.8L19 16z" fill={color} />
  </svg>
);

export const DotIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" fill={color} />
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" opacity="0.4" />
  </svg>
);

export const RobotIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="4" y="8" width="16" height="12" rx="2" stroke={color} strokeWidth="2" fill={`${color}15`} />
    <path d="M12 2v6M9 2h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="9" cy="13" r="1.5" fill={color} />
    <circle cx="15" cy="13" r="1.5" fill={color} />
    <path d="M8 17h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M2 13h2M20 13h2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const BookIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill={`${color}15`} />
  </svg>
);

export const TemplateIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2" fill={`${color}12`} />
    <path d="M3 9h18M9 21V9" stroke={color} strokeWidth="2" />
  </svg>
);

export const ToolsIcon: React.FC<IconSvgProps> = ({ size = 20, color = 'currentColor', className, style, ...props }) => (
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
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={color}
      strokeWidth="2"
      fill={`${color}15`}
      strokeLinejoin="round"
    />
  </svg>
);
