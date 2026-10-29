// WCAG 2.x contrast of the theme's colour pairs (DESIGN.md §2). Text needs
// 4.5:1 (1.4.3); control edges and graphics 3:1 (1.4.11). A palette change
// that breaks a pair fails here. Decorative edges are listed, not enforced.
import { theme } from '../src/theme';

const C = theme.color;

function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(v.slice(i, i + 2), 16) / 255);
  const f = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const TEXT: [string, string, string][] = [
  ['ink on paper', C.ink, C.paper],
  ['ink on card', C.ink, C.card],
  ['inkMuted on paper', C.inkMuted, C.paper],
  ['inkMuted on card', C.inkMuted, C.card],
  ['pen (links) on card', C.pen, C.card],
  ['white on pen', C.textOnAccent, C.pen],
  ['white on ink (primary)', C.textOnAccent, C.ink],
  ['white on inkDisabled (disabled primary)', C.textOnAccent, C.inkDisabled],
  ['inkDisabled label on card (disabled keys, chips)', C.inkDisabled, C.card],
  ['correct.ink on correct.bg', C.correct.ink, C.correct.bg],
  ['correct.text on correct.bg', C.correct.text, C.correct.bg],
  ['error.ink on noteBg', C.error.ink, C.error.noteBg],
  ['error.noteText on noteBg', C.error.noteText, C.error.noteBg],
  ['draft.text on draft.bg', C.draft.text, C.draft.bg],
  ['ink on highlighter (selected)', C.ink, C.highlighter],
  ['ink on highlighterSoft (hint)', C.ink, C.highlighterSoft],
  // probability2: slice bar (GroupBoxes, ChoiceProduct), the lit cell and the product picture
  ['ink on surfaceMuted (slice, cell tint, block)', C.ink, C.surfaceMuted],
  // probability2 stop 2: S letter, chip text, a ball label and the duplicate mark on the selected fill; the F letter is inkMuted on card (above)
  ['ink on surfaceSelected (S cell, chip, ball, duplicate mark)', C.ink, C.surfaceSelected],
  ['textPrimary on card (chip, count, tick label)', C.textPrimary, C.card],
  ['white on subject analysis', C.textOnAccent, C.subject.analysis],
  ['white on subject probability', C.textOnAccent, C.subject.probability],
  ...(Object.entries(theme.feedback).map(([tone, f]) => [
    `feedback.${tone} text on its surface`,
    f.text,
    f.surface,
  ]) as [string, string, string][]),
];

const NON_TEXT: [string, string, string][] = [
  ['borderControl on card', C.borderControl, C.card],
  ['borderControl on paper', C.borderControl, C.paper],
  // probability2: a box, a chip or a slice edge on the muted fill, and a lit cell's ink edge
  ['borderControl on surfaceMuted (slice, cell)', C.borderControl, C.surfaceMuted],
  ['ink edge on highlighter (open box, picked chip, lit cell)', C.ink, C.highlighter],
  // probability2 stop 2: the dashed end past the whole and the whole mark, the part's ink edge, a Pascal cell
  ['ink dashed end on card (more than the whole)', C.ink, C.card],
  ['ink edge on surfaceSelected (S cell, duplicate row, bar part)', C.ink, C.surfaceSelected],
  ['slider track on card', theme.slider.color.track, C.card],
  ['slider fill on card', theme.slider.color.fill, C.card],
  ['plot curve on card', theme.plot.color.curve, C.card],
  ['plot axis on card', theme.plot.color.axis, C.card],
  ['plot marker on card', theme.plot.color.marker, C.card],
  ['plot positive on card', theme.plot.color.positive, C.card],
  ['plot negative on card', theme.plot.color.negative, C.card],
  ...theme.dataSeries.map(
    (s, i) =>
      [`data series ${i + 1} on card`, s, C.card] as [string, string, string],
  ),
];

/** A colour at `opacity` over a background (the card fades into the paper). */
function over(fg: string, bg: string, opacity: number): string {
  const ch = (h: string, i: number) =>
    parseInt(h.replace('#', '').slice(i, i + 2), 16);
  return `#${[0, 2, 4]
    .map(i => Math.round(opacity * ch(fg, i) + (1 - opacity) * ch(bg, i)))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

describe('colour contrast (WCAG)', () => {
  it('done / paused cards (faded over paper): ink and muted text stay >= 4.5:1', () => {
    const a = theme.opacity.inactive;
    const bg = over(C.card, C.paper, a);
    expect(contrast(over(C.ink, C.paper, a), bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(over(C.inkMuted, C.paper, a), bg)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it.each(TEXT)('text: %s >= 4.5:1', (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(NON_TEXT)('control / graphic: %s >= 3:1', (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
  it('decorative edges are knowingly light (card edges, ruling): not controls', () => {
    expect(contrast(C.border, C.card)).toBeLessThan(3);
    expect(contrast(C.gridLine, C.card)).toBeLessThan(3);
  });
});
