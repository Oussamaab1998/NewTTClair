import { equalsLatex, numberLatex, numericTwin } from './logic';
import {
  NumericTwinPropsSchema,
  PredictRevealPropsSchema,
  StepThroughPropsSchema,
} from './schemas';

describe('numberLatex', () => {
  it('writes small fractions exactly and approximates the rest', () => {
    expect(numberLatex(1 / 3)).toEqual({ latex: '\\frac{1}{3}', exact: true });
    expect(numberLatex(5)).toEqual({ latex: '5', exact: true });
    expect(numberLatex(Math.E)).toEqual({
      latex: '\\approx 2{,}7183',
      exact: false,
    });
  });});

describe('equalsLatex', () => {
  it('writes "=" for exact values and only "≈" otherwise (no "= ≈")', () => {
    expect(equalsLatex(1 / 3)).toBe('=\\frac{1}{3}');
    expect(equalsLatex(Math.E)).toBe('\\approx 2{,}7183');
  });
});

describe('numericTwin (cancel leaves 1, not 0)', () => {
  const twin = numericTwin('u', 'u/(u*3)', '1/3');
  it('computes both sides with the student-chosen value', () => {
    const r = twin.row(5);
    expect(r.template).toBeCloseTo(1 / 3, 14);
    expect(r.equal).toBe(true);
  });
  it('shows a difference when the forms disagree', () => {
    const wrong = numericTwin('u', 'u/(u*3)', '0/3');
    expect(wrong.row(5).equal).toBe(false);
  });
  it('gives LaTeX for both expressions', () => {
    expect(twin.templateLatex).toBe('\\frac{u}{u\\times 3}');
    expect(twin.compareLatex).toBe('\\frac{1}{3}');
  });
});

describe('primitive schemas', () => {
  it('NumericTwin rejects code, reserved letters and undefined values', () => {
    const base = { symbol: 'u', template: 'u/(u+1)', values: [1, 2] };
    expect(NumericTwinPropsSchema.safeParse(base).success).toBe(true);
    expect(
      NumericTwinPropsSchema.safeParse({ ...base, template: 'alert(1)' })
        .success,
    ).toBe(false);
    expect(
      NumericTwinPropsSchema.safeParse({ ...base, symbol: 'e' }).success,
    ).toBe(false);
    expect(
      NumericTwinPropsSchema.safeParse({ ...base, values: [-1] }).success,
    ).toBe(false);
  });
  it('PredictReveal refuses nested containers and duplicate options', () => {
    const opt = (id: string) => ({ id, label: { fr: id } });
    const ok = {
      prompt: { fr: 'f(-x) ?' },
      options: [opt('a'), opt('b')],
      reveal: { component: 'StepThrough', props: {} },
    };
    expect(PredictRevealPropsSchema.safeParse(ok).success).toBe(true);
    expect(
      PredictRevealPropsSchema.safeParse({
        ...ok,
        reveal: { component: 'CompareTwo', props: {} },
      }).success,
    ).toBe(false);
    expect(
      PredictRevealPropsSchema.safeParse({
        ...ok,
        options: [opt('a'), opt('a')],
      }).success,
    ).toBe(false);
  });
  it('StepThrough needs text or math per step, and renderable math', () => {
    expect(
      StepThroughPropsSchema.safeParse({ steps: [{ math: 'e^{x}' }] }).success,
    ).toBe(true);
    expect(
      StepThroughPropsSchema.safeParse({ steps: [{ why: { fr: 'x' } }] })
        .success,
    ).toBe(false);
    expect(
      StepThroughPropsSchema.safeParse({ steps: [{ math: '\\frac{1}' }] })
        .success,
    ).toBe(false);
  });
});
