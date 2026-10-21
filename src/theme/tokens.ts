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
  /** Smallest scale a one-line button label may shrink to before it would clip. */
  minScale: 0.8,
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
  /** Width of the "..." block-menu gutter (touch area extended by hitSlop). */
  blockGutter: 28,
  /** Extra touch area around the small "..." button, each side. */
  blockMenuSlop: 8,
  reportInputMinHeight: 64,
  /** Dev screen: raw LLM outputs panel. */
  rawPanelMaxHeight: 420,
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

/** Function plots (analysis components, react-native-svg). */
export const plot = {
  /** Collapsed height of a plot (COMPONENTS_CONTRACT.md rule 5: 180-260 pt). */
  height: 200,
  /** Width used until the first layout pass (and in tests). */
  defaultWidth: 320,
  /** Collapsed component: plot height, and plot : readouts width ratio. */
  compactHeight: 150,
  compactPlotFlex: 3,
  compactReadoutFlex: 2,
  /** Full-screen (expanded) plot height. */
  expandedHeight: 300,
  /** Collapsed readouts shrink down to this scale instead of wrapping. */
  readoutMinScale: 0.75,
  pad: 12,
  curveWidth: 2.5,
  secondCurveWidth: 2,
  axisWidth: 1,
  guideWidth: 1,
  markerRadius: 5,
  labelSize: 12,
  /** Dash pattern of guides and of the negative part of a sign-colored curve. */
  dash: '6 4',
  shadeOpacity: 0.35,
  color: {
    curve: p.series1,
    secondCurve: p.series2,
    tangent: p.series4,
    axis: p.neutral600,
    guide: p.neutral600,
    marker: p.neutral900,
    /** Inside of a hollow marker (the mirror point). */
    surface: p.neutral0,
    positive: p.positive600,
    negative: p.critical600,
    shadePositive: p.positive600,
    shadeNegative: p.critical600,
  },
} as const;

/** Slider of the analysis components (local state, snapped to steps). */
export const slider = {
  trackHeight: 4,
  thumb: 24,
  /** Touch height of the whole slider (rule 7: >= 44 pt). */
  touchHeight: 44,
  color: { track: p.neutral200, fill: p.brand500, thumb: p.brand500 },
} as const;

/** Structured math editor (typed lines). */
export const editor = {
  /** Font size by nesting depth (root, first slot level, deeper). */
  fontSizes: [20, 16, 13] as readonly number[],
  cursorWidth: 2,
  /** Cursor height as a ratio of the font size. */
  cursorRatio: 1.2,
  /** Empty slot box, as a ratio of the font size. */
  slotRatio: 0.9,
  barHeight: 1.5,
  /** Exponent lift, as a ratio of the base font size. */
  liftRatio: 0.45,
  minHeight: 56,
  /** Keys per row before the card width is measured. */
  keysPerRow: 6,
  /** Between keys: six 44 pt keys + gaps fit a 280 pt card. */
  keyGap: 2,
  /** Space each side of + − × in the line. */
  operatorSpace: 3,
  /** Extra touch area around a symbol of the line (tap = cursor after it). */
  tapSlop: { top: 8, bottom: 8, left: 3, right: 3 },
  /** How long a wrapped part stays outlined (ms); kept until the next key with reduce motion. */
  flashMs: 800,
  /** How long the "<change> · تراجع" chip stays after a structural change (ms). */
  undoChipMs: 4000,
  color: {
    cursor: p.brand500,
    slot: p.neutral200,
    activeSlot: p.brand500,
    /** The slot the cursor is in (exponent, numerator...). */
    activeSlotBackground: p.brand50,
    /** The atoms selected by widen. */
    selection: p.brand100,
    /** The numerator / denominator a wrong line is localized to. */
    faultySlot: p.caution50,
  },
} as const;

/** Lesson feed timing. */
export const feed = {
  /** The current card must be out of view this long (ms) before "back to the question" shows. */
  jumpDelayMs: 2000,
} as const;

/** Inline KaTeX page (WebView fallback renderer). */
export const katex = {
  paddingY: 2,
  /** Height guess (in font sizes) until the WebView reports its size. */
  initialHeightRatio: 2,
} as const;
