/**
 * Red / black urns (docs/exercises/EX_URN_RN.md): coloured balls (E2), the
 * Urn display past the 60-draw cap (E4) and a LawChart law checked against
 * the engine (E3). The letter carries the meaning; the colour is secondary.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

import '../../i18n';
import type { Experiment } from '../../engine/calls';
import { enumerateOutcomes, type Ball } from '../../engine/probability';
import { palette } from '../../theme/palette';
import { contrast } from '../../theme/contrast';
import { theme } from '../../theme';
import { ComponentHost } from '../ComponentHost';
import type { ComponentSpec } from '../contract';
import { resolveSpec } from '../registry';
import { ballLabels, outcomeLabel } from './logic';
import { MAX_OUTCOMES } from './schemas';

const urn = (red: number, black: number): Ball[] => [
  ...Array.from({ length: red }, (_, i) => ({
    id: `r${i + 1}`,
    value: 1,
    color: 'red' as const,
  })),
  ...Array.from({ length: black }, (_, i) => ({
    id: `n${i + 1}`,
    value: 0,
    color: 'black' as const,
  })),
];
/** The exercise urn: 4 red, 6 black, 3 drawn at once (120 draws). */
const RN: Experiment = { urn: urn(4, 6), draw: 'simultaneous', k: 3 };
const TWIN: Experiment = { urn: urn(2, 2), draw: 'simultaneous', k: 2 };
const REDS = { id: 'count_value', args: { value: 1 } } as const;

const resolve = (spec: ComponentSpec, experiment: Experiment = RN) =>
  resolveSpec(spec, experiment);

/** Renders a spec; returns the host errors (a fallback would log one). */
async function mount(spec: ComponentSpec, experiment: Experiment) {
  const errors: unknown[][] = [];
  await render(
    <ComponentHost
      spec={spec}
      defaultInstanceId="t1"
      mode="interactive"
      experiment={experiment}
      onEvent={() => {}}
      onError={(...a) => errors.push(a)}
    />,
  );
  return errors;
}

describe('coloured balls: labels', () => {
  it('a coloured ball shows its letter (R, N), numbered within its colour', () => {
    const labels = ballLabels(RN.urn, true);
    expect([...labels.values()]).toEqual([
      'R₁',
      'R₂',
      'R₃',
      'R₄',
      'N₁',
      'N₂',
      'N₃',
      'N₄',
      'N₅',
      'N₆',
    ]);
    expect(ballLabels(RN.urn, false).get('n3')).toBe('N');
  });
  it('a draw reads as a set of letters, never as values', () => {
    const labels = ballLabels(TWIN.urn, true);
    const o = enumerateOutcomes(TWIN.urn, 'simultaneous', 2).find(
      x => x.id === 'r1-n2',
    )!;
    expect(outcomeLabel(o, labels, 'simultaneous')).toBe('{R₁ ; N₂}');
  });
  it('balls without a colour keep their value labels (Exercise 2 unchanged)', () => {
    const plain: Ball[] = [
      { id: 'b', value: 0 },
      { id: 'c', value: 0 },
    ];
    expect([...ballLabels(plain, true).values()]).toEqual(['0', '0′']);
  });
});

describe('coloured balls: the engine checks the colours match the values', () => {
  const bad = (balls: Ball[]) =>
    resolve({
      component: 'Urn',
      props: { balls: JSON.parse(JSON.stringify(balls)), k: 1 },
    });
  it('rejects a colour on some balls only', () => {
    expect(
      bad([
        { id: 'r1', value: 1, color: 'red' },
        { id: 'x', value: 0 },
      ]),
    ).toMatchObject({ ok: false });
  });
  it('rejects one colour carrying two values, or two colours one value', () => {
    expect(
      bad([
        { id: 'r1', value: 1, color: 'red' },
        { id: 'r2', value: 2, color: 'red' },
      ]),
    ).toMatchObject({ ok: false });
    expect(
      bad([
        { id: 'r1', value: 1, color: 'red' },
        { id: 'n1', value: 1, color: 'black' },
      ]),
    ).toMatchObject({ ok: false });
  });
  it('accepts the exercise urn', () => {
    expect(bad(RN.urn)).toMatchObject({ ok: true });
  });
});

describe('coloured balls: colours (secondary to the letter)', () => {
  const { red, black } = theme.color.ball;
  it('the letter on each ball is readable (WCAG AA text, 4.5:1)', () => {
    expect(contrast(red.text, red.fill)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(black.text, black.fill)).toBeGreaterThanOrEqual(4.5);
  });
  it('each ball stands out from the card and the paper (non-text, 3:1)', () => {
    for (const fill of [red.fill, black.fill]) {
      expect(contrast(fill, theme.color.card)).toBeGreaterThanOrEqual(3);
      expect(contrast(fill, theme.color.paper)).toBeGreaterThanOrEqual(3);
    }
  });
  it('the red ball is not the error / wrong-answer red', () => {
    // The reds that mark an error or a wrong answer: clearly another hue.
    const errorReds = [
      theme.color.error.ink,
      theme.color.error.noteText,
      theme.feedback.danger.text,
    ];
    for (const e of errorReds) {
      expect(hueDistance(red.fill, e)).toBeGreaterThanOrEqual(20);
    }
    // Other reds of the palette (unused critical600, data series5): not reused.
    expect([...errorReds, palette.critical600, palette.series5]).not.toContain(
      red.fill,
    );
  });
  it('measured ratios (reported in PROGRESS)', () => {
    const r = (a: string, b: string) => Math.round(contrast(a, b) * 100) / 100;
    expect({
      redLetter: r(red.text, red.fill),
      blackLetter: r(black.text, black.fill),
      redOnPaper: r(red.fill, theme.color.paper),
      redHueFromError: hueDistance(red.fill, theme.color.error.ink),
    }).toMatchInlineSnapshot(`
      {
        "blackLetter": 15.36,
        "redHueFromError": 26,
        "redLetter": 6.53,
        "redOnPaper": 5.98,
      }
    `);
  });
});

describe('coloured balls: the Urn', () => {
  it('shows the letters, with a spoken colour and number', async () => {
    expect(await mount({ component: 'Urn', props: {} }, TWIN)).toEqual([]);
    expect(screen.getByText('R₁')).toBeOnTheScreen();
    expect(screen.getByText('N₂')).toBeOnTheScreen();
    expect(screen.getByTestId('urn-ball-r1')).toHaveProp(
      'accessibilityLabel',
      'كورة حمراء 1',
    );
    expect(screen.getByTestId('urn-ball-n2')).toHaveProp(
      'accessibilityLabel',
      'كورة كحلة 2',
    );
  });
});

describe('E4: the 60-draw cap', () => {
  it('the exercise urn has more draws than the cap', () => {
    expect(enumerateOutcomes(RN.urn, RN.draw, RN.k).length).toBe(120);
    expect(120).toBeGreaterThan(MAX_OUTCOMES);
  });
  it('Urn in display mode shows the 10 balls (it lists no draws)', async () => {
    expect(resolve({ component: 'Urn', props: {} })).toMatchObject({
      ok: true,
    });
    expect(
      await mount({ component: 'Urn', props: { mode: 'display' } }, RN),
    ).toEqual([]);
    expect(screen.getByTestId('urn-ball-n6')).toBeOnTheScreen();
  });
  it('Urn in display mode still refuses an impossible draw', () => {
    expect(
      resolve({ component: 'Urn', props: { mode: 'display', k: 11 } }),
    ).toMatchObject({ ok: false });
  });
  it('Urn in select mode stays capped', () => {
    expect(
      resolve({ component: 'Urn', props: { mode: 'select' } }),
    ).toMatchObject({ ok: false, detail: expect.stringMatching(/120/) });
  });
  it('OutcomeSpace and LawChart (from the urn) stay capped', () => {
    expect(resolve({ component: 'OutcomeSpace', props: {} })).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/too many outcomes \(120\)/),
    });
    expect(
      resolve({ component: 'LawChart', props: { valueFn: REDS } }),
    ).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/too many outcomes \(120\)/),
    });
  });
});

describe('E3: a LawChart law checked against the engine', () => {
  const rows = (ps: [number, number][]) => ps.map((p, value) => ({ value, p }));
  const REDS_LAW = rows([
    [1, 6],
    [1, 2],
    [3, 10],
    [1, 30],
  ]);
  it('the law of the number of reds (20, 60, 36, 4 of 120) is accepted', () => {
    expect(
      resolve({
        component: 'LawChart',
        props: { law: { rows: REDS_LAW, of: REDS } },
      }),
    ).toMatchObject({ ok: true });
  });
  it('a wrong row is rejected, even when the sum is 1', () => {
    const wrong = rows([
      [1, 6],
      [1, 3],
      [7, 15],
      [1, 30],
    ]);
    expect(
      resolve({
        component: 'LawChart',
        props: { law: { rows: wrong, of: REDS } },
      }),
    ).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/disagrees with the engine/),
    });
  });
  it('a missing or extra value is rejected', () => {
    expect(
      resolve({
        component: 'LawChart',
        props: {
          law: {
            rows: rows([
              [1, 6],
              [5, 6],
            ]),
            of: REDS,
          },
        },
      }),
    ).toMatchObject({ ok: false });
  });
  it('`of` needs the urn', () => {
    expect(
      resolveSpec({
        component: 'LawChart',
        props: { law: { rows: REDS_LAW, of: REDS } },
      }),
    ).toMatchObject({ ok: false, detail: expect.stringMatching(/urn/) });
  });
  it('the chart lists no draws for a checked law (it never enumerates for display)', async () => {
    expect(
      await mount(
        {
          component: 'LawChart',
          props: { law: { rows: REDS_LAW, of: REDS } },
        },
        RN,
      ),
    ).toEqual([]);
    expect(screen.getByTestId('law-chart-t1')).toBeOnTheScreen();
  });
});

function hueDistance(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b)) % 360;
  return Math.min(d, 360 - d);
}
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) {
    return 0;
  }
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
      ? (b - r) / d + 2
      : (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}
