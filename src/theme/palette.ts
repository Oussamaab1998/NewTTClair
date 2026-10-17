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
  violet500: '#7b5ea7',

  positive600: '#1e7d32',
  positive50: '#e8f5e9',
  caution600: '#9a5b00',
  caution50: '#fff4e0',
  critical600: '#b3261e',
  critical50: '#fdecea',
  notice600: '#24527a',
  notice50: '#eaf2fb',

  series1: '#1f5fbf',
  series2: '#b35900',
  series3: '#2e7d32',
  series4: '#8e24aa',
  series5: '#c62828',
  series6: '#00838f',
} as const;
