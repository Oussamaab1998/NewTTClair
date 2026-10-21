/**
 * Logic behind the probability components, on the Exercise 2 urn
 * (-1, 0, 0, 1, 2; two balls drawn simultaneously).
 */
import { runSetCall } from '../../engine/calls';
import type { Ball, EventSpec } from '../../engine/probability';
import { resolveSpec } from '../registry';
import {
  ballLabels,
  checkCell,
  checkLaw,
  diagnoseSelection,
  formatFraction,
  frenchDecimal,
  lawRows,
  moments,
  outcomeLabel,
  outcomesOf,
} from './logic';

const balls: Ball[] = [
  { id: 'a', value: -1 },
  { id: 'b', value: 0 },
  { id: 'c', value: 0 },
  { id: 'd', value: 1 },
  { id: 'e', value: 2 },
];
const exp = { balls, draw: 'simultaneous' as const, k: 2 };
const outcomes = outcomesOf(exp);
const X0: EventSpec = { id: 'value_eq', args: { value: 0 } };
const ctx = { valueFn: 'product' as const };
const experiment = { urn: balls, draw: 'simultaneous' as const, k: 2 };

describe('labels', () => {
  it('marks the second ball with the same value (0 and 0′)', () => {
    const labels = ballLabels(balls, true);
    expect([...labels.values()]).toEqual(['−1', '0', '0′', '1', '2']);
    expect(ballLabels(balls, false).get('c')).toBe('0');
  });
  it('writes simultaneous draws as sets and ordered draws as pairs', () => {
    const labels = ballLabels(balls, true);
    const bc = outcomes.find(o => o.id === 'b-c')!;
    expect(outcomeLabel(bc, labels, 'simultaneous')).toBe('{0 ; 0′}');
    expect(outcomeLabel(bc, labels, 'ordered')).toBe('(0 ; 0′)');
  });
  it('formats fractions and decimals the French way', () => {
    expect(formatFraction([-1, 10])).toBe('−1/10');
    expect(frenchDecimal(0.89)).toBe('0,89');
    expect(frenchDecimal(-0.1)).toBe('−0,1');
  });
});

describe('diagnoseSelection (EventPicker)', () => {
  const zeroPairs = ['a-b', 'a-c', 'b-c', 'b-d', 'b-e', 'c-d', 'c-e'];

  it('accepts exactly the 7 draws with X = 0, in any tap order', () => {
    const d = diagnoseSelection([...zeroPairs].reverse(), outcomes, X0, ctx);
    expect(d.isCorrect).toBe(true);
    expect(d.correct).toEqual(zeroPairs);
    expect(d.selected).toEqual(zeroPairs);
    expect(d.fraction).toEqual([7, 10]);
    expect(d.misconceptionHints).toEqual([]);
  });
  it('names the forgotten {0 ; 0′} pair', () => {
    const d = diagnoseSelection(
      zeroPairs.filter(id => id !== 'b-c'),
      outcomes,
      X0,
      ctx,
    );
    expect(d.isCorrect).toBe(false);
    expect(d.missed).toEqual(['b-c']);
    expect(d.extra).toEqual([]);
    expect(d.fraction).toEqual([6, 10]);
    expect(d.misconceptionHints).toEqual(['misses_duplicate_value_pair']);
  });
  it('recognizes the complement and select-all', () => {
    const complement = ['a-d', 'a-e', 'd-e'];
    expect(
      diagnoseSelection(complement, outcomes, X0, ctx).misconceptionHints,
    ).toEqual(['selects_complement']);
    expect(
      diagnoseSelection(
        outcomes.map(o => o.id),
        outcomes,
        X0,
        ctx,
      ).misconceptionHints,
    ).toEqual(['selects_all']);
  });
  it('lists extra ids and ignores unknown ids', () => {
    const d = diagnoseSelection(['a-e', 'a-d', 'zz'], outcomes, {
      id: 'value_eq',
      args: { valueFn: 'product', value: -2 },
    });
    expect(d.selected).toEqual(['a-d', 'a-e']);
    expect(d.correct).toEqual(['a-e']);
    expect(d.extra).toEqual(['a-d']);
    expect(d.missed).toEqual([]);
    expect(d.misconceptionHints).toEqual([]);
  });
});

describe('law (LawBuilder)', () => {
  const rows = lawRows(exp, 'product');

  it('has X in {-2, -1, 0, 2}, with 1, 1, 7 and 1 draws', () => {
    expect(rows.map(r => r.value)).toEqual([-2, -1, 0, 2]);
    expect(rows.map(r => r.outcomeIds.length)).toEqual([1, 1, 7, 1]);
    expect(rows.map(r => r.p)).toEqual([
      [1, 10],
      [1, 10],
      [7, 10],
      [1, 10],
    ]);
    expect(
      runSetCall(
        { fn: 'lawValues', args: { valueFn: 'product' } },
        {
          experiment,
        },
      ),
    ).toEqual({ ok: true, value: [-2, -1, 0, 2] });
  });
  it('accepts equivalent forms in a cell and rejects non-numbers', () => {
    expect(checkCell('0,7', [7, 10])).toEqual({
      ok: true,
      value: [7, 10],
      correct: true,
    });
    expect(checkCell('14/20', [7, 10])).toMatchObject({ correct: true });
    expect(checkCell('3/10', [7, 10])).toMatchObject({ correct: false });
    expect(checkCell('7/', [7, 10])).toEqual({ ok: false, reason: 'syntax' });
  });
  it('checks the sum: 1 when complete and right, not 1 when a cell is wrong', () => {
    const right = {
      '-2': [1, 10],
      '-1': [1, 10],
      '0': [7, 10],
      '2': [1, 10],
    } as const;
    const ok = checkLaw(rows, right);
    expect(ok).toMatchObject({
      complete: true,
      sumIsOne: true,
      sum: [1, 1],
      correctCells: [-2, -1, 0, 2],
      wrongCells: [],
    });
    const wrong = checkLaw(rows, { ...right, '0': [6, 10] });
    expect(wrong).toMatchObject({
      complete: true,
      sumIsOne: false,
      sum: [9, 10],
      wrongCells: [0],
    });
    expect(checkLaw(rows, { '0': [7, 10] })).toMatchObject({
      complete: false,
      sum: [7, 10],
    });
  });
});

describe('moments (LawChart)', () => {
  it('gives E(X) = -1/10, E(X²) = 9/10, V(X) = 89/100 (0,89, not the 8,9 typo)', () => {
    const m = moments(lawRows(exp, 'product'));
    expect(m.E.value).toEqual([-1, 10]);
    expect(m.E2.value).toEqual([9, 10]);
    expect(m.V.value).toEqual([89, 100]);
    expect(frenchDecimal(m.V.decimal)).toBe('0,89');
    expect(m.E.expanded).toBe(
      '(-2) \\times \\frac{1}{10} + (-1) \\times \\frac{1}{10} + 0 \\times \\frac{7}{10} + 2 \\times \\frac{1}{10}',
    );
    expect(m.V.expanded).toBe(
      '\\frac{9}{10} - \\left(-\\frac{1}{10}\\right)^2',
    );
  });
});

describe('registry specs', () => {
  it('fills balls/draw/k from the experiment, so required props are enough', () => {
    const r = resolveSpec(
      {
        component: 'EventPicker',
        props: {
          valueFn: 'product',
          event: { id: 'value_eq', args: { value: 0 } },
        },
      },
      experiment,
    );
    expect(r.ok).toBe(true);
    expect(r.ok && r.props).toMatchObject({
      balls,
      k: 2,
      reveal: 'on_submit',
      showFraction: true,
    });
  });
  it('accepts every component with only its required props', () => {
    const minimal = {
      Urn: {},
      OutcomeSpace: {},
      EventPicker: { event: { id: 'all_equal' } },
      ComplementView: { event: { id: 'any_value', args: { value: 0 } } },
      LawBuilder: { valueFn: 'product' },
      LawChart: { valueFn: 'product' },
    } as const;
    for (const [component, props] of Object.entries(minimal)) {
      const r = resolveSpec(
        { component: component as keyof typeof minimal, props },
        experiment,
      );
      expect([component, r.ok]).toEqual([component, true]);
    }
  });
  it('rejects unknown components, unknown props and engine-inconsistent values', () => {
    expect(
      resolveSpec({ component: 'BinomialExplorer', props: {} }, experiment),
    ).toMatchObject({ ok: false, reason: 'unknown_component' });
    expect(
      resolveSpec({ component: 'Urn', props: { colour: 'red' } }, experiment),
    ).toMatchObject({ ok: false, reason: 'invalid_props' });
    // value_eq without a valueFn anywhere.
    expect(
      resolveSpec(
        { component: 'EventPicker', props: { event: X0 } },
        experiment,
      ),
    ).toMatchObject({ ok: false, reason: 'invalid_props' });
    // Prefilled p(X = 0) = 6/10 disagrees with the engine (7/10).
    expect(
      resolveSpec(
        {
          component: 'LawBuilder',
          props: { valueFn: 'product', prefilled: { '0': [6, 10] } },
        },
        experiment,
      ),
    ).toMatchObject({ ok: false, reason: 'invalid_props' });
    expect(
      resolveSpec(
        {
          component: 'LawBuilder',
          props: { valueFn: 'product', prefilled: { '0': [7, 10] } },
        },
        experiment,
      ).ok,
    ).toBe(true);
    // No experiment and no balls.
    expect(resolveSpec({ component: 'Urn', props: {} }).ok).toBe(false);
    // A given law must sum to 1.
    expect(
      resolveSpec({
        component: 'LawChart',
        props: { law: { rows: [{ value: 1, p: [1, 2] }] } },
      }).ok,
    ).toBe(false);
    expect(
      resolveSpec({
        component: 'LawChart',
        props: {
          law: {
            rows: [
              { value: 0, p: [1, 2] },
              { value: 1, p: [1, 2] },
            ],
          },
        },
      }).ok,
    ).toBe(true);
  });
  it('refuses experiments with too many outcomes to show', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `b${i}`,
      value: i,
    }));
    expect(
      resolveSpec({
        component: 'OutcomeSpace',
        props: { balls: many, draw: 'simultaneous', k: 3 },
      }),
    ).toMatchObject({ ok: false, reason: 'invalid_props' });
  });
});
