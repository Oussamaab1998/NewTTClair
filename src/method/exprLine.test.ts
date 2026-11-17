/**
 * Lines with a letter on the board (src/method/exprLine.ts): f(−x) rewritten
 * down to f(x) (ex4 A1), a derivative down to its « Montrer que » form (A3a),
 * and P(Y = 1) as a formula in n (ex2 3.a). The engine compares; nothing is
 * evaluated by the language.
 */
import { evaluateLine } from './frame';
import type { Graph, GraphNode } from './graph';
import { exprSides, judgeExprLine, splitLabels, type ExprSpec } from './exprLine';
import { lineLatex } from './lineChain';

const A1: ExprSpec = {
  variable: 'x',
  ref: 'e^(-x)/(1+e^(-2x))',
  goals: ['e^x/(1+e^(2x))'],
  goalNames: ['f(x)'],
  knownWrong: [{ expr: 'e^(-x)/(1-e^(2x))', id: 'exp_neg_sign' }],
};
const A3: ExprSpec = {
  variable: 'x',
  ref: '(1-e^(2x))e^x/(1+e^(2x))^2',
  goals: ['(1-e^(2x))e^x/(1+e^(2x))^2'],
  knownWrong: [{ expr: '(1-e^(2x))e^x/(1+e^(2x))', id: 'den_not_squared' }],
};
const Q3: ExprSpec = {
  variable: 'n',
  ref: 'n*7/10*(3/10)^(n-1)',
  goals: [],
  knownWrong: [{ expr: '7/10*(3/10)^(n-1)', id: 'forgets_count' }],
};

describe('a line with x: each side equal to the one before, the goal form finishes', () => {
  it('his first line is the question written out, with or without its label', () => {
    for (const raw of ['f(-x)=e^(-x)/(1+e^(-2x))', 'e^(-x)/(1+e^(-2x))']) {
      expect(judgeExprLine(A1, [], raw)).toEqual({
        kind: 'accepted',
        final: false,
        jumped: false,
      });
    }
  });

  it('a step on the way, then the goal form or the goal by name', () => {
    const first = 'e^(-x)/(1+e^(-2x))';
    expect(
      judgeExprLine(A1, [first], '(e^(-x)*e^(2x))/((1+e^(-2x))*e^(2x))'),
    ).toMatchObject({ kind: 'accepted', final: false });
    expect(judgeExprLine(A1, [first], 'e^(x)/(e^(2x)+1)')).toMatchObject({
      kind: 'accepted',
      final: true,
    });
    expect(judgeExprLine(A1, [first], 'e^x/(e^(2x)+1)=f(x)')).toMatchObject({
      kind: 'accepted',
      final: true,
    });
  });

  it('a copy of his last line is not a step', () => {
    const first = 'e^(-x)/(1+e^(-2x))';
    expect(judgeExprLine(A1, [first], first)).toEqual({ kind: 'unchanged' });
  });

  it('a wrong line names its slip, or says which part of the fraction differs', () => {
    const first = 'e^(-x)/(1+e^(-2x))';
    expect(judgeExprLine(A1, [first], 'e^(-x)/(1-e^(2x))')).toMatchObject({
      kind: 'wrong',
      slip: 'exp_neg_sign',
    });
    expect(judgeExprLine(A1, [first], 'e^x/(1+e^(-2x))')).toMatchObject({
      kind: 'wrong',
      where: 'numerator',
    });
  });

  it('two sides of his own line that differ: the first "=" that does not hold', () => {
    expect(
      judgeExprLine(A1, [], 'e^(-x)/(1+e^(-2x))=e^x/(2+e^(2x))'),
    ).toEqual({ kind: 'mismatch', at: 0 });
  });

  it('the derivative: the quotient rule, then the given form', () => {
    expect(
      judgeExprLine(A3, [], "f'(x)=(e^x(1+e^(2x))-e^x*2e^(2x))/(1+e^(2x))^2"),
    ).toMatchObject({ kind: 'accepted', final: false });
    expect(
      judgeExprLine(
        A3,
        ['(e^x+e^(3x)-2e^(3x))/(1+e^(2x))^2'],
        '(e^x-e^(3x))/(1+e^(2x))^2=e^x(1-e^(2x))/(1+e^(2x))^2',
      ),
    ).toMatchObject({ kind: 'accepted', final: true });
    // The 2 of e^(2x)'s derivative forgotten.
    expect(
      judgeExprLine(A3, [], '(e^x(1+e^(2x))-e^x*e^(2x))/(1+e^(2x))^2'),
    ).toMatchObject({ kind: 'wrong', where: 'numerator' });
  });
});

describe('a formula in n: compared exactly at n = 2 to 12', () => {
  it('any right formula finishes the step, C(n,1) and decimals included', () => {
    for (const raw of [
      'P(Y=1)=C(n,1)*(7/10)*(3/10)^(n-1)',
      'n*0,7*0,3^(n-1)',
      '7n/10*(3/10)^(n-1)',
    ]) {
      expect(judgeExprLine(Q3, [], raw)).toMatchObject({
        kind: 'accepted',
        final: true,
      });
    }
  });

  it('the count forgotten is its slip; a letter it does not know is unreadable', () => {
    expect(judgeExprLine(Q3, [], '(7/10)*(3/10)^(n-1)')).toEqual({
      kind: 'wrong',
      slip: 'forgets_count',
    });
    expect(judgeExprLine(Q3, [], 'k*7/10')).toEqual({ kind: 'unreadable' });
  });
});

describe('labels', () => {
  it('a leading label keeps its own "="', () => {
    expect(splitLabels('P(Y=1)=n*7/10')).toEqual({
      labels: ['P(Y=1)'],
      body: 'n*7/10',
    });
    expect(exprSides("f'(x) = a = b")).toEqual(['a', 'b']);
    expect(lineLatex('P(Y=1)=7n/10')).toMatch(/^P\(Y=1\) = /);
  });
});

describe('on the board: a card whose node is written with a letter', () => {
  const node: GraphNode = {
    id: 'parity',
    planCard: 'rewrite',
    role: 'result',
    unit: 'ratio',
    value: [0, 1],
    forms: [],
    bareOk: false,
    inputs: [],
    shape: { kind: 'product', of: [] },
    main: true,
    expr: A1,
  };
  const graph: Graph = {
    spec: { reds: 0, blacks: 0, k: 0, j: 0 },
    order: 'unordered',
    nodes: [node],
    cards: ['rewrite'],
    mutate: () => [],
  };
  const run = (raw: string, accepted: string[] = []) =>
    evaluateLine({
      raw,
      graph,
      table: { kept: [], dropped: [] } as never,
      card: 'rewrite',
      credited: new Set(),
      accepted,
    }).outcome;

  it('a step on the way supports, the goal form credits and closes the card', () => {
    expect(run('e^(-x)/(1+e^(-2x))')).toMatchObject({ kind: 'support' });
    expect(run('e^x/(1+e^(2x))', ['e^(-x)/(1+e^(-2x))'])).toMatchObject({
      kind: 'credit',
      completes: true,
    });
  });

  it('a slip is the library slip; another wrong line says where; a number never lands', () => {
    expect(run('e^(-x)/(1-e^(2x))')).toMatchObject({
      kind: 'mutation',
      misconceptionId: 'mut.exp_neg_sign',
    });
    expect(run('e^x/(1+e^(-2x))')).toMatchObject({
      kind: 'expr_wrong',
      where: 'numerator',
    });
    expect(run('0').kind).not.toBe('credit');
  });
});
