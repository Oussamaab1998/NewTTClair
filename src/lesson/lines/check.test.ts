import { checkLine, type LinesSpec } from './check';
import { evalFn } from '../../engine/analysis';

/** A1: from f(-x) as substituted to f(x). */
const a1: LinesSpec = {
  variables: ['x'],
  start: '(e^(-x))/(1+e^(-2x))',
  goal: '(e^x)/(1+e^(2x))',
  knownWrong: [
    {
      expr: '0/(e^(-x)+e^x)',
      misconceptionId: 'cancel_leaves_zero',
      meant: '1/(e^(-x)+e^x)',
    },
  ],
};

describe('checkLine', () => {
  it('accepts a line equivalent to the start; not final yet', () => {
    const v = checkLine(a1, [], '((e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x)))');
    expect(v).toMatchObject({ kind: 'accepted', final: false, jumped: false });
  });
  it('compares with the previous accepted line, and ends on the goal form', () => {
    const v = checkLine(a1, ['(e^(x))/(e^(2x)+1)'], '((e^(x))/(1+e^(2x)))');
    expect(v).toMatchObject({ kind: 'accepted', final: true, jumped: false });
  });
  it('a first line already in the goal form is accepted but flagged jumped_to_goal', () => {
    const v = checkLine(a1, [], '((e^(x))/(e^(2x)+1))');
    expect(v).toMatchObject({ kind: 'accepted', final: true, jumped: true });
  });
  it('names the denominator and gives the values at x = 1 (the student own line)', () => {
    const v = checkLine(a1, [], '((e^(x))/(e^(2x)+2))');
    expect(v).toMatchObject({ kind: 'wrong', where: 'denominator' });
    if (v.kind !== 'wrong') throw new Error();
    expect(v.at!.x).toBe(1);
    expect(v.at!.student).toBeCloseTo(Math.E / (Math.E ** 2 + 2), 12);
    expect(v.at!.expected).toBeCloseTo(evalFn('f_ex4', 1), 12);
  });
  it('maps a known wrong line to its misconception (cancel leaves 0)', () => {
    const v = checkLine(a1, [], '((0)/(e^(-x)+e^(x)))');
    expect(v).toMatchObject({
      kind: 'wrong',
      misconceptionId: 'cancel_leaves_zero',
      where: 'numerator',
    });
  });
  it('detects a missing denominator group (a/1 + b for a/(1 + b))', () => {
    const v = checkLine(a1, [], '((e^(-x))/(1))+e^(-2x)');
    expect(v).toMatchObject({
      kind: 'wrong',
      misconceptionId: 'missing_parentheses_fraction',
      parentheses: 'denominator',
    });
  });
  it("with no start (f'), every line is compared with the goal", () => {
    const d: LinesSpec = {
      variables: ['x'],
      goal: '((1-e^(2x))e^x)/((1+e^(2x))^2)',
      knownWrong: [],
    };
    const quotient = '((e^(x)(1+e^(2x))-e^(x)*2e^(2x))/((1+e^(2x))^(2)))';
    expect(checkLine(d, [], quotient)).toMatchObject({
      kind: 'accepted',
      final: false,
    });
    // Forgot the chain rule factor 2: wrong in the numerator.
    const noChain = '((e^(x)(1+e^(2x))-e^(x)*e^(2x))/((1+e^(2x))^(2)))';
    expect(checkLine(d, [quotient], noChain)).toMatchObject({
      kind: 'wrong',
      where: 'numerator',
    });
  });
  it('reports unparsable input with its code, never evaluates it', () => {
    // Not an editor line (the editor always writes ^(...)): the parser decides.
    expect(checkLine(a1, [], 'e^x+')).toMatchObject({
      kind: 'parse_error',
      code: 'missing_operand',
    });
  });
  it('an unreadable editor line is named and located, never graded', () => {
    expect(checkLine(a1, [], '1+')).toEqual({
      kind: 'unreadable',
      issue: { kind: 'operator_at_end', path: [], index: 1 },
    });
    // The parser would read "x++1"; on paper it needs parentheses.
    expect(checkLine(a1, [], 'x++1')).toMatchObject({
      kind: 'unreadable',
      issue: { kind: 'double_operator' },
    });
  });
  it('a line written exactly like the previous one (an unedited copy) is "unchanged", not an answer', () => {
    expect(checkLine(a1, [], '((e^(-x))/(1+e^(-2x)))')).toEqual({
      kind: 'unchanged',
    });
    const line = '((e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x)))';
    expect(checkLine(a1, [line], line)).toEqual({ kind: 'unchanged' });
    // With no start and no line yet, a line in the goal form is the answer.
    const noStart = { ...a1, start: undefined } as unknown as LinesSpec;
    expect(checkLine(noStart, [], '((e^(x))/(1+e^(2x)))').kind).toBe(
      'accepted',
    );
  });
});
