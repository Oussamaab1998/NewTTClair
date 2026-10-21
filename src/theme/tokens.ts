/**
 * Semantic design tokens. Components read these, never raw values: a visual
 * redesign is a change here, not a rewrite. Names say what a value is for,
 * not what it looks like. Two roles may share a value today and diverge later.
 */
import { Platform, StyleSheet } from 'react-native';

import { palette as p } from './palette';

export const color = {
  // Re-pointed to the Cahier roles below (DESIGN.md §2).
  textPrimary: p.ink,
  textSecondary: p.inkMuted,
  /** Text on actionPrimary / selected dark surfaces. */
  textOnAccent: p.neutral0,
  textOnInverse: p.neutral0,

  /** Behind the feed and screens (Cahier: flat paper, no grid yet). */
  backgroundApp: p.paper,
  /** Outermost app container, incl. the status-bar area (same paper). */
  backgroundRoot: p.paper,
  surfaceCard: p.neutral0,
  /** Quiet controls: dev tabs and buttons (Cahier pen tint). */
  surfaceMuted: p.penTint,
  surfaceKey: p.neutral0,
  surfaceKeyPressed: p.highlighterSoft,
  /** Selected chip / cell / option (Cahier highlighter, with an ink border). */
  surfaceSelected: p.highlighter,
  /** Selected dev tab. */
  surfaceInverse: p.neutral900,
  surfaceBadge: p.neutral800,
  /** The exam-paper writeup (Cahier card). */
  surfacePaper: p.neutral0,
  borderPaper: p.paperBorder,
  borderDefault: p.paperBorder,

  actionPrimary: p.pen,
  overlayScrim: p.inkScrim,

  devConsoleBackground: p.neutral950,
  devConsoleText: p.neutral350,

  // Cahier roles (docs/DESIGN.md §2). Not used by components yet (D0); the
  // older roles above are re-pointed or replaced phase by phase.
  /** Screen background. */
  paper: p.paper,
  /** The 22 pt grid on paper (only if measured free, DESIGN.md §6). */
  gridLine: p.paperGrid,
  /** Cards, chips, quiet buttons. */
  card: p.neutral0,
  /** Card edges, ruling, dividers (decorative: 1.52:1 on card). */
  border: p.paperBorder,
  /** Edges that identify a control (buttons, chips, keys, fields, slider track): 3.65:1. */
  borderControl: p.controlBorder,
  /** Text, primary button fill, icons. */
  ink: p.ink,
  /** The primary button while it cannot act (label stays readable: 4.59:1). */
  inkDisabled: p.inkDisabled,
  /** Secondary text, labels, subtitles. */
  inkMuted: p.inkMuted,
  /** Active question border, tabs, student bubbles, links, cursor, send button. */
  pen: p.pen,
  /** Selected option or chip, current item. */
  highlighter: p.highlighter,
  /** Current row in the sheet, highlighted sentence. */
  highlighterSoft: p.highlighterSoft,
  correct: { ink: p.green700, bg: p.green50, text: p.green900 },
  /** Red pencil: the mark (ink) and the error note. */
  error: {
    ink: p.redPencil,
    noteBg: p.red50,
    noteBorder: p.red200,
    noteText: p.red900,
  },
  /** Draft tag, unreadable-line warning, teacher-note card. */
  draft: { bg: p.amber50, border: p.amber500, text: p.amber900 },
  /** Deep-dive sheet: tinted fill, dashed pen edge. */
  deepDive: { bg: p.penTint, edge: p.pen },
  /** Subject tag on picker cards. */
  subject: { analysis: p.pen, probability: p.teal700 },
  /** Behind the sheet and menus. */
  scrim: p.inkScrim,
} as const;

/** Feedback tones. Color is never the only signal: each tone has an icon. */
export const feedback = {
  // Cahier pencils (DESIGN.md §2): green, red pencil, draft amber, highlighter.
  success: { text: p.green700, surface: p.green50, icon: '✓' },
  warning: { text: p.amber900, surface: p.amber50, icon: '!' },
  danger: { text: p.redPencil, surface: p.red50, icon: '✗' },
  info: { text: p.ink, surface: p.highlighterSoft, icon: 'i' },
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
  // Cahier shapes (DESIGN.md §2): card is 14 above.
  button: 12,
  chip: 10,
  tag: 8,
  /** Top corners of the bottom sheet. */
  sheetTop: 20,
} as const;

export const border = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  medium: 1.5,
  thick: 2,
  selected: 2.5,
  focus: 3,
  /** Cahier: cards, chips, buttons. */
  line: 1.5,
  /** Cahier: the active question card. */
  active: 2,
} as const;

/**
 * Bundled faces (assets/fonts, SIL OFL 1.1, listed in Info.plist UIAppFonts;
 * __tests__/fonts.test.ts checks names, files and the plist). Measured on iOS
 * (D0): Tajawal resolves by PostScript name, one static file per weight.
 * STIX Two Text ships as variable fonts whose instances have no PostScript
 * name: by family name, `font.style.italic` and `font.weight.bold` select its
 * real italic and bold instances; its PostScript names do not resolve.
 * A name that does not resolve falls back to the system font (no stack in RN).
 * Android is deferred: there fontFamily is the file name.
 */
const family = {
  ui: {
    regular: 'Tajawal-Regular',
    medium: 'Tajawal-Medium',
    bold: 'Tajawal-Bold',
    extraBold: 'Tajawal-ExtraBold',
  },
  /** Family name: pair with font.style.italic / font.weight.bold. */
  math: { family: 'STIX Two Text' },
  /** Dev panels and raw text. */
  mono: Platform.select({ ios: 'Courier', default: 'monospace' }),
} as const;

/** Bundled files (relative to assets/), with the name the theme uses for each. */
export const fontFiles: readonly {
  file: string;
  name: string;
  by: 'postScript' | 'family';
}[] = [
  {
    file: 'fonts/tajawal/Tajawal-Regular.ttf',
    name: 'Tajawal-Regular',
    by: 'postScript',
  },
  {
    file: 'fonts/tajawal/Tajawal-Medium.ttf',
    name: 'Tajawal-Medium',
    by: 'postScript',
  },
  {
    file: 'fonts/tajawal/Tajawal-Bold.ttf',
    name: 'Tajawal-Bold',
    by: 'postScript',
  },
  {
    file: 'fonts/tajawal/Tajawal-ExtraBold.ttf',
    name: 'Tajawal-ExtraBold',
    by: 'postScript',
  },
  {
    file: 'fonts/stix-two-text/STIXTwoText[wght].ttf',
    name: 'STIX Two Text',
    by: 'family',
  },
  {
    file: 'fonts/stix-two-text/STIXTwoText-Italic[wght].ttf',
    name: 'STIX Two Text',
    by: 'family',
  },
];

export const font = {
  family,
  style: { italic: 'italic' },
  // Cahier text roles (DESIGN.md §2): spread into a style.
  screenTitle: {
    fontFamily: family.ui.extraBold,
    fontSize: 26,
    lineHeight: 34,
  },
  header: { fontFamily: family.ui.bold, fontSize: 21, lineHeight: 30 },
  body: { fontFamily: family.ui.regular, fontSize: 16.5, lineHeight: 30 },
  small: { fontFamily: family.ui.regular, fontSize: 13.5, lineHeight: 22 },
  /** Exam wording (statement card, the sheet). */
  paper: { fontFamily: family.math.family, fontSize: 16.5, lineHeight: 28 },
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
  /** Line height of lesson paragraphs, as a ratio of the font size (Cahier body ≈ 1.8). */
  readingLineRatio: 1.8,
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
  /**
   * Done / paused question cards, composited over paper: ink 9.70:1, muted
   * text 4.64:1 (0.75 gave 3.52:1). They also lose the tab and the pen border.
   */
  inactive: 0.88,
  pressed: 0.7,
} as const;

/** No shadows in the current design; a slot for a later redesign. */
export const shadow = { none: {} } as const;

export const size = {
  /** Minimum touch target (COMPONENTS_CONTRACT.md rule 7). */
  touch: 44,
  askChipMinHeight: 34,
  /** Ask chips row (fixed, so it never jumps): one-line chips, or two lines when a chip has a formula. */
  askChipRow: 40,
  askChipRowTall: 64,
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
  /** Header progress bar (DESIGN.md §3). */
  progressBar: 6,
  /** The number circle of a question row in the «الورقة» sheet. */
  paperNumber: 32,
  /** Extra touch area around the small "..." button, each side. */
  blockMenuSlop: 8,
  reportInputMinHeight: 64,
  /** Dev screen: raw LLM outputs panel. */
  rawPanelMaxHeight: 420,
  /** Dev demo: height of a scripted lesson feed. */
  demoFeedHeight: 640,
  /** Dev demo: the phone widths the layout is checked at. */
  demoWidthWide: 390,
  demoWidthNarrow: 360,
} as const;

/** Screen layout (Cahier). */
export const layout = {
  /** Side gutter of screens. */
  gutter: 16,
  /** Paper grid cell, if the grid is used (DESIGN.md §6). */
  grid: 22,
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
  /** The «السؤال» tab sits on the active card's top border (half its height). */
  cardTab: -11,
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
    curve: p.pen,
    secondCurve: p.series2,
    tangent: p.series4,
    axis: p.inkMuted,
    guide: p.inkMuted,
    marker: p.ink,
    /** Inside of a hollow marker (the mirror point). */
    surface: p.neutral0,
    positive: p.green700,
    negative: p.redPencil,
    shadePositive: p.green700,
    shadeNegative: p.redPencil,
  },
} as const;

/** Slider of the analysis components (local state, snapped to steps). */
export const slider = {
  trackHeight: 4,
  thumb: 24,
  /** Touch height of the whole slider (rule 7: >= 44 pt). */
  touchHeight: 44,
  // A plain slider (no gradient): control-edge track, pen fill and thumb.
  color: { track: p.controlBorder, fill: p.pen, thumb: p.pen },
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
    /** Arrow / tool keys (a light pen tint, apart from the symbol keys). */
    toolKey: p.penTint,
  },
  /** Notebook page (Cahier): the margin column with each line's ✓ / × (marks, not buttons). */
  markColumn: 28,
  mark: 20,
  /** The drawn fraction key icon: box, bar, box. */
  fracIcon: { boxWidth: 12, boxHeight: 8, barWidth: 16, gap: 2 },
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
