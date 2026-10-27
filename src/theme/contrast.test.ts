import { palette as p } from './palette';
import { contrast } from './contrast';
import { theme } from './index';

describe('contrast on the white card (WCAG 2.x)', () => {
  it('the help chips: border = control edge (≥ 3:1, non-text), label = muted ink (≥ 4.5:1, text)', () => {
    expect(theme.color.card).toBe(p.neutral0);
    expect(
      contrast(theme.color.borderControl, theme.color.card),
    ).toBeGreaterThanOrEqual(3);
    expect(
      contrast(theme.color.inkMuted, theme.color.card),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('the decorative card edge is below 3:1, so it never marks a control', () => {
    expect(contrast(theme.color.border, theme.color.card)).toBeLessThan(3);
  });

  it('measured ratios (reported in PROGRESS, 2026-10-22)', () => {
    const r = (a: string) =>
      Math.round(contrast(a, theme.color.card) * 100) / 100;
    expect({
      borderControl: r(theme.color.borderControl),
      inkMuted: r(theme.color.inkMuted),
      border: r(theme.color.border),
    }).toMatchInlineSnapshot(`
      {
        "border": 1.52,
        "borderControl": 3.65,
        "inkMuted": 6.11,
      }
    `);
  });
});
