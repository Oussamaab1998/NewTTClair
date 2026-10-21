/**
 * Raw color values. Internal to src/theme: components never import this file,
 * they read the semantic tokens in ./tokens.ts. A redesign changes values here
 * (and, if roles change, the mapping in tokens.ts).
 */
export const palette = {
  neutral0: '#ffffff',
  neutral50: '#fffdf5',
  neutral100: '#f5f5f7',
  neutral150: '#e9e9ee',
  neutral175: '#e8e8ed',
  neutral200: '#d2d2d7',
  neutral250: '#d0d0d8',
  neutral300: '#e6dcc0',
  neutral350: '#dddddd',
  neutral600: '#6e6e73',
  neutral800: '#3a3a3c',
  neutral900: '#1d1d1f',
  neutral950: '#111111',
  scrim: 'rgba(0,0,0,0.3)',

  brand500: '#0a66c2',
  brand50: '#e8f0fe',
  brand100: '#c6dbf7',
  violet500: '#7b5ea7',

  positive600: '#1e7d32',
  positive50: '#e8f5e9',
  caution600: '#9a5b00',
  caution50: '#fff4e0',
  critical600: '#b3261e',
  critical50: '#fdecea',
  notice600: '#24527a',
  notice50: '#eaf2fb',

  // Cahier direction (docs/DESIGN.md §2).
  paper: '#f2f5fb',
  paperGrid: '#dde5f3',
  paperBorder: '#c5d2ea',
  /** Control edges: 3.65:1 on card, 3.34:1 on paper (WCAG 1.4.11 non-text). */
  controlBorder: '#7486ad',
  ink: '#1b2a57',
  inkMuted: '#55627f',
  /** Disabled primary fill: white on it is 4.59:1 (WCAG AA for text). */
  inkDisabled: '#6b7590',
  inkScrim: 'rgba(27,42,87,0.4)',
  pen: '#2f5bea',
  penTint: '#f4f8ff',
  highlighter: '#ffe680',
  highlighterSoft: '#fff4bf',
  green700: '#1e7a4c',
  green50: '#e6f4ec',
  green900: '#14532d',
  redPencil: '#b8243d',
  red50: '#fff1f3',
  red200: '#e9a3ae',
  red900: '#7a1428',
  amber50: '#fff6cc',
  amber500: '#e0b800',
  amber900: '#5a4500',
  teal700: '#1e7a7a',

  series1: '#1f5fbf',
  series2: '#b35900',
  series3: '#2e7d32',
  series4: '#8e24aa',
  series5: '#c62828',
  series6: '#00838f',
} as const;
