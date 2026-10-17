/**
 * Semantic design tokens. Components read these, never raw values: a visual
 * redesign is a change here, not a rewrite. Names say what a value is for,
 * not what it looks like. Two roles may share a value today and diverge later.
 */
import { StyleSheet } from 'react-native';

import { palette as p } from './palette';

export const color = {
  textPrimary: p.neutral900,
  textSecondary: p.neutral600,
  /** Text on actionPrimary / selected dark surfaces. */
  textOnAccent: p.neutral0,
  textOnInverse: p.neutral0,

  /** Behind the feed and screens. */
  backgroundApp: p.neutral100,
  /** Outermost app container (behind the tab bar). */
  backgroundRoot: p.neutral0,
  surfaceCard: p.neutral0,
  /** Quiet controls: dev tabs and buttons. */
  surfaceMuted: p.neutral175,
  surfaceKey: p.neutral150,
  surfaceKeyPressed: p.neutral250,
  /** Student bubble, selected chip, pressed option. */
  surfaceSelected: p.brand50,
  /** Selected dev tab. */
  surfaceInverse: p.neutral900,
  surfaceBadge: p.neutral800,
  /** The exam-paper writeup. */
  surfacePaper: p.neutral50,
  borderPaper: p.neutral300,
  borderDefault: p.neutral200,

  actionPrimary: p.brand500,
  deepDiveRail: p.violet500,
  overlayScrim: p.scrim,

  devConsoleBackground: p.neutral950,
  devConsoleText: p.neutral350,
} as const;

/** Feedback tones. Color is never the only signal: each tone has an icon. */
export const feedback = {
  success: { text: p.positive600, surface: p.positive50, icon: '✓' },
  warning: { text: p.caution600, surface: p.caution50, icon: '!' },
  danger: { text: p.critical600, surface: p.critical50, icon: '✗' },
  info: { text: p.notice600, surface: p.notice50, icon: 'i' },
} as const;
export type FeedbackTone = keyof typeof feedback;

/** Categorical colors for data (values of X); always shown with the value as text. */
export const dataSeries = [
  p.series1,
  p.series2,
  p.series3,
  p.series4,
  p.series5,
  p.series6,
] as const;

export const space = {
  xxxs: 2,
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  section: 24,
  sheetBottom: 32,
  scrollEnd: 40,
  /** Indentation per deep-dive level. */
  depthIndent: 14,
  /** Gap inside a table cell. */
  cellInset: 3,
  /** Gap between a chart marker and its label. */
  markerLabel: 3,
  /** Horizontal padding of a one-letter badge. */
  badgeX: 5,
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  card: 14,
  sheet: 16,
  pill: 22,
  /** Rounded bottom of the urn. */
  urnBase: 40,
} as const;

export const border = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  medium: 1.5,
  thick: 2,
  selected: 2.5,
  focus: 3,
} as const;

export const font = {
  size: {
    micro: 10,
    tiny: 11,
    caption: 12,
    footnote: 13,
    small: 14,
    callout: 15,
    body: 16,
    bodyLarge: 17,
    reading: 18,
    title: 20,
  },
  lineHeight: { body: 26, relaxed: 28, reading: 30 },
  weight: { semibold: '600', bold: '700' },
  /** Line height of lesson paragraphs, as a ratio of the font size. */
  readingLineRatio: 1.65,
  /** A French line is one step smaller than the Arabic paragraph above it. */
  secondaryRunDelta: 1,
  /** A formula is one step larger than the text around it. */
  mathRunDelta: 1,
} as const;

export const opacity = {
  dimmed: 0.35,
  disabled: 0.4,
  inactive: 0.6,
  pressed: 0.7,
} as const;

/** No shadows in the current design; a slot for a later redesign. */
export const shadow = { none: {} } as const;

export const size = {
  /** Minimum touch target (COMPONENTS_CONTRACT.md rule 7). */
  touch: 44,
  askChipMinHeight: 34,
  chipMinWidth: 84,
  keypadPreviewMinWidth: 40,
  urnBall: 52,
  checkBadge: 16,
  /** Circle around a feedback tone icon. */
  toneIcon: 24,
  complementBarMinHeight: 72,
  assignColumnMinHeight: 96,
  divider: 1,
  eventPanelMaxHeight: 220,
} as const;

/** Small position offsets of marks and badges. */
export const offset = {
  chipMarkTop: 2,
  chipMarkEnd: 4,
  cellMarkTop: 1,
  cellMarkEnd: 3,
  /** The urn ball check badge sits slightly outside the ball. */
  ballBadgeOutset: -2,
  /** A selected urn ball rises. */
  ballLift: -6,
} as const;

export const chart = {
  plotHeight: 140,
  barWidth: 30,
  barRadius: 4,
  minBarHeight: 4,
  padX: 24,
  /** Room above the plot for the p labels. */
  valueLabelBand: 24,
  axisLabelGap: 6,
  axisLabelWidth: 40,
  axisThickness: 1.5,
  footerHeight: 56,
} as const;

/** Inline KaTeX page (WebView fallback renderer). */
export const katex = {
  paddingY: 2,
  /** Height guess (in font sizes) until the WebView reports its size. */
  initialHeightRatio: 2,
} as const;
