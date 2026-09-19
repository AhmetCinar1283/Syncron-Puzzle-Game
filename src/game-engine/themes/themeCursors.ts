// src/game-engine/themes/themeCursors.ts
// Custom themed SVG cursors for Syncron across all 5 themes:
// arcade, legacy, neon, blueprint, cosmic

import { GameTheme } from './themeConfig';

export type CursorType = 'default' | 'pointer' | 'crosshair' | 'text' | 'grab' | 'grabbing' | 'notAllowed';

export interface CursorDefinition {
  type: CursorType;
  hotspot: [number, number];
  fallback: string;
  svg: string;
  cssValue: string;
}

export interface ThemeCursorSet {
  theme: GameTheme;
  default: CursorDefinition;
  pointer: CursorDefinition;
  crosshair: CursorDefinition;
  text: CursorDefinition;
  grab: CursorDefinition;
  grabbing: CursorDefinition;
  notAllowed: CursorDefinition;
}

/**
 * Encodes an SVG string into a data URI suitable for CSS cursor: url(...)
 */
export function encodeSvgForCursor(svg: string): string {
  const cleaned = svg.replace(/\s+/g, ' ').trim();
  const encoded = encodeURIComponent(cleaned)
    .replace(/%20/g, ' ')
    .replace(/%3D/g, '=')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/');
  return `data:image/svg+xml,${encoded}`;
}

function createCursor(
  type: CursorType,
  hotspot: [number, number],
  fallback: string,
  svg: string
): CursorDefinition {
  const dataUrl = encodeSvgForCursor(svg);
  return {
    type,
    hotspot,
    fallback,
    svg,
    cssValue: `url("${dataUrl}") ${hotspot[0]} ${hotspot[1]}, ${fallback}`,
  };
}

// ============================================================================
// 1. ARCADE THEME (8-bit Pixel Retro, Yellow #facc15 & Black Outline)
// ============================================================================
const ARCADE_DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">
  <!-- Outer black 1px pixel border with 1:1 diagonal staircase -->
  <path d="M0,0 v17 h2 v-2 h1 v-1 h1 v-1 h2 v4 h1 v2 h4 v-3 h-1 v-2 h-1 v-2 h3 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 z" fill="#000000"/>
  <!-- Golden yellow body -->
  <path d="M1,1 v14 h1 v-2 h1 v-1 h1 v-1 h2 v3 h1 v3 h2 v-2 h-1 v-2 h-1 v-3 h3 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 h-1 v-1 z" fill="#facc15"/>
  <!-- White highlight pixels along vertical and diagonal -->
  <rect x="1" y="1" width="1" height="13" fill="#ffffff"/>
  <rect x="2" y="2" width="1" height="1" fill="#ffffff"/>
  <rect x="3" y="3" width="1" height="1" fill="#ffffff"/>
  <rect x="4" y="4" width="1" height="1" fill="#ffffff"/>
  <rect x="5" y="5" width="1" height="1" fill="#ffffff"/>
  <!-- Subtle retro depth pixel on tail -->
  <rect x="8" y="15" width="2" height="2" fill="#ca8a04"/>
</svg>`;

const ARCADE_POINTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <!-- Bold black outline of classic pointing glove hand -->
  <path d="M8,1.5 C6.8,1.5 6,2.3 6,3.5 L6,11.5 L4.8,11.5 C3.5,11.5 2.5,12.5 2.5,13.8 C2.5,15.5 4,18 6.5,21.5 L15.5,21.5 C18,21.5 19.5,19.2 19.5,16.5 L19.5,12 C19.5,10.8 18.5,10 17.3,10 C17,10 16.5,10.2 16,10.6 L16,9.5 C16,8.3 15,7.5 13.8,7.5 C13.4,7.5 13,7.7 12.5,8 L12.5,7 C12.5,5.8 11.5,5 10.3,5 C9.8,5 9.4,5.2 9,5.5 L9,3.5 C9,2.3 8.2,1.5 8,1.5 Z" 
        fill="#facc15" stroke="#000000" stroke-width="2" stroke-linejoin="round"/>
  <!-- Finger divider lines (black) -->
  <line x1="12.5" y1="8" x2="12.5" y2="13" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="16" y1="10.5" x2="16" y2="14.5" stroke="#000000" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M6,11.5 C4.5,11.5 3.8,12.5 3.8,14 C3.8,15.5 4.8,17 6.5,18.5" stroke="#000000" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <!-- White highlight along index finger -->
  <circle cx="8" cy="3.5" r="1.2" fill="#ffffff"/>
  <line x1="7.5" y1="5.5" x2="7.5" y2="11" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
  <!-- White cuff bar at wrist -->
  <rect x="7" y="19.5" width="8" height="1.5" fill="#ffffff" rx="0.5"/>
</svg>`;

const ARCADE_CROSSHAIR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">
  <!-- 8-bit Plus/Crosshair with black outline -->
  <path d="M10,2 h4 v7 h7 v6 h-7 v7 h-4 v-7 h-7 v-6 h7 v-7 z" fill="#000000"/>
  <path d="M11,3 h2 v7 h7 v4 h-7 v7 h-2 v-7 h-7 v-4 h7 v-7 z" fill="#facc15"/>
  <!-- Center aperture / sight dot -->
  <rect x="11" y="11" width="2" height="2" fill="#000000"/>
  <!-- Highlights -->
  <rect x="11" y="4" width="1" height="2" fill="#ffffff"/>
  <rect x="4" y="11" width="2" height="1" fill="#ffffff"/>
</svg>`;

const ARCADE_GRAB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">
  <path d="M5,4 h3 v5 h2 v-6 h3 v6 h2 v-5 h3 v7 h2 v9 h-13 v-5 h-2 v-7 h2 v-4 z" fill="#000000"/>
  <path d="M6,5 h1 v5 h2 v-5 h1 v6 h2 v-4 h1 v6 h2 v7 h-10 v-4 h-2 v-6 h2 v-4 z" fill="#facc15"/>
  <rect x="6" y="5" width="1" height="2" fill="#ffffff"/>
</svg>`;

const ARCADE_GRABBING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">
  <path d="M6,7 h12 v12 h-12 z" fill="#000000"/>
  <path d="M7,8 h10 v10 h-10 z" fill="#facc15"/>
  <rect x="8" y="9" width="3" height="3" fill="#ffffff"/>
  <rect x="12" y="9" width="4" height="2" fill="#eab308"/>
</svg>`;

const ARCADE_NOT_ALLOWED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">
  <circle cx="12" cy="12" r="9" fill="#ef4444" stroke="#000000" stroke-width="2"/>
  <line x1="6" y1="6" x2="18" y2="18" stroke="#000000" stroke-width="3"/>
  <line x1="6" y1="6" x2="18" y2="18" stroke="#ffffff" stroke-width="1.5"/>
</svg>`;

const ARCADE_TEXT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" shape-rendering="crispEdges">
  <!-- Outer black 1px pixel border of 8-bit I-beam -->
  <path d="M7,3 h10 v3 h-3 v12 h3 v3 h-10 v-3 h3 v-12 h-3 z" fill="#000000"/>
  <!-- Yellow body -->
  <path d="M8,4 h8 v1 h-3 v14 h3 v1 h-8 v-1 h3 v-14 h-3 z" fill="#facc15"/>
  <!-- Crisp white center beam and highlights -->
  <rect x="11" y="4" width="2" height="16" fill="#ffffff"/>
  <rect x="9" y="4" width="2" height="1" fill="#fef08a"/>
  <rect x="9" y="19" width="2" height="1" fill="#fef08a"/>
</svg>`;

// ============================================================================
// 2. LEGACY THEME (Classic Retro, Cyan #00c4ff & Clean Minimalist Lines)
// ============================================================================
const LEGACY_DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="leg-sh" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="1" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.8"/>
  </filter>
  <!-- Sharp geometric chevron arrow -->
  <path d="M2.5,2.5 L2.5,18 L7.2,13.8 L11.8,21 L14.5,19.2 L9.8,12.2 L15.5,12.2 Z" 
        fill="#081426" stroke="#00c4ff" stroke-width="1.6" stroke-linejoin="round" filter="url(#leg-sh)"/>
  <path d="M4,4.5 L4,14 L7,11.2 L11,17.5 L12.2,16.7 L8.2,10.5 L12.5,10.5 Z" fill="#0e2340"/>
  <path d="M3.5,3.5 L3.5,9.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

const LEGACY_POINTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="leg-p-sh">
    <feDropShadow dx="1" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.9"/>
  </filter>
  <!-- Hand silhouette with extended index finger -->
  <path d="M8,1.5 C6.8,1.5 6,2.3 6,3.5 L6,11.5 L4.8,11.5 C3.5,11.5 2.5,12.5 2.5,13.8 C2.5,15.5 4,18 6.5,21.5 L15.5,21.5 C18,21.5 19.5,19.2 19.5,16.5 L19.5,12 C19.5,10.8 18.5,10 17.3,10 C17,10 16.5,10.2 16,10.6 L16,9.5 C16,8.3 15,7.5 13.8,7.5 C13.4,7.5 13,7.7 12.5,8 L12.5,7 C12.5,5.8 11.5,5 10.3,5 C9.8,5 9.4,5.2 9,5.5 L9,3.5 C9,2.3 8.2,1.5 8,1.5 Z" 
        fill="#081426" stroke="#00c4ff" stroke-width="1.6" stroke-linejoin="round" filter="url(#leg-p-sh)"/>
  <!-- Finger divider creases -->
  <line x1="12.5" y1="8" x2="12.5" y2="13" stroke="#00c4ff" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="16" y1="10.5" x2="16" y2="14.5" stroke="#00c4ff" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M6,11.5 C4.5,11.5 3.8,12.5 3.8,14 C3.8,15.5 4.8,17 6.5,18.5" stroke="#00c4ff" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <!-- Crisp white highlight on pointing index -->
  <circle cx="8" cy="3.5" r="1.2" fill="#ffffff"/>
  <line x1="7.5" y1="5.5" x2="7.5" y2="10.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

const LEGACY_CROSSHAIR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="leg-c-sh">
    <feDropShadow dx="0" dy="0" stdDeviation="1" flood-color="#000000" flood-opacity="0.9"/>
  </filter>
  <!-- Drop contrast ring -->
  <circle cx="12" cy="12" r="5.5" fill="none" stroke="#000000" stroke-width="2.5" opacity="0.6"/>
  <!-- Precise thin cyan crosshair with central box -->
  <line x1="12" y1="2" x2="12" y2="7.5" stroke="#00c4ff" stroke-width="1.6" stroke-linecap="round" filter="url(#leg-c-sh)"/>
  <line x1="12" y1="16.5" x2="12" y2="22" stroke="#00c4ff" stroke-width="1.6" stroke-linecap="round" filter="url(#leg-c-sh)"/>
  <line x1="2" y1="12" x2="7.5" y2="12" stroke="#00c4ff" stroke-width="1.6" stroke-linecap="round" filter="url(#leg-c-sh)"/>
  <line x1="16.5" y1="12" x2="22" y2="12" stroke="#00c4ff" stroke-width="1.6" stroke-linecap="round" filter="url(#leg-c-sh)"/>
  <!-- Precision center dot -->
  <circle cx="12" cy="12" r="1.5" fill="#ffffff" stroke="#00c4ff" stroke-width="0.8"/>
</svg>`;

const LEGACY_GRAB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M5,8 C5,7 6,6 7,6 C8,6 9,7 9,8 L9,12 M9,6 C9,5 10,4 11,4 C12,4 13,5 13,6 L13,12 M13,6 C13,5 14,4 15,4 C16,4 17,5 17,6 L17,12 M17,8 C17,7 18,6 19,6 C20,6 21,7 21,8 L21,15 C21,19 17,22 13,22 C9,22 5,19 5,15 Z" 
        fill="#081426" stroke="#00c4ff" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

const LEGACY_GRABBING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M7,10 C7,9 8,8 9,8 L15,8 C16,8 17,9 17,10 L17,13 C17,17 14,20 12,20 C10,20 7,17 7,13 Z" 
        fill="#081426" stroke="#00c4ff" stroke-width="1.5"/>
  <circle cx="12" cy="12" r="2" fill="#00c4ff"/>
</svg>`;

const LEGACY_NOT_ALLOWED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="8.5" fill="#1e1018" stroke="#f43f5e" stroke-width="1.8"/>
  <line x1="6" y1="6" x2="18" y2="18" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const LEGACY_TEXT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="leg-t-sh">
    <feDropShadow dx="1" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.9"/>
  </filter>
  <!-- Cyan I-beam outline with navy fill -->
  <path d="M7,4 L17,4 L17,7 L13.5,7 L13.5,17 L17,17 L17,20 L7,20 L7,17 L10.5,17 L10.5,7 L7,7 Z" 
        fill="#081426" stroke="#00c4ff" stroke-width="1.6" stroke-linejoin="round" filter="url(#leg-t-sh)"/>
  <!-- Center crisp highlight line -->
  <line x1="12" y1="5.5" x2="12" y2="18.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Top and bottom accent caps -->
  <line x1="8.5" y1="5.5" x2="15.5" y2="5.5" stroke="#00c4ff" stroke-width="1"/>
  <line x1="8.5" y1="18.5" x2="15.5" y2="18.5" stroke="#00c4ff" stroke-width="1"/>
</svg>`;

// ============================================================================
// 3. NEON THEME (Neon Cyber, Electric Green #00ff88 & Cyan Glow HUD)
// ============================================================================
const NEON_DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#00ff88" flood-opacity="0.8"/>
    <feDropShadow dx="1" dy="2" stdDeviation="1" flood-color="#000000" flood-opacity="0.9"/>
  </filter>
  <!-- Cyber HUD Stealth Arrow -->
  <path d="M2.5,2.5 L2.5,19 L7.5,14.5 L11.5,21.5 L14,20 L9.8,13 L16.5,13 Z" 
        fill="#030712" stroke="#00ff88" stroke-width="1.6" stroke-linejoin="round" filter="url(#neon-glow)"/>
  <path d="M4.5,4.5 L4.5,14.5 L8,11.5 L12,18 L12.8,17.4 L9.2,11.2 L13.5,11.2 Z" fill="#041d13"/>
  <!-- Neon cyan core laser stripe -->
  <line x1="4" y1="4" x2="4" y2="11" stroke="#00c4ff" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

const NEON_POINTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="neon-p-glow">
    <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#00ff88" flood-opacity="0.8"/>
    <feDropShadow dx="1" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.9"/>
  </filter>
  <!-- Cyber pointing hand -->
  <path d="M8,1.5 C6.8,1.5 6,2.3 6,3.5 L6,11.5 L4.8,11.5 C3.5,11.5 2.5,12.5 2.5,13.8 C2.5,15.5 4,18 6.5,21.5 L15.5,21.5 C18,21.5 19.5,19.2 19.5,16.5 L19.5,12 C19.5,10.8 18.5,10 17.3,10 C17,10 16.5,10.2 16,10.6 L16,9.5 C16,8.3 15,7.5 13.8,7.5 C13.4,7.5 13,7.7 12.5,8 L12.5,7 C12.5,5.8 11.5,5 10.3,5 C9.8,5 9.4,5.2 9,5.5 L9,3.5 C9,2.3 8.2,1.5 8,1.5 Z" 
        fill="#030712" stroke="#00ff88" stroke-width="1.6" stroke-linejoin="round" filter="url(#neon-p-glow)"/>
  <!-- Cyber joint segmentation lines -->
  <line x1="6" y1="7" x2="9" y2="7" stroke="#00c4ff" stroke-width="1.2"/>
  <line x1="12.5" y1="8" x2="12.5" y2="13" stroke="#00c4ff" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="16" y1="10.5" x2="16" y2="14.5" stroke="#00c4ff" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Glowing laser pulse dot at index tip -->
  <circle cx="8" cy="3.5" r="2" fill="#00ff88" stroke="#00c4ff" stroke-width="0.8"/>
  <circle cx="8" cy="3.5" r="0.8" fill="#ffffff"/>
</svg>`;

const NEON_CROSSHAIR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="neon-c-glow">
    <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#00ff88" flood-opacity="0.8"/>
  </filter>
  <!-- Outer 4 corner HUD brackets -->
  <path d="M5,9 L5,5 L9,5" fill="none" stroke="#00ff88" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M15,5 L19,5 L19,9" fill="none" stroke="#00ff88" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M5,15 L5,19 L9,19" fill="none" stroke="#00ff88" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M15,19 L19,19 L19,15" fill="none" stroke="#00ff88" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Central crosshair lines -->
  <line x1="12" y1="6" x2="12" y2="9.5" stroke="#00c4ff" stroke-width="1.5" stroke-linecap="round" filter="url(#neon-c-glow)"/>
  <line x1="12" y1="14.5" x2="12" y2="18" stroke="#00c4ff" stroke-width="1.5" stroke-linecap="round" filter="url(#neon-c-glow)"/>
  <line x1="6" y1="12" x2="9.5" y2="12" stroke="#00c4ff" stroke-width="1.5" stroke-linecap="round" filter="url(#neon-c-glow)"/>
  <line x1="14.5" y1="12" x2="18" y2="12" stroke="#00c4ff" stroke-width="1.5" stroke-linecap="round" filter="url(#neon-c-glow)"/>
  <!-- Glowing center target dot -->
  <circle cx="12" cy="12" r="1.5" fill="#00ff88" stroke="#ffffff" stroke-width="0.6"/>
</svg>`;

const NEON_GRAB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M6,7 C6,6 7,5 8,5 C9,5 10,6 10,7 L10,12 M10,5 C10,4 11,3 12,3 C13,3 14,4 14,5 L14,12 M14,5 C14,4 15,3 16,3 C17,3 18,4 18,5 L18,12 M18,7 C18,6 19,5 20,5 C21,5 22,6 22,7 L22,14 C22,18 18,21 14,21 C10,21 6,18 6,14 Z" 
        fill="#030712" stroke="#00ff88" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="14" cy="14" r="2.5" fill="#042317" stroke="#00c4ff" stroke-width="1"/>
</svg>`;

const NEON_GRABBING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <rect x="7" y="7" width="10" height="11" rx="4" fill="#030712" stroke="#00ff88" stroke-width="1.6"/>
  <line x1="7" y1="11" x2="17" y2="11" stroke="#00ff88" stroke-width="1.2"/>
  <circle cx="12" cy="14" r="1.5" fill="#00c4ff"/>
</svg>`;

const NEON_NOT_ALLOWED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="8.5" fill="#1a050d" stroke="#ff0055" stroke-width="1.8"/>
  <line x1="6" y1="6" x2="18" y2="18" stroke="#ff0055" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="6" fill="none" stroke="#ff0055" stroke-width="0.8" stroke-dasharray="2 2"/>
</svg>`;

const NEON_TEXT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="neon-t-glow">
    <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#00ff88" flood-opacity="0.85"/>
    <feDropShadow dx="1" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.9"/>
  </filter>
  <!-- Cyber HUD bracketed I-beam -->
  <path d="M7,4 L17,4 L17,7 L13.5,7 L13.5,17 L17,17 L17,20 L7,20 L7,17 L10.5,17 L10.5,7 L7,7 Z" 
        fill="#030712" stroke="#00ff88" stroke-width="1.6" stroke-linejoin="round" filter="url(#neon-t-glow)"/>
  <!-- Cyan core laser beam -->
  <line x1="12" y1="5" x2="12" y2="19" stroke="#00c4ff" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="12" cy="12" r="1.5" fill="#00ff88" stroke="#ffffff" stroke-width="0.6"/>
</svg>`;

// ============================================================================
// 4. BLUEPRINT THEME (Blueprint Draft, Architectural Sky Blue #38bdf8 & CAD)
// ============================================================================
const BLUEPRINT_DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="bp-sh">
    <feDropShadow dx="1" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.85"/>
  </filter>
  <!-- Technical CAD drafting needle arrow -->
  <path d="M2.5,2.5 L2.5,19 L7,14.5 L11,21.5 L13.8,19.8 L9.8,12.8 L16,12.8 Z" 
        fill="#07182e" stroke="#38bdf8" stroke-width="1.6" stroke-linejoin="round" filter="url(#bp-sh)"/>
  <path d="M4,4.5 L4,14 L7,11.5 L11,17.8 L12,17.2 L8.2,11 L12.5,11 Z" fill="#0c274c"/>
  <!-- Drafting measurement tick marks along edge -->
  <line x1="2.5" y1="7" x2="5.5" y2="7" stroke="#e0f2fe" stroke-width="1"/>
  <line x1="2.5" y1="11" x2="5.5" y2="11" stroke="#e0f2fe" stroke-width="1"/>
  <circle cx="2.5" cy="2.5" r="1" fill="#ffffff"/>
</svg>`;

const BLUEPRINT_POINTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="bp-p-sh">
    <feDropShadow dx="1" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.9"/>
  </filter>
  <!-- Technical CAD drafting hand -->
  <path d="M8,1.5 C6.8,1.5 6,2.3 6,3.5 L6,11.5 L4.8,11.5 C3.5,11.5 2.5,12.5 2.5,13.8 C2.5,15.5 4,18 6.5,21.5 L15.5,21.5 C18,21.5 19.5,19.2 19.5,16.5 L19.5,12 C19.5,10.8 18.5,10 17.3,10 C17,10 16.5,10.2 16,10.6 L16,9.5 C16,8.3 15,7.5 13.8,7.5 C13.4,7.5 13,7.7 12.5,8 L12.5,7 C12.5,5.8 11.5,5 10.3,5 C9.8,5 9.4,5.2 9,5.5 L9,3.5 C9,2.3 8.2,1.5 8,1.5 Z" 
        fill="#07182e" stroke="#38bdf8" stroke-width="1.6" stroke-linejoin="round" filter="url(#bp-p-sh)"/>
  <!-- Technical finger dividers -->
  <line x1="12.5" y1="8" x2="12.5" y2="13" stroke="#7dd3fc" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="16" y1="10.5" x2="16" y2="14.5" stroke="#7dd3fc" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Technical CAD target crosshair at index tip -->
  <circle cx="8" cy="3.5" r="2.2" fill="none" stroke="#7dd3fc" stroke-width="0.9" stroke-dasharray="2 1"/>
  <circle cx="8" cy="3.5" r="0.8" fill="#ffffff"/>
  <!-- Technical measurement tick mark at wrist -->
  <line x1="7" y1="19.5" x2="15" y2="19.5" stroke="#7dd3fc" stroke-width="1" stroke-dasharray="2 2"/>
</svg>`;

const BLUEPRINT_CROSSHAIR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <!-- Dark contrast backing -->
  <rect x="9.5" y="9.5" width="5" height="5" fill="#000000" opacity="0.6"/>
  <!-- Fine CAD drafting crosshair lines with scale marks -->
  <line x1="12" y1="1" x2="12" y2="23" stroke="#38bdf8" stroke-width="1.3"/>
  <line x1="1" y1="12" x2="23" y2="12" stroke="#38bdf8" stroke-width="1.3"/>
  <!-- Central CAD aperture square -->
  <rect x="10" y="10" width="4" height="4" fill="#07182e" stroke="#7dd3fc" stroke-width="1"/>
  <!-- Calibration tick marks along crosshair axes -->
  <line x1="10" y1="5" x2="14" y2="5" stroke="#7dd3fc" stroke-width="1"/>
  <line x1="10" y1="19" x2="14" y2="19" stroke="#7dd3fc" stroke-width="1"/>
  <line x1="5" y1="10" x2="5" y2="14" stroke="#7dd3fc" stroke-width="1"/>
  <line x1="19" y1="10" x2="19" y2="14" stroke="#7dd3fc" stroke-width="1"/>
</svg>`;

const BLUEPRINT_GRAB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M5,8 C5,7 6,6 7,6 C8,6 9,7 9,8 L9,12 M9,6 C9,5 10,4 11,4 C12,4 13,5 13,6 L13,12 M13,6 C13,5 14,4 15,4 C16,4 17,5 17,6 L17,12 M17,8 C17,7 18,6 19,6 C20,6 21,7 21,8 L21,15 C21,19 17,22 13,22 C9,22 5,19 5,15 Z" 
        fill="#07182e" stroke="#38bdf8" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="7" y1="15" x2="19" y2="15" stroke="#7dd3fc" stroke-width="1" stroke-dasharray="2 2"/>
</svg>`;

const BLUEPRINT_GRABBING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <rect x="7" y="8" width="10" height="10" rx="2" fill="#07182e" stroke="#38bdf8" stroke-width="1.5"/>
  <path d="M9,11 L12,8 L15,11 M9,15 L12,18 L15,15" stroke="#7dd3fc" stroke-width="1" fill="none"/>
</svg>`;

const BLUEPRINT_NOT_ALLOWED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="8.5" fill="#200d16" stroke="#f43f5e" stroke-width="1.8" stroke-dasharray="3 1.5"/>
  <line x1="6" y1="6" x2="18" y2="18" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const BLUEPRINT_TEXT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="bp-t-sh">
    <feDropShadow dx="1" dy="1.5" stdDeviation="1" flood-color="#000000" flood-opacity="0.9"/>
  </filter>
  <!-- Technical CAD I-beam -->
  <path d="M7,4 L17,4 L17,7 L13.5,7 L13.5,17 L17,17 L17,20 L7,20 L7,17 L10.5,17 L10.5,7 L7,7 Z" 
        fill="#07182e" stroke="#38bdf8" stroke-width="1.6" stroke-linejoin="round" filter="url(#bp-t-sh)"/>
  <!-- Central drafting line -->
  <line x1="12" y1="3" x2="12" y2="21" stroke="#38bdf8" stroke-width="1.2"/>
  <!-- Precision measurement tick marks -->
  <line x1="10" y1="12" x2="14" y2="12" stroke="#7dd3fc" stroke-width="1"/>
  <circle cx="12" cy="4" r="1" fill="#ffffff"/>
  <circle cx="12" cy="20" r="1" fill="#ffffff"/>
</svg>`;

// ============================================================================
// 5. COSMIC THEME (Cosmic Void, Lavender #a78bfa & Starlight Shard)
// ============================================================================
const COSMIC_DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="cos-sh">
    <feDropShadow dx="1" dy="1.5" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.9"/>
    <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#a78bfa" flood-opacity="0.5"/>
  </filter>
  <!-- Obsidian crystal shard arrow -->
  <path d="M2.5,2.5 L2.5,18.5 L7.5,14 L11.5,21.5 L14.2,19.8 L10,12.5 L16.2,12.5 Z" 
        fill="#0b0617" stroke="#a78bfa" stroke-width="1.6" stroke-linejoin="round" filter="url(#cos-sh)"/>
  <path d="M4,4.5 L4,14 L7.5,11.2 L11.5,17.8 L12.5,17.2 L8.8,10.8 L12.8,10.8 Z" fill="#190d36"/>
  <!-- 4-point star sparkle at tip -->
  <path d="M3,3 L4.5,2.5 L3,2 L2.5,0.5 L2,2 L0.5,2.5 L2,3 L2.5,4.5 Z" fill="#ffffff"/>
  <circle cx="2.5" cy="2.5" r="0.8" fill="#c4b5fd"/>
</svg>`;

const COSMIC_POINTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="cos-p-sh">
    <feDropShadow dx="1" dy="1.5" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.9"/>
    <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#a78bfa" flood-opacity="0.65"/>
  </filter>
  <!-- Cosmic obsidian hand -->
  <path d="M8,1.5 C6.8,1.5 6,2.3 6,3.5 L6,11.5 L4.8,11.5 C3.5,11.5 2.5,12.5 2.5,13.8 C2.5,15.5 4,18 6.5,21.5 L15.5,21.5 C18,21.5 19.5,19.2 19.5,16.5 L19.5,12 C19.5,10.8 18.5,10 17.3,10 C17,10 16.5,10.2 16,10.6 L16,9.5 C16,8.3 15,7.5 13.8,7.5 C13.4,7.5 13,7.7 12.5,8 L12.5,7 C12.5,5.8 11.5,5 10.3,5 C9.8,5 9.4,5.2 9,5.5 L9,3.5 C9,2.3 8.2,1.5 8,1.5 Z" 
        fill="#0b0617" stroke="#a78bfa" stroke-width="1.6" stroke-linejoin="round" filter="url(#cos-p-sh)"/>
  <!-- Finger dividers -->
  <line x1="12.5" y1="8" x2="12.5" y2="13" stroke="#c4b5fd" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="16" y1="10.5" x2="16" y2="14.5" stroke="#c4b5fd" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Radiant 4-pointed star sparkle at fingertip -->
  <path d="M8,1 L9,3 L11,3.5 L9,4 L8,6 L7,4 L5,3.5 L7,3 Z" fill="#ffffff" stroke="#a78bfa" stroke-width="0.5"/>
</svg>`;

const COSMIC_CROSSHAIR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="cos-c-glow">
    <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#a78bfa" flood-opacity="0.75"/>
  </filter>
  <!-- Starlight orbital circle -->
  <circle cx="12" cy="12" r="5" fill="none" stroke="#7c3aed" stroke-width="1" stroke-dasharray="2 2" opacity="0.8"/>
  <!-- 4-point celestial star crosshair -->
  <line x1="12" y1="2" x2="12" y2="8" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round" filter="url(#cos-c-glow)"/>
  <line x1="12" y1="16" x2="12" y2="22" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round" filter="url(#cos-c-glow)"/>
  <line x1="2" y1="12" x2="8" y2="12" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round" filter="url(#cos-c-glow)"/>
  <line x1="16" y1="12" x2="22" y2="12" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round" filter="url(#cos-c-glow)"/>
  <!-- Center radiant star core -->
  <path d="M12,9 L13,11.2 L15,12 L13,12.8 L12,15 L11,12.8 L9,12 L11,11.2 Z" fill="#ffffff"/>
</svg>`;

const COSMIC_GRAB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M5,8 C5,7 6,6 7,6 C8,6 9,7 9,8 L9,12 M9,6 C9,5 10,4 11,4 C12,4 13,5 13,6 L13,12 M13,6 C13,5 14,4 15,4 C16,4 17,5 17,6 L17,12 M17,8 C17,7 18,6 19,6 C20,6 21,7 21,8 L21,15 C21,19 17,22 13,22 C9,22 5,19 5,15 Z" 
        fill="#0b0617" stroke="#a78bfa" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="13" cy="14" r="2" fill="#c4b5fd"/>
</svg>`;

const COSMIC_GRABBING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="6" fill="#0b0617" stroke="#a78bfa" stroke-width="1.6"/>
  <path d="M12,8 L13,11 L16,12 L13,13 L12,16 L11,13 L8,12 L11,11 Z" fill="#ffffff"/>
</svg>`;

const COSMIC_NOT_ALLOWED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="8.5" fill="#190715" stroke="#fb7185" stroke-width="1.8"/>
  <line x1="6" y1="6" x2="18" y2="18" stroke="#fb7185" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const COSMIC_TEXT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <filter id="cos-t-glow">
    <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#a78bfa" flood-opacity="0.75"/>
    <feDropShadow dx="1" dy="1.5" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.9"/>
  </filter>
  <!-- Obsidian star-pillar I-beam -->
  <path d="M7,4 L17,4 L17,7 L13.5,7 L13.5,17 L17,17 L17,20 L7,20 L7,17 L10.5,17 L10.5,7 L7,7 Z" 
        fill="#0b0617" stroke="#a78bfa" stroke-width="1.6" stroke-linejoin="round" filter="url(#cos-t-glow)"/>
  <!-- Lavender radiant center beam -->
  <line x1="12" y1="5.5" x2="12" y2="18.5" stroke="#c4b5fd" stroke-width="1.3" stroke-linecap="round"/>
  <!-- Top starlight sparkle -->
  <path d="M12,2 L12.8,3.5 L14.5,4 L12.8,4.5 L12,6 L11.2,4.5 L9.5,4 L11.2,3.5 Z" fill="#ffffff"/>
  <!-- Bottom starlight sparkle -->
  <path d="M12,18 L12.8,19.5 L14.5,20 L12.8,20.5 L12,22 L11.2,20.5 L9.5,20 L11.2,19.5 Z" fill="#ffffff"/>
</svg>`;

// ============================================================================
// THEME CURSOR SETS
// ============================================================================
export const THEME_CURSORS: Record<GameTheme, ThemeCursorSet> = {
  arcade: {
    theme: 'arcade',
    default: createCursor('default', [0, 0], 'default', ARCADE_DEFAULT_SVG),
    pointer: createCursor('pointer', [8, 2], 'pointer', ARCADE_POINTER_SVG),
    crosshair: createCursor('crosshair', [12, 12], 'crosshair', ARCADE_CROSSHAIR_SVG),
    text: createCursor('text', [12, 12], 'text', ARCADE_TEXT_SVG),
    grab: createCursor('grab', [12, 12], 'grab', ARCADE_GRAB_SVG),
    grabbing: createCursor('grabbing', [12, 12], 'grabbing', ARCADE_GRABBING_SVG),
    notAllowed: createCursor('notAllowed', [12, 12], 'not-allowed', ARCADE_NOT_ALLOWED_SVG),
  },
  legacy: {
    theme: 'legacy',
    default: createCursor('default', [2, 2], 'default', LEGACY_DEFAULT_SVG),
    pointer: createCursor('pointer', [8, 2], 'pointer', LEGACY_POINTER_SVG),
    crosshair: createCursor('crosshair', [12, 12], 'crosshair', LEGACY_CROSSHAIR_SVG),
    text: createCursor('text', [12, 12], 'text', LEGACY_TEXT_SVG),
    grab: createCursor('grab', [12, 12], 'grab', LEGACY_GRAB_SVG),
    grabbing: createCursor('grabbing', [12, 12], 'grabbing', LEGACY_GRABBING_SVG),
    notAllowed: createCursor('notAllowed', [12, 12], 'not-allowed', LEGACY_NOT_ALLOWED_SVG),
  },
  neon: {
    theme: 'neon',
    default: createCursor('default', [2, 2], 'default', NEON_DEFAULT_SVG),
    pointer: createCursor('pointer', [8, 2], 'pointer', NEON_POINTER_SVG),
    crosshair: createCursor('crosshair', [12, 12], 'crosshair', NEON_CROSSHAIR_SVG),
    text: createCursor('text', [12, 12], 'text', NEON_TEXT_SVG),
    grab: createCursor('grab', [12, 12], 'grab', NEON_GRAB_SVG),
    grabbing: createCursor('grabbing', [12, 12], 'grabbing', NEON_GRABBING_SVG),
    notAllowed: createCursor('notAllowed', [12, 12], 'not-allowed', NEON_NOT_ALLOWED_SVG),
  },
  blueprint: {
    theme: 'blueprint',
    default: createCursor('default', [2, 2], 'default', BLUEPRINT_DEFAULT_SVG),
    pointer: createCursor('pointer', [8, 2], 'pointer', BLUEPRINT_POINTER_SVG),
    crosshair: createCursor('crosshair', [12, 12], 'crosshair', BLUEPRINT_CROSSHAIR_SVG),
    text: createCursor('text', [12, 12], 'text', BLUEPRINT_TEXT_SVG),
    grab: createCursor('grab', [12, 12], 'grab', BLUEPRINT_GRAB_SVG),
    grabbing: createCursor('grabbing', [12, 12], 'grabbing', BLUEPRINT_GRABBING_SVG),
    notAllowed: createCursor('notAllowed', [12, 12], 'not-allowed', BLUEPRINT_NOT_ALLOWED_SVG),
  },
  cosmic: {
    theme: 'cosmic',
    default: createCursor('default', [2, 2], 'default', COSMIC_DEFAULT_SVG),
    pointer: createCursor('pointer', [8, 2], 'pointer', COSMIC_POINTER_SVG),
    crosshair: createCursor('crosshair', [12, 12], 'crosshair', COSMIC_CROSSHAIR_SVG),
    text: createCursor('text', [12, 12], 'text', COSMIC_TEXT_SVG),
    grab: createCursor('grab', [12, 12], 'grab', COSMIC_GRAB_SVG),
    grabbing: createCursor('grabbing', [12, 12], 'grabbing', COSMIC_GRABBING_SVG),
    notAllowed: createCursor('notAllowed', [12, 12], 'not-allowed', COSMIC_NOT_ALLOWED_SVG),
  },
};

/**
 * Returns the cursor set for the specified theme (falling back to arcade)
 */
export function getThemeCursors(theme: GameTheme): ThemeCursorSet {
  return THEME_CURSORS[theme] || THEME_CURSORS.arcade;
}

/**
 * Generates the CSS custom properties declarations for all themes
 */
export function generateThemeCursorsCss(): string {
  const themes: GameTheme[] = ['arcade', 'legacy', 'neon', 'blueprint', 'cosmic'];
  const lines: string[] = [];

  // Root fallback (arcade)
  lines.push(':root {');
  const arcade = THEME_CURSORS.arcade;
  lines.push(`  --cursor-default: ${arcade.default.cssValue};`);
  lines.push(`  --cursor-pointer: ${arcade.pointer.cssValue};`);
  lines.push(`  --cursor-crosshair: ${arcade.crosshair.cssValue};`);
  lines.push(`  --cursor-text: ${arcade.text.cssValue};`);
  lines.push(`  --cursor-grab: ${arcade.grab.cssValue};`);
  lines.push(`  --cursor-grabbing: ${arcade.grabbing.cssValue};`);
  lines.push(`  --cursor-not-allowed: ${arcade.notAllowed.cssValue};`);
  lines.push('}\n');

  for (const t of themes) {
    const set = THEME_CURSORS[t];
    lines.push(`[data-game-theme="${t}"] {`);
    lines.push(`  --cursor-default: ${set.default.cssValue};`);
    lines.push(`  --cursor-pointer: ${set.pointer.cssValue};`);
    lines.push(`  --cursor-crosshair: ${set.crosshair.cssValue};`);
    lines.push(`  --cursor-text: ${set.text.cssValue};`);
    lines.push(`  --cursor-grab: ${set.grab.cssValue};`);
    lines.push(`  --cursor-grabbing: ${set.grabbing.cssValue};`);
    lines.push(`  --cursor-not-allowed: ${set.notAllowed.cssValue};`);
    lines.push('}\n');
  }

  return lines.join('\n');
}

/**
 * Generates the complete cursors.css stylesheet including variable declarations
 * and global element cursor binding rules.
 */
export function getFullCursorsStylesheet(): string {
  const varsCss = generateThemeCursorsCss();
  return `/* ==========================================================================
   SYNCRON THEME-ADAPTIVE SVG CURSORS
   Auto-synchronized with themeCursors.ts
   Themes: arcade | legacy | neon | blueprint | cosmic
   States: default | pointer | crosshair | text | grab | grabbing | not-allowed
   ========================================================================== */

/* ── 1. Theme Cursor Variables ─────────────────────────────────────────── */
${varsCss}
/* ── 2. Global Element Application Rules ───────────────────────────────── */

/* Base default site cursor */
html, body {
  cursor: var(--cursor-default);
}

/* Interactive elements: buttons, links, controls, clickable items */
button,
a,
[role="button"],
label,
select,
summary,
[tabindex]:not([tabindex="-1"]),
.cursor-pointer,
[style*="cursor: pointer"],
[style*="cursor:pointer"],
[style*="cursor: pointer;"],
[style*="cursor:pointer;"] {
  cursor: var(--cursor-pointer) !important;
}

/* Precision / crosshair elements (e.g. editor board, target cells) */
.cursor-crosshair,
[style*="cursor: crosshair"],
[style*="cursor:crosshair"] {
  cursor: var(--cursor-crosshair) !important;
}

/* Grab / Grabbing elements (e.g. draggable items, level reordering) */
.cursor-grab,
[style*="cursor: grab"],
[style*="cursor:grab"] {
  cursor: var(--cursor-grab) !important;
}

.cursor-grabbing,
[style*="cursor: grabbing"],
[style*="cursor:grabbing"] {
  cursor: var(--cursor-grabbing) !important;
}

/* Disabled / forbidden elements */
:disabled,
[disabled],
.cursor-not-allowed,
[style*="cursor: not-allowed"],
[style*="cursor:not-allowed"] {
  cursor: var(--cursor-not-allowed) !important;
}

/* Explicit default cursor override */
.cursor-default,
[style*="cursor: default"],
[style*="cursor:default"] {
  cursor: var(--cursor-default) !important;
}

/* Text inputs, textareas, and contenteditable elements */
input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),
textarea,
[contenteditable="true"],
.cursor-text,
[style*="cursor: text"],
[style*="cursor:text"],
[style*="cursor: text;"],
[style*="cursor:text;"] {
  cursor: var(--cursor-text) !important;
}

/* Checkbox, radio, and range slider use pointer */
input[type="checkbox"],
input[type="radio"],
input[type="range"] {
  cursor: var(--cursor-pointer) !important;
}

/* Number input spinner up/down arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  cursor: var(--cursor-pointer) !important;
}
`;
}

