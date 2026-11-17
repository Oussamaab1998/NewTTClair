/**
 * The function-analysis templates check their own content with the engine:
 * a wrong parity claim, a rewritten form that is not f, a limit f does not
 * reach, a derivative that is not f', or a top value that is not f(x0) is a
 * build error, never a step a student meets.
 */
import { buildGraphFor } from './templates';
import './library';
import { FUNCTION_TEMPLATE_IDS, negated } from './templatesFunction';

const F = 'e^x/(1+e^(2x))';
const build = (template: string, args: object) =>
  buildGraphFor({ template, args: args as never }, { inputs: {} });

describe('the function templates', () => {
  it('are registered', () => {
    expect(FUNCTION_TEMPLATE_IDS).toEqual([
      'fn_parity',
      'fn_limit',
      'fn_derivative',
      'fn_variation',
      'fn_sketch',
    ]);
  });

  it('write f(−x) as the student does', () => {
    expect(negated('e^x/(1+e^(2x))')).toBe('e^(-x)/(1+e^(2(-x)))');
  });

  it('refuse a parity claim the engine does not confirm', () => {
    expect(() => build('fn_parity', { expr: F, parity: 'even' })).not.toThrow();
    expect(() => build('fn_parity', { expr: F, parity: 'odd' })).toThrow(/f\(-x\)/);
    expect(() =>
      build('fn_parity', { expr: 'e^x/(1+e^x)', parity: 'even' }),
    ).toThrow();
  });

  it('refuse a rewritten form that is not f, or a limit f does not reach', () => {
    const ok = {
      expr: F,
      goals: ['e^(-x)/(e^(-2x)+1)'],
      limit: [0, 1],
      limitForms: ['0/(0+1)'],
    };
    expect(() => build('fn_limit', ok)).not.toThrow();
    expect(() => build('fn_limit', { ...ok, goals: ['e^(-x)/(e^(-x)+1)'] })).toThrow(
      /is not f/,
    );
    expect(() => build('fn_limit', { ...ok, limit: [1, 2] })).toThrow(/tend/);
  });

  it("refuse a derivative that is not f'", () => {
    const ok = {
      expr: F,
      target: '(1-e^(2x))e^x/(1+e^(2x))^2',
      inner: '2e^(2x)',
      innerOf: '1+e^(2x)',
    };
    expect(() => build('fn_derivative', ok)).not.toThrow();
    expect(() =>
      build('fn_derivative', { ...ok, target: 'e^x/(1+e^(2x))^2' }),
    ).toThrow(/not f'/);
    expect(() => build('fn_derivative', { ...ok, inner: 'e^(2x)' })).toThrow();
  });

  it('refuse a top value that is not f at its point', () => {
    const ok = { expr: F, at: 0, top: [1, 2], topForms: ['1/(1+1)'] };
    expect(() => build('fn_variation', ok)).not.toThrow();
    expect(() => build('fn_sketch', { ...ok, top: [1, 1], topForms: ['1'] })).toThrow();
  });
});
